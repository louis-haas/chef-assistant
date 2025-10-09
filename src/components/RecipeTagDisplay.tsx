import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface TagType {
  id: string;
  name: string;
  color: string;
}

interface RecipeTagDisplayProps {
  recipeId: string;
  userId: string;
}

export const RecipeTagDisplay = ({ recipeId, userId }: RecipeTagDisplayProps) => {
  const [tags, setTags] = useState<TagType[]>([]);

  const loadTags = async () => {
    const { data: recipeTagsData } = await supabase
      .from("recipe_tags")
      .select("tag_id, tags(id, name, color)")
      .eq("recipe_id", recipeId);

    if (recipeTagsData) {
      const tagsList = recipeTagsData
        .filter((rt: any) => rt.tags)
        .map((rt: any) => rt.tags);
      setTags(tagsList);
    }
  };

  useEffect(() => {
    loadTags();
  }, [recipeId, userId]);

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.color }}
          className="text-white"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
};
