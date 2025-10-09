import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
      className="gap-2"
    >
      <Languages className="h-4 w-4" />
      {language === "fr" ? "EN" : "FR"}
    </Button>
  );
};
