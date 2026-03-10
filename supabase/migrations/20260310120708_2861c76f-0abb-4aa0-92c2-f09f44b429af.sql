
-- Projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  media_url text,
  media_type text, -- 'image', 'video', 'audio', 'text'
  file_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users create own projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own projects" ON public.projects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own projects" ON public.projects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Project comments table
CREATE TABLE public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comments" ON public.project_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users create own comments" ON public.project_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own comments" ON public.project_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add UPDATE policy for group_members so admins can promote to vice-admin
CREATE POLICY "Admins can update member roles" ON public.group_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- Enable realtime for projects and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
