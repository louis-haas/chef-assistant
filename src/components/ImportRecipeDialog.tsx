import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface ImportRecipeDialogProps {
  onRecipeImported: () => void;
}

export const ImportRecipeDialog = ({ onRecipeImported }: ImportRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [recipeText, setRecipeText] = useState("");
  const [recipeUrl, setRecipeUrl] = useState("");
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

  const handleImport = async () => {
    const isUrlMode = activeTab === "url";
    
    // Validation schemas
    const urlSchema = z.string().trim().url().max(2048);
    const textSchema = z.string().trim().min(10).max(10000);
    
    try {
      if (isUrlMode) {
        urlSchema.parse(recipeUrl);
      } else {
        textSchema.parse(recipeText);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors[0].message;
        if (message.includes("url")) {
          toast.error("Veuillez entrer une URL valide");
        } else if (message.includes("min")) {
          toast.error("Le texte de la recette est trop court (minimum 10 caractères)");
        } else if (message.includes("max")) {
          toast.error("Le texte de la recette est trop long (maximum 10000 caractères)");
        } else {
          toast.error("Format invalide");
        }
        return;
      }
    }

    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour importer une recette");
        return;
      }

      let requestBody;
      if (isUrlMode) {
        requestBody = { recipeUrl };
      } else {
        requestBody = { recipeText };
      }

      const { data: functionData, error: functionError } = await supabase.functions.invoke('import-recipe', {
        body: requestBody
      });

      if (functionError) {
        let errorMessage = "Erreur lors de l'import de la recette";
        
        // Handle specific error messages
        if (functionData?.error) {
          errorMessage = functionData.error;
        } else if (functionError.message) {
          errorMessage = functionError.message;
        }
        
        // Add helpful message for 503 errors
        if (errorMessage.includes('temporairement indisponible')) {
          errorMessage += " Le service AI est en maintenance, veuillez réessayer dans quelques minutes.";
        }
        
        toast.error(errorMessage);
        throw functionError;
      }

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
        // Convert old format (|) to new format (;)
        const convertedIng = ing.replace(/\|/g, ';');
        const [name, quantity, unit] = convertedIng.split(';');
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Texte</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
