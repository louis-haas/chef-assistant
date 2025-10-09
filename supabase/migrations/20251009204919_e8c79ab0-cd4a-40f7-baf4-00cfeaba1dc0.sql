-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags
CREATE POLICY "Users can view their own tags"
ON public.tags
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
ON public.tags
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
ON public.tags
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
ON public.tags
FOR DELETE
USING (auth.uid() = user_id);

-- Create recipe_tags junction table
CREATE TABLE public.recipe_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, tag_id)
);

-- Enable RLS on recipe_tags
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipe_tags (check if user owns the tag)
CREATE POLICY "Users can view recipe tags for their tags"
ON public.recipe_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tags
    WHERE tags.id = recipe_tags.tag_id
    AND tags.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create recipe tags with their tags"
ON public.recipe_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tags
    WHERE tags.id = recipe_tags.tag_id
    AND tags.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete recipe tags for their tags"
ON public.recipe_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tags
    WHERE tags.id = recipe_tags.tag_id
    AND tags.user_id = auth.uid()
  )
);