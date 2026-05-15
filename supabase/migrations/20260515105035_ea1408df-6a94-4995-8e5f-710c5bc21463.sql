
CREATE TABLE public.status_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(status_id, user_id)
);
ALTER TABLE public.status_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views likes" ON public.status_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users like" ON public.status_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike" ON public.status_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.status_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.status_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or commenter can view"
ON public.status_comments FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = (SELECT user_id FROM public.statuses WHERE id = status_id)
);
CREATE POLICY "Authenticated can comment"
ON public.status_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Commenter can delete"
ON public.status_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_status_likes_status ON public.status_likes(status_id);
CREATE INDEX idx_status_comments_status ON public.status_comments(status_id);
CREATE INDEX idx_status_views_status ON public.status_views(status_id);
