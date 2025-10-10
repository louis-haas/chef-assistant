-- Create profiles for existing users who don't have one
INSERT INTO public.profiles (id, email, display_name)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'display_name' as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;