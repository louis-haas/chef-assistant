import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ListTodo, Clock, Users, ChevronDown, ChevronUp, UserX, Minus, Plus } from "lucide-react";
import { adjustIngredientQuantity } from "@/lib/utils";
import { EditRecipeDialog } from "@/components/EditRecipeDialog";
import { RecipeTagSelector } from "@/components/RecipeTagSelector";
import { RecipeTagDisplay } from "@/components/RecipeTagDisplay";
import { ShareRecipeDialog } from "@/components/ShareRecipeDialog";
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
  isShared?: boolean;
  onRemoveFromTodo?: (recipeId: string) => void;
  onRemoveFromFavorites?: (recipeId: string) => void;
  onRemoveFromShared?: (recipeId: string) => void;
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
  isShared,
  onRemoveFromTodo,
  onRemoveFromFavorites,
  onRemoveFromShared,
  onRecipeUpdated,
  userId,
  showTags = false,
}: RecipeCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [servings, setServings] = useState(recipe.servings || 1);
  
  const ratio = recipe.servings ? servings / recipe.servings : 1;
  const adjustedIngredients = recipe.ingredients.map(ing => 
    adjustIngredientQuantity(ing, ratio)
  );

  return (
    <Card className="h-full flex flex-col">
      {showTags && userId && (
        <div className="p-6 pb-3">
          <RecipeTagSelector
            recipeId={recipe.id}
            userId={userId}
            onTagsChanged={onRecipeUpdated}
            showBadges={true}
            showButton={false}
          />
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
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setServings(Math.max(1, servings - 1));
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="min-w-[3ch] text-center">{servings}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setServings(servings + 1);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  personnes
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="flex-1">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Ingrédients:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {adjustedIngredients.map((ingredient, idx) => {
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
      <CardFooter className="flex flex-col gap-2 items-stretch">
        <div className="flex gap-2 w-full">
          {showTags && userId && (
            <RecipeTagSelector
              recipeId={recipe.id}
              userId={userId}
              onTagsChanged={onRecipeUpdated}
              showBadges={false}
              showButton={true}
            />
          )}
          {userId && (
            <ShareRecipeDialog recipeId={recipe.id} userId={userId} />
          )}
        </div>
        {isTodo ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemoveFromTodo?.(recipe.id)}
            className="w-full justify-start"
          >
            <ListTodo className="mr-2 h-4 w-4" />
            Retirer de la to-do
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddToTodo(recipe)}
            className="w-full justify-start"
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
            className="w-full justify-start"
          >
            <Heart className="mr-2 h-4 w-4 fill-current" />
            Retirer des favoris
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => onAddToFavorites(recipe)}
            className="w-full justify-start"
          >
            <Heart className="mr-2 h-4 w-4" />
            Ajouter aux favoris
          </Button>
        )}
        {isShared && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemoveFromShared?.(recipe.id)}
            className="w-full justify-start"
          >
            <UserX className="mr-2 h-4 w-4" />
            Retirer des recettes partagées
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
