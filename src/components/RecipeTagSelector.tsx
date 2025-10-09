import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "lucide-react";
import { toast } from "sonner";

interface TagType {
  id: string;
  name: string;
  color: string;
}

interface RecipeTagSelectorProps {
  recipeId: string;
  userId: string;
  onTagsChanged?: () => void;
  showBadges?: boolean;
}

export const RecipeTagSelector = ({ recipeId, userId, onTagsChanged, showBadges = true }: RecipeTagSelectorProps) => {
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTags = async () => {
    const { data: tagsData } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    const { data: recipeTagsData } = await supabase
      .from("recipe_tags")
      .select("tag_id")
      .eq("recipe_id", recipeId);

    setAllTags(tagsData || []);
    setSelectedTagIds(recipeTagsData?.map((rt) => rt.tag_id) || []);
  };

  useEffect(() => {
    loadTags();
  }, [recipeId, userId]);

  const handleToggleTag = async (tagId: string, checked: boolean) => {
    setLoading(true);

    if (checked) {
      const { error } = await supabase
        .from("recipe_tags")
        .insert({ recipe_id: recipeId, tag_id: tagId });

      if (error) {
        toast.error("Erreur lors de l'ajout du tag");
        console.error(error);
      } else {
        setSelectedTagIds([...selectedTagIds, tagId]);
        onTagsChanged?.();
      }
    } else {
      const { error } = await supabase
        .from("recipe_tags")
        .delete()
        .eq("recipe_id", recipeId)
        .eq("tag_id", tagId);

      if (error) {
        toast.error("Erreur lors du retrait du tag");
        console.error(error);
      } else {
        setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
        onTagsChanged?.();
      }
    }

    setLoading(false);
  };

  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showBadges && selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.color }}
          className="text-white"
        >
          {tag.name}
        </Badge>
      ))}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            <Tag className="h-4 w-4 mr-2" />
            Tags
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-background z-50">
          {allTags.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Aucun tag disponible
            </div>
          ) : (
            allTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={selectedTagIds.includes(tag.id)}
                onCheckedChange={(checked) => handleToggleTag(tag.id, checked)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </div>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
