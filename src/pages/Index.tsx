import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { RecipeSearch } from "@/components/RecipeSearch";
import { RecipeCard } from "@/components/RecipeCard";
import { IngredientsList } from "@/components/IngredientsList";
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
  checked: boolean;
  recipe_id?: string;
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
      const ingredientsToAdd = recipe.ingredients.map(ing => ({ user_id: session.user.id, recipe_id: recipe.id, name: ing, checked: false }));
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Assistant Culinaire</h1>
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
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
                {suggestedRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">Recherchez des recettes!</p> : <div className="grid gap-4 md:grid-cols-2">{suggestedRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo={todoRecipes.some(r => r.id === recipe.id)} isFavorite={favoriteRecipes.some(r => r.id === recipe.id)} />)}</div>}
              </TabsContent>
              <TabsContent value="todo" className="space-y-4">
                {todoRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune recette dans votre to-do</p> : <div className="grid gap-4 md:grid-cols-2">{todoRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo isFavorite={favoriteRecipes.some(r => r.id === recipe.id)} onRemoveFromTodo={handleRemoveFromTodo} />)}</div>}
              </TabsContent>
              <TabsContent value="favorites" className="space-y-4">
                {favoriteRecipes.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune recette favorite</p> : <div className="grid gap-4 md:grid-cols-2">{favoriteRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onAddToTodo={handleAddToTodo} onAddToFavorites={handleAddToFavorites} isTodo={todoRecipes.some(r => r.id === recipe.id)} isFavorite onRemoveFromFavorites={handleRemoveFromFavorites} />)}</div>}
              </TabsContent>
            </Tabs>
          </div>
          <div className="md:col-span-1">
            <IngredientsList ingredients={ingredients} onToggle={handleToggleIngredient} onRemove={handleRemoveIngredient} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
