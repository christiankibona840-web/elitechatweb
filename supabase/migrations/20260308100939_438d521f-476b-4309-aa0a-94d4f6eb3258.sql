ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_theme jsonb DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bubble_radius text DEFAULT 'lg';