
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  admin_id UUID NOT NULL,
  admin_name TEXT NOT NULL DEFAULT '',
  admin_avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view announcements"
ON public.announcements FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
