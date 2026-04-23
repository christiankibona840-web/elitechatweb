-- Update signup trigger to include the two new admin emails
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('kibona@gmail.com', 'respect.chf@gmail.com', 'brianshamb113@gmail.com', 'jsonsmarty@gmail.com') THEN
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

-- Grant admin role to existing users with those emails (if they already signed up)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email IN ('brianshamb113@gmail.com', 'jsonsmarty@gmail.com')
ON CONFLICT DO NOTHING;