import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
  checked: boolean;
}

interface IngredientsListProps {
  ingredients: Ingredient[];
  onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
}

export const IngredientsList = ({ ingredients, onToggle, onRemove }: IngredientsListProps) => {
  if (ingredients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liste d'ingrédients</CardTitle>
          <CardDescription>
            Ajoutez des recettes à votre to-do pour voir les ingrédients ici
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liste d'ingrédients</CardTitle>
        <CardDescription>
          {ingredients.filter(i => !i.checked).length} ingrédients restants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted"
            >
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  checked={ingredient.checked}
                  onCheckedChange={(checked) => onToggle(ingredient.id, checked as boolean)}
                />
                <span className={ingredient.checked ? "line-through text-muted-foreground" : ""}>
                  {ingredient.name}
                  {ingredient.quantity && ` - ${ingredient.quantity}`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(ingredient.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
