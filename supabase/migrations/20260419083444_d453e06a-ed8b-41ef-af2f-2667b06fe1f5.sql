-- 1. Create the default group "Yst Tbss & Tgss" if it doesn't exist
DO $$
DECLARE
  v_group_id UUID;
  v_admin_id UUID;
BEGIN
  -- Try to find an existing admin to be the creator
  SELECT user_id INTO v_admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  
  -- If no admin exists yet, use the first profile (will be backfilled later)
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;
  
  -- Only create if there's at least one user and the group doesn't already exist
  IF v_admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.groups WHERE name = 'Yst Tbss & Tgss') THEN
    INSERT INTO public.groups (name, description, created_by)
    VALUES ('Yst Tbss & Tgss', 'Official community group — everyone is automatically a member.', v_admin_id)
    RETURNING id INTO v_group_id;
    
    -- Add ALL existing users as members
    INSERT INTO public.group_members (group_id, user_id, role)
    SELECT v_group_id, p.id,
      CASE WHEN p.id = v_admin_id THEN 'admin' ELSE 'member' END
    FROM public.profiles p
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 2. Trigger: auto-add every new profile to the default group
CREATE OR REPLACE FUNCTION public.auto_join_default_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_group_id UUID;
BEGIN
  SELECT id INTO v_default_group_id FROM public.groups WHERE name = 'Yst Tbss & Tgss' LIMIT 1;
  IF v_default_group_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_default_group_id, NEW.id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_join_default_group_trigger ON public.profiles;
CREATE TRIGGER auto_join_default_group_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_join_default_group();

-- 3. Helper: identifies the default group (used by client to hide leave button)
CREATE OR REPLACE FUNCTION public.is_default_group(_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = _group_id AND name = 'Yst Tbss & Tgss');
$$;

-- 4. Prevent leaving the default group (block DELETE on group_members for default group)
CREATE OR REPLACE FUNCTION public.prevent_leave_default_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_default_group(OLD.group_id) THEN
    RAISE EXCEPTION 'Cannot leave the default community group';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_leave_default_group_trigger ON public.group_members;
CREATE TRIGGER prevent_leave_default_group_trigger
BEFORE DELETE ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_leave_default_group();