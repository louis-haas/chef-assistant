import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
}

interface EditRecipeDialogProps {
  recipe: Recipe;
  onRecipeUpdated: () => void;
}

export const EditRecipeDialog = ({ recipe, onRecipeUpdated }: EditRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description || "");
  const [ingredients, setIngredients] = useState(recipe.ingredients.join('\n'));
  const [instructions, setInstructions] = useState(recipe.instructions);
  const [prepTime, setPrepTime] = useState(recipe.prep_time || "");
  const [cookTime, setCookTime] = useState(recipe.cook_time || "");
  const [servings, setServings] = useState(recipe.servings?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    setIsSaving(true);

    try {
      const ingredientsArray = ingredients
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const { error } = await supabase
        .from('recipes')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          ingredients: ingredientsArray,
          instructions: instructions.trim(),
          prep_time: prepTime.trim() || null,
          cook_time: cookTime.trim() || null,
          servings: servings ? parseInt(servings) : null
        })
        .eq('id', recipe.id);

      if (error) throw error;

      toast.success("Recette mise à jour!");
      setOpen(false);
      onRecipeUpdated();
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la recette</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre recette
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nom de la recette"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brève description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prep_time">Temps de préparation</Label>
              <Input
                id="prep_time"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15 min"
              />
            </div>
            <div>
              <Label htmlFor="cook_time">Temps de cuisson</Label>
              <Input
                id="cook_time"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30 min"
              />
            </div>
            <div>
              <Label htmlFor="servings">Portions</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ingredients">
              Ingrédients (un par ligne au format: nom|quantité|unité)
            </Label>
            <Textarea
              id="ingredients"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="tomates|200|g&#10;oignons|2|&#10;huile d'olive|2|cs"
              rows={8}
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Étape 1: ...&#10;&#10;Étape 2: ..."
              rows={10}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
