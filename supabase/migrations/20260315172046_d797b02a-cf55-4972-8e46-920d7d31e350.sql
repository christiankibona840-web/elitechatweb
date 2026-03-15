
-- Update admin trigger for new admin email
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
  RETURN NEW;
END;
$function$;

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Admin can see all blocks
CREATE POLICY "Admins see all blocks" ON public.blocked_users
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can block users
CREATE POLICY "Admins can block users" ON public.blocked_users
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can unblock users
CREATE POLICY "Admins can unblock users" ON public.blocked_users
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can see if they are blocked
CREATE POLICY "Users see own blocks" ON public.blocked_users
  FOR SELECT TO authenticated
  USING (blocked_id = auth.uid());
