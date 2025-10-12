-- Fix profiles table RLS policy to prevent email exposure
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a restricted policy for viewing own profile only
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create a secure function for friend lookup by email
-- This prevents exposing all emails while allowing friend search
CREATE OR REPLACE FUNCTION public.search_user_by_email(_email text)
RETURNS TABLE(id uuid, display_name text, email text)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT id, display_name, email
  FROM profiles
  WHERE email = _email
  LIMIT 1;
$$;