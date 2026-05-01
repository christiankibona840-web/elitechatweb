-- Permanent username blacklist table
CREATE TABLE IF NOT EXISTS public.used_usernames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID
);

ALTER TABLE public.used_usernames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage used usernames"
  ON public.used_usernames FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read used usernames"
  ON public.used_usernames FOR SELECT
  TO authenticated
  USING (true);

-- Ensure unique constraint on profiles.username (case-insensitive lower)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON public.profiles (lower(username));

-- Backfill existing usernames into blacklist
INSERT INTO public.used_usernames (username)
SELECT DISTINCT lower(username) FROM public.profiles
WHERE username IS NOT NULL
ON CONFLICT (username) DO NOTHING;

-- Trigger: any new/changed username auto-logged into used_usernames forever
CREATE OR REPLACE FUNCTION public.log_username_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    INSERT INTO public.used_usernames (username, assigned_by)
    VALUES (lower(NEW.username), auth.uid())
    ON CONFLICT (username) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_log_username_assignment ON public.profiles;
CREATE TRIGGER profiles_log_username_assignment
AFTER INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_username_assignment();

-- Admin RPC: assign/change username with full validation + blacklist enforcement
CREATE OR REPLACE FUNCTION public.admin_assign_username(_target_user_id UUID, _new_username TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_clean TEXT;
  v_current TEXT;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_clean := lower(trim(_new_username));

  IF v_clean !~ '^[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Invalid format: 3-20 chars, lowercase letters/numbers/underscore only';
  END IF;
  IF v_clean LIKE '\_%' ESCAPE '\' OR v_clean LIKE '%\_' ESCAPE '\' THEN
    RAISE EXCEPTION 'Cannot start or end with underscore';
  END IF;
  IF v_clean LIKE '%__%' THEN
    RAISE EXCEPTION 'Cannot contain consecutive underscores';
  END IF;

  SELECT lower(username) INTO v_current FROM public.profiles WHERE id = _target_user_id;
  IF v_current = v_clean THEN
    RETURN; -- no change
  END IF;

  -- Blacklist check (any past username, even if user deleted)
  IF EXISTS (SELECT 1 FROM public.used_usernames WHERE username = v_clean) THEN
    RAISE EXCEPTION 'This ID is permanently reserved and cannot be reused';
  END IF;

  -- Live profile check
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = v_clean AND id <> _target_user_id) THEN
    RAISE EXCEPTION 'This ID is already taken';
  END IF;

  UPDATE public.profiles SET username = v_clean WHERE id = _target_user_id;
  -- Trigger handles used_usernames insert
END;
$$;