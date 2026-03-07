
-- Sequence for readable user IDs
CREATE SEQUENCE public.user_number_seq START 1;

-- Profiles table with readable IDs like "0001json"
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_number INT NOT NULL DEFAULT nextval('public.user_number_seq') UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  readable_id TEXT GENERATED ALWAYS AS (lpad(user_number::text, 4, '0') || username) STORED UNIQUE,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by all authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contact_id)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own contacts" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Direct messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own messages" ON public.messages FOR SELECT TO authenticated 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.messages FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can update status" ON public.messages FOR UPDATE TO authenticated 
  USING (auth.uid() = receiver_id);

CREATE INDEX idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id, created_at);

-- Groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE user_id = _user_id AND group_id = _group_id);
$$;

CREATE POLICY "Members see groups" ON public.groups FOR SELECT TO authenticated 
  USING (public.is_group_member(auth.uid(), id));
CREATE POLICY "Anyone can create groups" ON public.groups FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members see group members" ON public.group_members FOR SELECT TO authenticated 
  USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Group admins add members" ON public.group_members FOR INSERT TO authenticated 
  WITH CHECK (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Admins or self can remove" ON public.group_members FOR DELETE TO authenticated 
  USING (auth.uid() = user_id OR (SELECT role FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()) = 'admin');

-- Group messages
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see group messages" ON public.group_messages FOR SELECT TO authenticated 
  USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Members send group messages" ON public.group_messages FOR INSERT TO authenticated 
  WITH CHECK (public.is_group_member(auth.uid(), group_id) AND auth.uid() = sender_id);

CREATE INDEX idx_group_messages ON public.group_messages(group_id, created_at);

-- Statuses (stories)
CREATE TABLE public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated see statuses" ON public.statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users post own statuses" ON public.statuses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own statuses" ON public.statuses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.status_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(status_id, viewer_id)
);

ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status owner sees views" ON public.status_views FOR SELECT TO authenticated 
  USING ((SELECT user_id FROM public.statuses WHERE id = status_id) = auth.uid());
CREATE POLICY "Users mark viewed" ON public.status_views FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = viewer_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

CREATE POLICY "Authenticated upload chat files" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "Anyone can view chat files" ON storage.objects FOR SELECT 
  USING (bucket_id = 'chat-files');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
