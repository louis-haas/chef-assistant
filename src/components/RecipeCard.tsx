import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ListTodo, Clock, Users } from "lucide-react";

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

interface RecipeCardProps {
  recipe: Recipe;
  onAddToTodo: (recipe: Recipe) => void;
  onAddToFavorites: (recipe: Recipe) => void;
  isTodo?: boolean;
  isFavorite?: boolean;
  onRemoveFromTodo?: (recipeId: string) => void;
  onRemoveFromFavorites?: (recipeId: string) => void;
}

export const RecipeCard = ({
  recipe,
  onAddToTodo,
  onAddToFavorites,
  isTodo,
  isFavorite,
  onRemoveFromTodo,
  onRemoveFromFavorites,
}: RecipeCardProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">{recipe.title}</CardTitle>
        {recipe.description && (
          <CardDescription>{recipe.description}</CardDescription>
        )}
        <div className="flex gap-2 flex-wrap mt-2">
          {recipe.prep_time && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Préparation: {recipe.prep_time}
            </Badge>
          )}
          {recipe.cook_time && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Cuisson: {recipe.cook_time}
            </Badge>
          )}
          {recipe.servings && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {recipe.servings} personnes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Ingrédients:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx}>{ingredient}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Instructions:</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {recipe.instructions}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {isTodo ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemoveFromTodo?.(recipe.id)}
            className="flex-1"
          >
            <ListTodo className="mr-2 h-4 w-4" />
            Retirer de la to-do
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddToTodo(recipe)}
            className="flex-1"
          >
            <ListTodo className="mr-2 h-4 w-4" />
            Ajouter à la to-do
          </Button>
        )}
        {isFavorite ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => onRemoveFromFavorites?.(recipe.id)}
            className="flex-1"
          >
            <Heart className="mr-2 h-4 w-4 fill-current" />
            Retirer des favoris
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => onAddToFavorites(recipe)}
            className="flex-1"
          >
            <Heart className="mr-2 h-4 w-4" />
            Ajouter aux favoris
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
