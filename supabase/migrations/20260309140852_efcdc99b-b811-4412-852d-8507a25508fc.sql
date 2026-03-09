-- Message reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  message_type text NOT NULL DEFAULT 'dm',
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see reactions
CREATE POLICY "Authenticated see reactions" ON public.message_reactions
  FOR SELECT TO authenticated USING (true);

-- Users add own reactions
CREATE POLICY "Users add reactions" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users remove own reactions
CREATE POLICY "Users remove reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add deleted_for_everyone column to messages
ALTER TABLE public.messages ADD COLUMN deleted_for_everyone boolean DEFAULT false;
ALTER TABLE public.group_messages ADD COLUMN deleted_for_everyone boolean DEFAULT false;

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;