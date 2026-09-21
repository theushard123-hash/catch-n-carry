-- Allow users to insert only their own profile row (defense-in-depth;
-- profile creation normally happens via the handle_new_user trigger,
-- which runs as security definer and bypasses RLS).
CREATE POLICY "Users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());