import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportRecipeDialogProps {
  onRecipeImported: () => void;
}

export const ImportRecipeDialog = ({ onRecipeImported }: ImportRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [recipeText, setRecipeText] = useState("");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState("text");

  const parseRecipeResponse = (parsedText: string) => {
    const lines = parsedText.split('\n');
    let title = "";
    let description = "";
    let ingredients: string[] = [];
    let instructions = "";
    let prep_time = null;
    let cook_time = null;
    let servings = null;

    let currentSection = "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('TITRE:')) {
        title = trimmedLine.replace('TITRE:', '').trim();
      } else if (trimmedLine.startsWith('DESCRIPTION:')) {
        const desc = trimmedLine.replace('DESCRIPTION:', '').trim();
        description = desc === 'N/A' ? '' : desc;
      } else if (trimmedLine === 'INGRÉDIENTS:') {
        currentSection = 'ingredients';
      } else if (trimmedLine.startsWith('INSTRUCTIONS:')) {
        currentSection = 'instructions';
        const firstLine = trimmedLine.replace('INSTRUCTIONS:', '').trim();
        if (firstLine) {
          instructions = firstLine;
        }
      } else if (trimmedLine.startsWith('TEMPS_PREP:')) {
        currentSection = '';
        const time = trimmedLine.replace('TEMPS_PREP:', '').trim();
        prep_time = time === 'N/A' ? null : time;
      } else if (trimmedLine.startsWith('TEMPS_CUISSON:')) {
        const time = trimmedLine.replace('TEMPS_CUISSON:', '').trim();
        cook_time = time === 'N/A' ? null : time;
      } else if (trimmedLine.startsWith('PORTIONS:')) {
        const portions = trimmedLine.replace('PORTIONS:', '').trim();
        servings = portions === 'N/A' ? null : parseInt(portions);
      } else if (currentSection === 'ingredients' && trimmedLine && !trimmedLine.startsWith('INSTRUCTIONS:')) {
        ingredients.push(trimmedLine);
      } else if (currentSection === 'instructions' && trimmedLine) {
        instructions += (instructions ? '\n\n' : '') + trimmedLine;
      }
    }

    return { title, description, ingredients, instructions, prep_time, cook_time, servings };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setRecipeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleImport = async () => {
    const isUrlMode = activeTab === "url";
    const isImageMode = activeTab === "image";
    
    if (isUrlMode && !recipeUrl.trim()) {
      toast.error("Veuillez entrer une URL");
      return;
    }
    
    if (isImageMode && !recipeImage) {
      toast.error("Veuillez sélectionner une photo");
      return;
    }
    
    if (!isUrlMode && !isImageMode && !recipeText.trim()) {
      toast.error("Veuillez coller le texte d'une recette");
      return;
    }

    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour importer une recette");
        return;
      }

      let requestBody;
      if (isImageMode) {
        requestBody = { recipeImage };
      } else if (isUrlMode) {
        requestBody = { recipeUrl };
      } else {
        requestBody = { recipeText };
      }

      const { data: functionData, error: functionError } = await supabase.functions.invoke('import-recipe', {
        body: requestBody
      });

      if (functionError) throw functionError;

      const recipe = parseRecipeResponse(functionData.parsedRecipe);

      const { data: insertedRecipe, error: insertError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: recipe.title,
          description: recipe.description || null,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          servings: recipe.servings
        })
        .select()
        .single();

      if (insertError || !insertedRecipe) throw insertError;

      // Ajouter à la to-do
      await supabase.from("todo_recipes").insert({ 
        user_id: user.id, 
        recipe_id: insertedRecipe.id 
      });

      // Ajouter les ingrédients
      const ingredientsToAdd = recipe.ingredients.map(ing => {
        const [name, quantity, unit] = ing.split('|');
        return { 
          user_id: user.id, 
          recipe_id: insertedRecipe.id, 
          name: name?.trim() || ing, 
          quantity: quantity?.trim() || null,
          unit: unit?.trim() || null,
          checked: false 
        };
      });
      await supabase.from("ingredients").insert(ingredientsToAdd);

      toast.success("Recette importée et ajoutée à votre to-do!");
      setRecipeText("");
      setRecipeUrl("");
      setRecipeImage(null);
      setOpen(false);
      onRecipeImported();
    } catch (error) {
      console.error('Error importing recipe:', error);
      toast.error("Erreur lors de l'import de la recette");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 sm:gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Importer une recette</span>
          <span className="sm:hidden">Importer</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Importer une recette</DialogTitle>
          <DialogDescription>
            Importez une recette via texte ou URL et l'IA l'analysera automatiquement.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Texte</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="image">Photo</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="space-y-4">
            <Textarea
              placeholder="Collez ici le texte complet de votre recette..."
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              className="min-h-[300px]"
            />
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !recipeText.trim()}
              className="w-full"
            >
              {isImporting ? "Import en cours..." : "Importer la recette"}
            </Button>
          </TabsContent>
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://example.com/ma-recette"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                L'application va scraper la page et extraire la recette automatiquement.
              </p>
            </div>
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !recipeUrl.trim()}
              className="w-full"
            >
              {isImporting ? "Import en cours..." : "Importer depuis l'URL"}
            </Button>
          </TabsContent>
          <TabsContent value="image" className="space-y-4">
            <div className="space-y-2">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="recipe-image-upload"
                />
                <label 
                  htmlFor="recipe-image-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Image className="h-12 w-12 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {recipeImage ? "Image sélectionnée ✓" : "Cliquez pour sélectionner une photo de recette"}
                  </span>
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                L'IA va analyser la photo et extraire automatiquement les informations de la recette.
              </p>
            </div>
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !recipeImage}
              className="w-full"
            >
              {isImporting ? "Analyse en cours..." : "Analyser et importer"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
