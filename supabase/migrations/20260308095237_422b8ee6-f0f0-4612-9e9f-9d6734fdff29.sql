
-- Add gender column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT null;

-- Add unique constraint on contacts for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_user_id_contact_id_key') THEN
    ALTER TABLE public.contacts ADD CONSTRAINT contacts_user_id_contact_id_key UNIQUE (user_id, contact_id);
  END IF;
END $$;

-- Add unique constraint on status_views for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'status_views_status_id_viewer_id_key') THEN
    ALTER TABLE public.status_views ADD CONSTRAINT status_views_status_id_viewer_id_key UNIQUE (status_id, viewer_id);
  END IF;
END $$;

-- Enable realtime for group_messages (messages already enabled)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  END IF;
END $$;
