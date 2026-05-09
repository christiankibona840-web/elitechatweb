-- Allow senders to update their own messages (for delete for everyone)
CREATE POLICY "Sender can update own messages" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = sender_id);

-- Allow senders to update their own group messages
CREATE POLICY "Sender can update own group messages" ON public.group_messages
  FOR UPDATE TO authenticated USING (auth.uid() = sender_id);