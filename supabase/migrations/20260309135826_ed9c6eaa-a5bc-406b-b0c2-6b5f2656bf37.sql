ALTER TABLE public.messages ADD COLUMN reply_to jsonb DEFAULT NULL;
ALTER TABLE public.group_messages ADD COLUMN reply_to jsonb DEFAULT NULL;