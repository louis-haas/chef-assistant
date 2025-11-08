import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { RecipeSearch } from "@/components/RecipeSearch";
import { RecipeCard } from "@/components/RecipeCard";
import { IngredientsList } from "@/components/IngredientsList";
import { ImportRecipeDialog } from "@/components/ImportRecipeDialog";
import { LanguageToggle } from "@/components/LanguageToggle";
import { TagManager } from "@/components/TagManager";
import { FriendsManager } from "@/components/FriendsManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogOut, ChefHat } from "lucide-react";

interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
}

interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  checked: boolean;
  recipe_id?: string;
}

interface GroupedIngredient {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  checked: boolean;
  originalIds: string[];
}

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [todoRecipes, setTodoRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [sharedRecipes, setSharedRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadTodoRecipes();
      loadFavoriteRecipes();
      loadSharedRecipes();
      loadIngredients();
      loadTags();
    }
  }, [session]);

  const loadTodoRecipes = async () => {
    const { data, error } = await supabase
      .from("todo_recipes")
      .select(`recipe_id, recipes (*)`)
      .eq("user_id", session.user.id);
    if (!error) setTodoRecipes(data?.map((item: any) => item.recipes).filter(Boolean) || []);
  };

  const loadFavoriteRecipes = async () => {
    const { data, error } = await supabase
      .from("favorite_recipes")
      .select(`recipe_id, recipes (*)`)
      .eq("user_id", session.user.id);
    if (!error) setFavoriteRecipes(data?.map((item: any) => item.recipes).filter(Boolean) || []);
  };

  const loadSharedRecipes = async () => {
    const { data, error } = await supabase
      .from("shared_recipes")
      .select(`
        recipe_id,
        recipes (*),
        shared_by:profiles!shared_recipes_shared_by_user_id_fkey(display_name, email)
      `)
      .eq("shared_with_user_id", session.user.id);
    if (!error) setSharedRecipes(data?.map((item: any) => item.recipes).filter(Boolean) || []);
  };

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });
    if (!error) setIngredients(data || []);
  };

  const loadTags = async () => {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", session.user.id)
      .order("name");
    setAllTags(data || []);
  };

  const fetchUserRecipes = async () => {
    await loadTodoRecipes();
    await loadFavoriteRecipes();
    await loadIngredients();
  };

  const handleSearch = async (prompt: string) => {
    setSearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-recipes", { body: { prompt } });
      if (error) throw error;

      const recipesToSave = data.recipes.map((recipe: any) => ({
        user_id: session.user.id,
        title: recipe.title.replace(/œu/gi, 'oeu'),
        description: recipe.description?.replace(/œu/gi, 'oeu'),
        ingredients: recipe.ingredients.map((ing: string) => ing.replace(/œu/gi, 'oeu')),
        instructions: recipe.instructions.replace(/œu/gi, 'oeu'),
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
      }));

      const { data: savedRecipes, error: saveError } = await supabase.from("recipes").insert(recipesToSave).select();
      if (saveError) throw saveError;

      setSuggestedRecipes(savedRecipes || []);
      toast({ title: t("recipesFound"), description: `${savedRecipes?.length || 0} ${t("recipesCount")}` });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("error"), description: error.message });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddToTodo = async (recipe: Recipe) => {
    try {
      await supabase.from("todo_recipes").insert({ user_id: session.user.id, recipe_id: recipe.id });
      const ingredientsToAdd = recipe.ingredients.map(ing => {
        // Convert old format (|) to new format (;)
        const convertedIng = ing.replace(/\|/g, ';');
        const [name, quantity, unit] = convertedIng.split(';');
        const normalizedName = (name?.trim() || ing).replace(/œu/gi, 'oeu');
        return { 
          user_id: session.user.id, 
          recipe_id: recipe.id, 
          name: normalizedName, 
          quantity: quantity?.trim() || null,
          unit: unit?.trim() || null,
          checked: false 
        };
      });
      await supabase.from("ingredients").insert(ingredientsToAdd);
      await loadTodoRecipes();
      await loadIngredients();
      toast({ title: t("added"), description: t("addedToTodo") });
    } catch (error: any) {
      if (error.code === "23505") toast({ variant: "destructive", title: t("alreadyAdded") });
    }
  };

  const handleAddToFavorites = async (recipe: Recipe) => {
    try {
      await supabase.from("favorite_recipes").insert({ user_id: session.user.id, recipe_id: recipe.id });
      await loadFavoriteRecipes();
      toast({ title: t("addedToFavorites") });
    } catch (error: any) {
      if (error.code === "23505") toast({ variant: "destructive", title: t("alreadyInFavorites") });
    }
  };

  const handleRemoveFromTodo = async (recipeId: string) => {
    await supabase.from("todo_recipes").delete().eq("user_id", session.user.id).eq("recipe_id", recipeId);
    await supabase.from("ingredients").delete().eq("user_id", session.user.id).eq("recipe_id", recipeId);
    await loadTodoRecipes();
    await loadIngredients();
    toast({ title: t("removedFromTodo") });
  };

  const handleRemoveFromFavorites = async (recipeId: string) => {
    await supabase.from("favorite_recipes").delete().eq("user_id", session.user.id).eq("recipe_id", recipeId);
    await loadFavoriteRecipes();
    toast({ title: t("removedFromFavorites") });
  };

  const handleRemoveFromShared = async (recipeId: string) => {
    await supabase.from("shared_recipes").delete().eq("shared_with_user_id", session.user.id).eq("recipe_id", recipeId);
    await loadSharedRecipes();
    toast({ title: t("removedFromShared") });
  };

  const handleToggleIngredient = async (id: string, checked: boolean) => {
    await supabase.from("ingredients").update({ checked }).eq("id", id);
    setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, checked } : ing));
  };

  const handleRemoveIngredient = async (id: string) => {
    await supabase.from("ingredients").delete().eq("id", id);
    await loadIngredients();
  };

  const handleServingsChange = async (recipeId: string, newServings: number) => {
    // Find the recipe to get original servings
    const recipe = todoRecipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.servings) return;

    const ratio = newServings / recipe.servings;

    // Get all ingredients for this recipe
    const recipeIngredients = ingredients.filter(ing => ing.recipe_id === recipeId);

    // Update each ingredient with adjusted quantity
    for (const ingredient of recipeIngredients) {
      if (ingredient.quantity) {
        const numericQuantity = parseQuantity(ingredient.quantity)?.value;
        if (numericQuantity) {
          const adjustedQuantity = numericQuantity * ratio;
          const formattedQuantity = adjustedQuantity.toFixed(3).replace(/\.?0+$/, '');
          
          await supabase
            .from("ingredients")
            .update({ quantity: formattedQuantity })
            .eq("id", ingredient.id);
        }
      }
    }

    await loadIngredients();
  };

  const parseQuantity = (quantity: string): { value: number; unit: string } | null => {
    if (!quantity) return null;
    
    // Extraire le nombre et l'unité
    const match = quantity.match(/^([\d.,]+)\s*([a-zA-Zàâäéèêëïîôùûüÿç]*)/);
    if (!match) return null;
    
    const value = parseFloat(match[1].replace(',', '.'));
    const unit = match[2].toLowerCase().trim();
    
    return { value, unit };
  };

  const convertToBaseUnit = (value: number, unit: string): { value: number; unit: string } => {
    // Convertir en unité de base (g pour poids, ml pour volume)
    const weightUnits: Record<string, number> = {
      'kg': 1000,
      'g': 1,
      'mg': 0.001,
    };
    
    const volumeUnits: Record<string, number> = {
      'l': 1000,
      'ml': 1,
      'cl': 10,
      'dl': 100,
    };
    
    if (weightUnits[unit]) {
      return { value: value * weightUnits[unit], unit: 'g' };
    }
    
    if (volumeUnits[unit]) {
      return { value: value * volumeUnits[unit], unit: 'ml' };
    }
    
    // Si unité non reconnue, retourner tel quel
    return { value, unit };
  };

  const formatQuantity = (value: number, unit: string): string => {
    // Si c'est en grammes et >= 1000, convertir en kg
    if (unit === 'g' && value >= 1000) {
      return `${(value / 1000).toFixed(3).replace(/\.?0+$/, '')} kg`;
    }
    
    // Si c'est en ml et >= 1000, convertir en L
    if (unit === 'ml' && value >= 1000) {
      return `${(value / 1000).toFixed(3).replace(/\.?0+$/, '')} L`;
    }
    
    // Formater avec maximum 3 décimales et enlever les zéros inutiles
    const formatted = value.toFixed(3).replace(/\.?0+$/, '');
    return unit ? `${formatted} ${unit}` : formatted;
  };

  const addQuantities = (qty1: string | undefined, qty2: string | undefined): string | undefined => {
    if (!qty1) return qty2;
    if (!qty2) return qty1;
    
    const parsed1 = parseQuantity(qty1);
    const parsed2 = parseQuantity(qty2);
    
    console.log(`Adding quantities: "${qty1}" + "${qty2}"`, { parsed1, parsed2 });
    
    if (!parsed1) return qty2;
    if (!parsed2) return qty1;
    
    const base1 = convertToBaseUnit(parsed1.value, parsed1.unit);
    const base2 = convertToBaseUnit(parsed2.value, parsed2.unit);
    
    console.log(`Converted to base units:`, { base1, base2 });
    
    // Si les unités de base sont différentes, concaténer
    if (base1.unit !== base2.unit) {
      console.log(`Different units, concatenating`);
      return `${qty1}, ${qty2}`;
    }
    
    // Additionner et formater
    const total = base1.value + base2.value;
    const result = formatQuantity(total, base1.unit);
    console.log(`Total: ${total} ${base1.unit} → formatted: "${result}"`);
    return result;
  };

  const groupIngredients = (items: Ingredient[]): GroupedIngredient[] => {
    const grouped = items.reduce((acc, item) => {
      const cleanName = item.name.toLowerCase().trim();
      const quantity = item.quantity;
      const unit = item.unit;
      
      if (!acc[cleanName]) {
        acc[cleanName] = {
          id: item.id,
          name: item.name,
          quantity: quantity,
          unit: unit,
          checked: item.checked,
          originalIds: [item.id],
        };
      } else {
        acc[cleanName].originalIds.push(item.id);
        acc[cleanName].checked = acc[cleanName].checked && item.checked;
        // Additionner les quantités si l'unité est la même
        if (quantity && acc[cleanName].quantity && unit === acc[cleanName].unit) {
          acc[cleanName].quantity = addQuantities(acc[cleanName].quantity, quantity);
        }
      }
      return acc;
    }, {} as Record<string, GroupedIngredient>);
    
    return Object.values(grouped).sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  };

  const handleToggleGroupedIngredient = async (originalIds: string[], checked: boolean) => {
    // Mettre à jour tous les ingrédients du groupe
    await Promise.all(
      originalIds.map(id => 
        supabase.from("ingredients").update({ checked }).eq("id", id)
      )
    );
    await loadIngredients();
  };

  const handleRemoveGroupedIngredient = async (originalIds: string[]) => {
    // Supprimer tous les ingrédients du groupe
    await Promise.all(
      originalIds.map(id => 
        supabase.from("ingredients").delete().eq("id", id)
      )
    );
    await loadIngredients();
  };

  const handleClearAllIngredients = async () => {
    await supabase.from("ingredients").delete().eq("user_id", session.user.id);
    await loadIngredients();
    toast({ title: t("ingredientListCleared") });
  };

  const groupedIngredients = groupIngredients(ingredients);

  const getFilteredFavorites = async () => {
    if (selectedTagIds.length === 0) {
      return favoriteRecipes;
    }

    // Récupérer les recipe_ids qui ont au moins un des tags sélectionnés
    const { data: recipeTagsData } = await supabase
      .from("recipe_tags")
      .select("recipe_id")
      .in("tag_id", selectedTagIds);

    const recipeIds = recipeTagsData?.map(rt => rt.recipe_id) || [];
    return favoriteRecipes.filter(recipe => recipeIds.includes(recipe.id));
  };

  const [filteredFavorites, setFilteredFavorites] = useState<Recipe[]>([]);

  useEffect(() => {
    getFilteredFavorites().then(setFilteredFavorites);
  }, [selectedTagIds, favoriteRecipes]);

  const handleToggleTagFilter = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold truncate">{t("appName")}</h1>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <LanguageToggle />
            <ImportRecipeDialog onRecipeImported={fetchUserRecipes} />
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid gap-4 sm:gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <RecipeSearch onSearch={handleSearch} isLoading={searchLoading} />
            <Tabs defaultValue="suggestions">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="suggestions" className="text-xs sm:text-sm">{t("suggestions")}</TabsTrigger>
                <TabsTrigger value="todo" className="text-xs sm:text-sm">{t("todo")} ({todoRecipes.length})</TabsTrigger>
                <TabsTrigger value="favorites" className="text-xs sm:text-sm">{t("favorites")} ({favoriteRecipes.length})</TabsTrigger>
                <TabsTrigger value="shared" className="text-xs sm:text-sm">{t("shared")} ({sharedRecipes.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="suggestions" className="space-y-4">
                {suggestedRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">{t("searchRecipes")}</p> : <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">{suggestedRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo={todoRecipes.some(r => r.id === recipe.id)} isFavorite={favoriteRecipes.some(r => r.id === recipe.id)} onRecipeUpdated={fetchUserRecipes} />)}</div>}
              </TabsContent>
              <TabsContent value="todo" className="space-y-4">
                {todoRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">{t("noTodoRecipes")}</p> : <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">{todoRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo isFavorite={favoriteRecipes.some(r => r.id === recipe.id)} onRemoveFromTodo={handleRemoveFromTodo} onRecipeUpdated={fetchUserRecipes} onServingsChange={handleServingsChange} />)}</div>}
              </TabsContent>
              <TabsContent value="favorites" className="space-y-4">
                {favoriteRecipes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("noFavoriteRecipes")}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <TagManager userId={session.user.id} onTagsUpdated={loadTags} />
                      {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {allTags.map((tag) => (
                            <Badge
                              key={tag.id}
                              style={{ 
                                backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : 'transparent',
                                borderColor: tag.color,
                                color: selectedTagIds.includes(tag.id) ? 'white' : tag.color,
                              }}
                              className="cursor-pointer border-2"
                              onClick={() => handleToggleTagFilter(tag.id)}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                      {filteredFavorites.map(recipe => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          onAddToTodo={handleAddToTodo}
                          onAddToFavorites={handleAddToFavorites}
                          isTodo={todoRecipes.some(r => r.id === recipe.id)}
                          isFavorite
                          onRemoveFromFavorites={handleRemoveFromFavorites}
                          onRecipeUpdated={fetchUserRecipes}
                          userId={session.user.id}
                          showTags
                        />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="shared" className="space-y-4">
                {sharedRecipes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune recette partagée</p>
                ) : (
                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                     {sharedRecipes.map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onAddToTodo={handleAddToTodo}
                        onAddToFavorites={handleAddToFavorites}
                        isTodo={todoRecipes.some(r => r.id === recipe.id)}
                        isFavorite={favoriteRecipes.some(r => r.id === recipe.id)}
                        isShared
                        onRemoveFromShared={handleRemoveFromShared}
                        onRecipeUpdated={loadSharedRecipes}
                        userId={session.user.id}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          <div className="lg:col-span-1 space-y-4">
            <FriendsManager userId={session.user.id} />
            <IngredientsList
              ingredients={groupedIngredients}
              onToggle={(id, checked) => {
                const ingredient = groupedIngredients.find(i => i.id === id);
                if (ingredient) handleToggleGroupedIngredient(ingredient.originalIds, checked);
              }} 
              onRemove={(id) => {
                const ingredient = groupedIngredients.find(i => i.id === id);
                if (ingredient) handleRemoveGroupedIngredient(ingredient.originalIds);
              }}
              onIngredientAdded={loadIngredients}
              onClearAll={handleClearAllIngredients}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
