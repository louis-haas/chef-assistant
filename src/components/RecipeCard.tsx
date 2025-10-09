import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ListTodo, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { EditRecipeDialog } from "@/components/EditRecipeDialog";
import { RecipeTagSelector } from "@/components/RecipeTagSelector";
import { RecipeTagDisplay } from "@/components/RecipeTagDisplay";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  onRecipeUpdated?: () => void;
  userId?: string;
  showTags?: boolean;
}

export const RecipeCard = ({
  recipe,
  onAddToTodo,
  onAddToFavorites,
  isTodo,
  isFavorite,
  onRemoveFromTodo,
  onRemoveFromFavorites,
  onRecipeUpdated,
  userId,
  showTags = false,
}: RecipeCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="h-full flex flex-col">
      {showTags && userId && (
        <div className="p-6 pb-0">
          <RecipeTagDisplay recipeId={recipe.id} userId={userId} />
        </div>
      )}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className={showTags && userId ? "pt-0" : ""}>
          <div className="flex items-start justify-between gap-2">
            <CollapsibleTrigger asChild>
              <button className="flex-1 text-left group">
                <div className="flex items-start gap-2">
                  <CardTitle className="text-xl flex-1 group-hover:text-primary transition-colors">
                    {recipe.title}
                  </CardTitle>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </div>
                {recipe.description && (
                  <CardDescription className="mt-1">{recipe.description}</CardDescription>
                )}
              </button>
            </CollapsibleTrigger>
            {onRecipeUpdated && (
              <EditRecipeDialog recipe={recipe} onRecipeUpdated={onRecipeUpdated} />
            )}
          </div>
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
        <CollapsibleContent>
          <CardContent className="flex-1">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Ingrédients:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {recipe.ingredients.map((ingredient, idx) => {
                const [name, quantity, unit] = ingredient.split('|');
                const displayText = quantity 
                  ? unit 
                    ? `${name} - ${quantity} ${unit}`
                    : `${name} - ${quantity}`
                  : name;
                return <li key={idx}>{displayText}</li>;
              })}
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
        </CollapsibleContent>
      </Collapsible>
      <CardFooter className="flex flex-col gap-2 items-start">
        {showTags && userId && (
          <RecipeTagSelector
            recipeId={recipe.id}
            userId={userId}
            onTagsChanged={onRecipeUpdated}
          />
        )}
        {isTodo ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemoveFromTodo?.(recipe.id)}
            className="justify-start"
          >
            <ListTodo className="mr-2 h-4 w-4" />
            Retirer de la to-do
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddToTodo(recipe)}
            className="justify-start"
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
            className="justify-start"
          >
            <Heart className="mr-2 h-4 w-4 fill-current" />
            Retirer des favoris
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => onAddToFavorites(recipe)}
            className="justify-start"
          >
            <Heart className="mr-2 h-4 w-4" />
            Ajouter aux favoris
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
