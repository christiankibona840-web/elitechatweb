-- Create reels table
CREATE TABLE IF NOT EXISTS public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  added_by UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname='All authenticated can view reels') THEN
    CREATE POLICY "All authenticated can view reels"
      ON public.reels FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname='Admins or reel managers can insert reels') THEN
    CREATE POLICY "Admins or reel managers can insert reels"
      ON public.reels FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'reel_manager'::public.app_role));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname='Admins or reel managers can update reels') THEN
    CREATE POLICY "Admins or reel managers can update reels"
      ON public.reels FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'reel_manager'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'reel_manager'::public.app_role));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reels' AND policyname='Admins or reel managers can delete reels') THEN
    CREATE POLICY "Admins or reel managers can delete reels"
      ON public.reels FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'reel_manager'::public.app_role));
  END IF;
END $$;

-- Update signup trigger to also assign reel_manager to dercdemot@gmail.com
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'kibona@gmail.com' OR NEW.email = 'respect.chf@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.email = 'dercdemot@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'reel_manager')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Grant role now if user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'reel_manager'::public.app_role FROM auth.users WHERE email = 'dercdemot@gmail.com'
ON CONFLICT DO NOTHING;

-- Seed initial reels
INSERT INTO public.reels (url, added_by, position)
SELECT gs.url, u.id, gs.pos
FROM auth.users u
CROSS JOIN (VALUES
  (1, 'https://www.instagram.com/reel/DXTyI4NMVUG/'),
  (2, 'https://www.instagram.com/reel/DXSPrxFNrhz/'),
  (3, 'https://www.instagram.com/reel/DXTqkSPDEHA/')
) AS gs(pos, url)
WHERE u.email = 'respect.chf@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.reels);
