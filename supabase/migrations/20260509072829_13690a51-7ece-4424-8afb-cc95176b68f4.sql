CREATE POLICY "Senders can delete own group messages"
ON public.group_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);