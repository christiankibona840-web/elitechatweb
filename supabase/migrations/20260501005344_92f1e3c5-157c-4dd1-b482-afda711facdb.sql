
DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);

-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.approved_id_status AS ENUM ('available', 'claimed', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. approved_ids table
CREATE TABLE IF NOT EXISTS public.approved_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL UNIQUE,
  status public.approved_id_status NOT NULL DEFAULT 'available',
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT member_id_format CHECK (member_id ~ '^#\d{3}-\d{3}$')
);
CREATE INDEX IF NOT EXISTS approved_ids_status_idx ON public.approved_ids(status);
CREATE INDEX IF NOT EXISTS approved_ids_claimed_by_idx ON public.approved_ids(claimed_by_user_id);
ALTER TABLE public.approved_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can check approved IDs" ON public.approved_ids;
CREATE POLICY "Public can check approved IDs" ON public.approved_ids FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage approved IDs - insert" ON public.approved_ids;
CREATE POLICY "Admins manage approved IDs - insert" ON public.approved_ids FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage approved IDs - update" ON public.approved_ids;
CREATE POLICY "Admins manage approved IDs - update" ON public.approved_ids FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage approved IDs - delete" ON public.approved_ids;
CREATE POLICY "Admins manage approved IDs - delete" ON public.approved_ids FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS approved_ids_updated_at ON public.approved_ids;
CREATE TRIGGER approved_ids_updated_at BEFORE UPDATE ON public.approved_ids FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_id_code TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_performed_at_idx ON public.admin_audit_log(performed_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Profile / group columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS ownerless BOOLEAN NOT NULL DEFAULT false;

-- 5. Public ID checker
CREATE OR REPLACE FUNCTION public.check_member_id(_member_id TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status TEXT;
BEGIN
  IF _member_id !~ '^#\d{3}-\d{3}$' THEN RETURN 'invalid_format'; END IF;
  SELECT status::TEXT INTO v_status FROM public.approved_ids WHERE member_id = _member_id;
  IF v_status IS NULL THEN RETURN 'not_found'; END IF;
  RETURN v_status;
END; $$;
GRANT EXECUTE ON FUNCTION public.check_member_id(TEXT) TO anon, authenticated;

-- 6. Updated handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_id TEXT; v_status public.approved_id_status;
BEGIN
  v_member_id := NEW.raw_user_meta_data->>'member_id';
  IF v_member_id IS NOT NULL AND v_member_id <> '' THEN
    SELECT status INTO v_status FROM public.approved_ids WHERE member_id = v_member_id FOR UPDATE;
    IF v_status IS NULL THEN RAISE EXCEPTION 'This ID is not recognized. Please contact your administrator.'; END IF;
    IF v_status = 'claimed' THEN RAISE EXCEPTION 'This ID is already in use. Please contact your administrator.'; END IF;
    IF v_status = 'disabled' THEN RAISE EXCEPTION 'This ID has been disabled. Please contact your administrator.'; END IF;
    UPDATE public.approved_ids SET status = 'claimed', claimed_by_user_id = NEW.id, claimed_at = now() WHERE member_id = v_member_id;
  END IF;
  INSERT INTO public.profiles (id, username, display_name, member_id)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_member_id);
  RETURN NEW;
END; $$;

-- 7. Force delete
CREATE OR REPLACE FUNCTION public.admin_force_delete_user(_target_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_id TEXT; g RECORD; v_next_owner UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

  FOR g IN SELECT id FROM public.groups WHERE created_by = _target_user_id LOOP
    SELECT user_id INTO v_next_owner FROM public.group_members
      WHERE group_id = g.id AND user_id <> _target_user_id ORDER BY joined_at ASC LIMIT 1;
    IF v_next_owner IS NOT NULL THEN
      UPDATE public.groups SET created_by = v_next_owner WHERE id = g.id;
      UPDATE public.group_members SET role = 'admin' WHERE group_id = g.id AND user_id = v_next_owner;
    ELSE
      UPDATE public.groups SET ownerless = true WHERE id = g.id;
    END IF;
  END LOOP;

  ALTER TABLE public.group_members DISABLE TRIGGER USER;
  DELETE FROM public.group_members WHERE user_id = _target_user_id;
  ALTER TABLE public.group_members ENABLE TRIGGER USER;

  DELETE FROM public.message_reactions WHERE user_id = _target_user_id;
  DELETE FROM public.starred_messages WHERE user_id = _target_user_id;
  DELETE FROM public.status_views WHERE viewer_id = _target_user_id;
  DELETE FROM public.statuses WHERE user_id = _target_user_id;
  DELETE FROM public.project_comments WHERE user_id = _target_user_id;
  DELETE FROM public.projects WHERE user_id = _target_user_id;
  DELETE FROM public.contacts WHERE user_id = _target_user_id OR contact_id = _target_user_id;
  DELETE FROM public.blocked_users WHERE blocker_id = _target_user_id OR blocked_id = _target_user_id;
  DELETE FROM public.disappearing_settings WHERE user_id = _target_user_id;
  DELETE FROM public.messages WHERE sender_id = _target_user_id OR receiver_id = _target_user_id;
  DELETE FROM public.group_messages WHERE sender_id = _target_user_id;
  DELETE FROM public.game_invites WHERE from_user = _target_user_id OR to_user = _target_user_id;
  DELETE FROM public.games WHERE player_x = _target_user_id OR player_o = _target_user_id;
  DELETE FROM public.c4_games WHERE player_red = _target_user_id OR player_yellow = _target_user_id;
  DELETE FROM public.announcements WHERE admin_id = _target_user_id;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;

  SELECT member_id INTO v_member_id FROM public.profiles WHERE id = _target_user_id;
  IF v_member_id IS NOT NULL THEN
    UPDATE public.approved_ids SET status = 'disabled', claimed_by_user_id = NULL WHERE member_id = v_member_id;
  END IF;

  DELETE FROM public.profiles WHERE id = _target_user_id;
  DELETE FROM auth.users WHERE id = _target_user_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, target_id_code, details)
  VALUES (auth.uid(), 'force_delete_user', _target_user_id, v_member_id, jsonb_build_object('member_id', v_member_id));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.admin_force_delete_user(_target_user_id); END; $$;

-- 8. Remove from group
CREATE OR REPLACE FUNCTION public.admin_remove_from_group(_target_user_id UUID, _group_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator UUID; v_next_owner UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT created_by INTO v_creator FROM public.groups WHERE id = _group_id;
  IF v_creator = _target_user_id THEN
    SELECT user_id INTO v_next_owner FROM public.group_members
      WHERE group_id = _group_id AND user_id <> _target_user_id ORDER BY joined_at ASC LIMIT 1;
    IF v_next_owner IS NOT NULL THEN
      UPDATE public.groups SET created_by = v_next_owner WHERE id = _group_id;
      UPDATE public.group_members SET role = 'admin' WHERE group_id = _group_id AND user_id = v_next_owner;
    ELSE
      UPDATE public.groups SET ownerless = true WHERE id = _group_id;
    END IF;
  END IF;
  ALTER TABLE public.group_members DISABLE TRIGGER USER;
  DELETE FROM public.group_members WHERE group_id = _group_id AND user_id = _target_user_id;
  ALTER TABLE public.group_members ENABLE TRIGGER USER;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'remove_from_group', _target_user_id, jsonb_build_object('group_id', _group_id));
END; $$;

-- 9. Listing helpers
CREATE OR REPLACE FUNCTION public.admin_list_user_groups(_target_user_id UUID)
RETURNS TABLE(group_id UUID, name TEXT, member_count BIGINT, role TEXT, is_owner BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT g.id, g.name,
    (SELECT COUNT(*) FROM public.group_members gm2 WHERE gm2.group_id = g.id),
    gm.role, (g.created_by = _target_user_id)
  FROM public.groups g JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = _target_user_id ORDER BY g.name;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_all_groups()
RETURNS TABLE(id UUID, name TEXT, description TEXT, avatar_url TEXT, created_at TIMESTAMPTZ, created_by UUID, owner_username TEXT, member_count BIGINT, ownerless BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT g.id, g.name, g.description, g.avatar_url, g.created_at, g.created_by,
    p.username, (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id), g.ownerless
  FROM public.groups g LEFT JOIN public.profiles p ON p.id = g.created_by
  ORDER BY g.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_group_members(_group_id UUID)
RETURNS TABLE(user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, role TEXT, joined_at TIMESTAMPTZ, is_owner BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT created_by INTO v_creator FROM public.groups WHERE id = _group_id;
  RETURN QUERY
  SELECT gm.user_id, p.username, p.display_name, p.avatar_url, gm.role, gm.joined_at, (gm.user_id = v_creator)
  FROM public.group_members gm JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = _group_id ORDER BY gm.joined_at ASC;
END; $$;

-- 10. Updated admin_list_users (with member_id, disabled, community_count)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id UUID, email TEXT, display_name TEXT, username TEXT, avatar_url TEXT, created_at TIMESTAMPTZ, is_online BOOLEAN, last_seen TIMESTAMPTZ, member_id TEXT, disabled BOOLEAN, community_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT p.id, u.email::TEXT, p.display_name, p.username, p.avatar_url, p.created_at, p.is_online, p.last_seen,
    p.member_id, p.disabled,
    (SELECT COUNT(*) FROM public.group_members gm WHERE gm.user_id = p.id)
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END; $$;

-- 11. Bulk add IDs
CREATE OR REPLACE FUNCTION public.admin_add_approved_ids(_member_ids TEXT[])
RETURNS TABLE(member_id TEXT, success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id TEXT; v_clean TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  FOREACH v_id IN ARRAY _member_ids LOOP
    v_clean := upper(trim(v_id));
    IF v_clean !~ '^#\d{3}-\d{3}$' THEN
      member_id := v_clean; success := false; message := 'Invalid format'; RETURN NEXT;
      CONTINUE;
    END IF;
    BEGIN
      INSERT INTO public.approved_ids (member_id, created_by) VALUES (v_clean, auth.uid());
      member_id := v_clean; success := true; message := 'Added'; RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      member_id := v_clean; success := false; message := 'Already exists'; RETURN NEXT;
    END;
  END LOOP;
  INSERT INTO public.admin_audit_log (admin_user_id, action, details)
  VALUES (auth.uid(), 'add_approved_ids', jsonb_build_object('count', array_length(_member_ids, 1)));
END; $$;

-- 12. Generate sequential
CREATE OR REPLACE FUNCTION public.admin_generate_approved_ids(_prefix TEXT, _start INT, _count INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i INT; v_id TEXT; v_added INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _prefix !~ '^#\d{3}-$' THEN RAISE EXCEPTION 'Invalid prefix. Use format #180- or #360-'; END IF;
  IF _count < 1 OR _count > 1000 THEN RAISE EXCEPTION 'Count must be 1-1000'; END IF;
  FOR i IN _start.._start + _count - 1 LOOP
    v_id := _prefix || lpad(i::TEXT, 3, '0');
    BEGIN
      INSERT INTO public.approved_ids (member_id, created_by) VALUES (v_id, auth.uid());
      v_added := v_added + 1;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
  INSERT INTO public.admin_audit_log (admin_user_id, action, details)
  VALUES (auth.uid(), 'generate_approved_ids', jsonb_build_object('prefix', _prefix, 'start', _start, 'count', _count, 'added', v_added));
  RETURN v_added;
END; $$;

-- 13. Set status
CREATE OR REPLACE FUNCTION public.admin_set_approved_id_status(_member_id TEXT, _status public.approved_id_status)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.approved_ids SET status = _status WHERE member_id = _member_id
  RETURNING claimed_by_user_id INTO v_user;
  IF _status = 'disabled' AND v_user IS NOT NULL THEN
    UPDATE public.profiles SET disabled = true WHERE id = v_user;
  END IF;
  IF _status = 'available' AND v_user IS NOT NULL THEN
    UPDATE public.profiles SET disabled = false WHERE id = v_user;
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_id_code, details)
  VALUES (auth.uid(), 'set_approved_id_status', _member_id, jsonb_build_object('status', _status));
END; $$;
