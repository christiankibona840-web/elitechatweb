-- Update signup trigger: swap brianshamb113 for bcmetrynx
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('kibona@gmail.com', 'respect.chf@gmail.com', 'bcmetrynx@gmail.com', 'jsonsmarty@gmail.com') THEN
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

-- Revoke admin from brianshamb113@gmail.com
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (SELECT id FROM auth.users WHERE email = 'brianshamb113@gmail.com');

-- Grant admin to bcmetrynx@gmail.com if they already exist
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'bcmetrynx@gmail.com'
ON CONFLICT DO NOTHING;