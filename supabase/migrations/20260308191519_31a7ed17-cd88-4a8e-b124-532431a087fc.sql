
-- Fix group_members INSERT policy to allow group creators to add members
DROP POLICY IF EXISTS "Group admins add members" ON public.group_members;

CREATE POLICY "Group admins add members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_group_member(auth.uid(), group_id)
  OR
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND created_by = auth.uid())
);
