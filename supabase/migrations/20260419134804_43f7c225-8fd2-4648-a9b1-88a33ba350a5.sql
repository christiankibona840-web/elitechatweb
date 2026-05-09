
-- Add edited_at columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Ensure update policies exist allowing senders to edit their own messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Senders can edit own messages'
  ) THEN
    CREATE POLICY "Senders can edit own messages"
      ON public.messages
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = sender_id)
      WITH CHECK (auth.uid() = sender_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'group_messages' AND policyname = 'Senders can edit own group messages'
  ) THEN
    CREATE POLICY "Senders can edit own group messages"
      ON public.group_messages
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = sender_id)
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;
