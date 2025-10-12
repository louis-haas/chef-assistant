import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { z } from "zod";
import { toast } from "sonner";

interface RecipeSearchProps {
  onSearch: (prompt: string) => void;
  isLoading: boolean;
}

export const RecipeSearch = ({ onSearch, isLoading }: RecipeSearchProps) => {
  const [prompt, setPrompt] = useState("");
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate search prompt
    const promptSchema = z.string().trim().min(3, "La recherche doit contenir au moins 3 caractères").max(500, "La recherche est trop longue (max 500 caractères)");
    
    try {
      const validatedPrompt = promptSchema.parse(prompt);
      onSearch(validatedPrompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const suggestions = [
    t("suggestion1"),
    t("suggestion2"),
    t("suggestion3"),
    t("suggestion4"),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("searchRecipesTitle")}</CardTitle>
        <CardDescription>
          {t("searchRecipesDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t("searchInputPlaceholder")}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !prompt.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("suggestionsLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setPrompt(suggestion);
                    onSearch(suggestion);
                  }}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
