import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Tag } from "lucide-react";
import { toast } from "sonner";

interface TagType {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  userId: string;
  onTagsUpdated?: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
];

export const TagManager = ({ userId, onTagsUpdated }: TagManagerProps) => {
  const [tags, setTags] = useState<TagType[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadTags = async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (error) {
      console.error("Error loading tags:", error);
      return;
    }

    setTags(data || []);
  };

  useEffect(() => {
    loadTags();
  }, [userId]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Le nom du tag ne peut pas être vide");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("tags")
      .insert({
        user_id: userId,
        name: newTagName.trim(),
        color: selectedColor,
      });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Ce tag existe déjà");
      } else {
        toast.error("Erreur lors de la création du tag");
        console.error(error);
      }
      return;
    }

    toast.success("Tag créé avec succès");
    setNewTagName("");
    setSelectedColor(PRESET_COLORS[0]);
    await loadTags();
    onTagsUpdated?.();
  };

  const handleDeleteTag = async (tagId: string) => {
    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", tagId);

    if (error) {
      toast.error("Erreur lors de la suppression du tag");
      console.error(error);
      return;
    }

    toast.success("Tag supprimé");
    await loadTags();
    onTagsUpdated?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="h-4 w-4 mr-2" />
          Gérer les tags
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gérer les tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Créer un nouveau tag</label>
            <div className="flex gap-2">
              <Input
                placeholder="Nom du tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTag();
                }}
              />
              <Button onClick={handleCreateTag} disabled={loading} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 ${
                    selectedColor === color ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Vos tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun tag créé</p>
              ) : (
                tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color }}
                    className="text-white flex items-center gap-1"
                  >
                    {tag.name}
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
