import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ShoppingCart } from "lucide-react";
import { AddIngredientDialog } from "@/components/AddIngredientDialog";

interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  checked: boolean;
}

interface IngredientsListProps {
  ingredients: Ingredient[];
  onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  onIngredientAdded?: () => void;
}

export const IngredientsList = ({ ingredients, onToggle, onRemove, onIngredientAdded }: IngredientsListProps) => {
  const checkedCount = ingredients.filter(i => i.checked).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Liste de courses ({checkedCount}/{ingredients.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {onIngredientAdded && (
          <AddIngredientDialog onIngredientAdded={onIngredientAdded} />
        )}
        {ingredients.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Ajoutez des recettes à votre to-do ou ajoutez des ingrédients manuellement
          </p>
        ) : (
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
                  {ingredient.quantity && ingredient.unit && ` - ${ingredient.quantity} ${ingredient.unit}`}
                  {ingredient.quantity && !ingredient.unit && ` - ${ingredient.quantity}`}
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
        )}
      </CardContent>
    </Card>
  );
};
