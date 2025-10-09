import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";

interface RecipeSearchProps {
  onSearch: (prompt: string) => void;
  isLoading: boolean;
}

export const RecipeSearch = ({ onSearch, isLoading }: RecipeSearchProps) => {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSearch(prompt);
    }
  };

  const suggestions = [
    "Des recettes végétariennes rapides",
    "Des desserts sans gluten",
    "Des plats italiens traditionnels",
    "Des recettes pour le dîner",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechercher des recettes</CardTitle>
        <CardDescription>
          Décrivez ce que vous aimeriez cuisiner et l'IA vous suggérera des recettes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: des recettes de pâtes faciles..."
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
            <p className="text-sm text-muted-foreground">Suggestions:</p>
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
