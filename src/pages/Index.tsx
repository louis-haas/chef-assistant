import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { RecipeSearch } from "@/components/RecipeSearch";
import { RecipeCard } from "@/components/RecipeCard";
import { IngredientsList } from "@/components/IngredientsList";
import { ImportRecipeDialog } from "@/components/ImportRecipeDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const { toast } = useToast();

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
      loadIngredients();
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

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });
    if (!error) setIngredients(data || []);
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
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
      }));

      const { data: savedRecipes, error: saveError } = await supabase.from("recipes").insert(recipesToSave).select();
      if (saveError) throw saveError;

      setSuggestedRecipes(savedRecipes || []);
      toast({ title: "Recettes trouvées!", description: `${savedRecipes?.length || 0} recettes trouvées.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddToTodo = async (recipe: Recipe) => {
    try {
      await supabase.from("todo_recipes").insert({ user_id: session.user.id, recipe_id: recipe.id });
      const ingredientsToAdd = recipe.ingredients.map(ing => {
        const [name, quantity, unit] = ing.split('|');
        return { 
          user_id: session.user.id, 
          recipe_id: recipe.id, 
          name: name?.trim() || ing, 
          quantity: quantity?.trim() || null,
          unit: unit?.trim() || null,
          checked: false 
        };
      });
      await supabase.from("ingredients").insert(ingredientsToAdd);
      await loadTodoRecipes();
      await loadIngredients();
      toast({ title: "Ajouté!", description: "Recette ajoutée à votre to-do" });
    } catch (error: any) {
      if (error.code === "23505") toast({ variant: "destructive", title: "Déjà ajouté" });
    }
  };

  const handleAddToFavorites = async (recipe: Recipe) => {
    try {
      await supabase.from("favorite_recipes").insert({ user_id: session.user.id, recipe_id: recipe.id });
      await loadFavoriteRecipes();
      toast({ title: "Ajouté aux favoris!" });
    } catch (error: any) {
      if (error.code === "23505") toast({ variant: "destructive", title: "Déjà dans les favoris" });
    }
  };

  const handleRemoveFromTodo = async (recipeId: string) => {
    await supabase.from("todo_recipes").delete().eq("user_id", session.user.id).eq("recipe_id", recipeId);
    await supabase.from("ingredients").delete().eq("user_id", session.user.id).eq("recipe_id", recipeId);
    await loadTodoRecipes();
    await loadIngredients();
    toast({ title: "Retiré de la to-do" });
  };

  const handleRemoveFromFavorites = async (recipeId: string) => {
    await supabase.from("favorite_recipes").delete().eq("user_id", session.user.id).eq("recipe_id", recipeId);
    await loadFavoriteRecipes();
    toast({ title: "Retiré des favoris" });
  };

  const handleToggleIngredient = async (id: string, checked: boolean) => {
    await supabase.from("ingredients").update({ checked }).eq("id", id);
    setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, checked } : ing));
  };

  const handleRemoveIngredient = async (id: string) => {
    await supabase.from("ingredients").delete().eq("id", id);
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
    
    return Object.values(grouped);
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

  const groupedIngredients = groupIngredients(ingredients);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Oui Chef!</h1>
          </div>
          <div className="flex gap-2">
            <ImportRecipeDialog onRecipeImported={fetchUserRecipes} />
            <Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <RecipeSearch onSearch={handleSearch} isLoading={searchLoading} />
            <Tabs defaultValue="suggestions">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="todo">To-Do ({todoRecipes.length})</TabsTrigger>
                <TabsTrigger value="favorites">Favoris ({favoriteRecipes.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="suggestions" className="space-y-4">
                {suggestedRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">Recherchez des recettes!</p> : <div className="grid gap-4 md:grid-cols-2">{suggestedRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo={todoRecipes.some(r => r.id === recipe.id)} isFavorite={favoriteRecipes.some(r => r.id === recipe.id)} onRecipeUpdated={fetchUserRecipes} />)}</div>}
              </TabsContent>
              <TabsContent value="todo" className="space-y-4">
                {todoRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune recette dans votre to-do</p> : <div className="grid gap-4 md:grid-cols-2">{todoRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo isFavorite={favoriteRecipes.some(r => r.id === recipe.id)} onRemoveFromTodo={handleRemoveFromTodo} onRecipeUpdated={fetchUserRecipes} />)}</div>}
              </TabsContent>
              <TabsContent value="favorites" className="space-y-4">
                {favoriteRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune recette favorite</p> : <div className="grid gap-4 md:grid-cols-2">{favoriteRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo={todoRecipes.some(r => r.id === recipe.id)} isFavorite onRemoveFromFavorites={handleRemoveFromFavorites} onRecipeUpdated={fetchUserRecipes} />)}</div>}
              </TabsContent>
            </Tabs>
          </div>
          <div className="md:col-span-1">
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
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
