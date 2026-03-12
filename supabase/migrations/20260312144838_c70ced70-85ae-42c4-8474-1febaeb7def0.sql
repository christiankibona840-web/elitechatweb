
-- Starred messages table
CREATE TABLE public.starred_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL,
  message_type text NOT NULL DEFAULT 'dm',
  chat_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, message_id)
);

ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own stars" ON public.starred_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own stars" ON public.starred_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own stars" ON public.starred_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Disappearing messages settings table
CREATE TABLE public.disappearing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  chat_type text NOT NULL DEFAULT 'dm',
  duration_seconds integer NOT NULL DEFAULT 86400,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, chat_id)
);

ALTER TABLE public.disappearing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own settings" ON public.disappearing_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own settings" ON public.disappearing_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.disappearing_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own settings" ON public.disappearing_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
