ALTER POLICY "Users insert own profile"
ON public.profiles
WITH CHECK (
  user_id = auth.uid()
  AND approved = (customer_type = 'varejo'::public.customer_type)
  AND external_code IS NULL
  AND admin_notes IS NULL
);