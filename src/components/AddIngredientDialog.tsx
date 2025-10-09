import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddIngredientDialogProps {
  onIngredientAdded: () => void;
}

export const AddIngredientDialog = ({ onIngredientAdded }: AddIngredientDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Le nom de l'item est requis");
      return;
    }

    setIsAdding(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      const { error } = await supabase
        .from('ingredients')
        .insert({
          user_id: user.id,
          name: name.trim(),
          quantity: quantity.trim() || null,
          unit: unit || null,
          checked: false
        });

      if (error) throw error;

      toast.success("Item ajouté!");
      setName("");
      setQuantity("");
      setUnit("");
      setOpen(false);
      onIngredientAdded();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un item</DialogTitle>
          <DialogDescription>
            Ajoutez manuellement un item à votre liste de courses
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de l'item *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="tomates, oignons, huile..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="200, 2, 1..."
              />
            </div>
            <div>
              <Label htmlFor="unit">Unité (optionnel)</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">g (grammes)</SelectItem>
                  <SelectItem value="mL">mL (millilitres)</SelectItem>
                  <SelectItem value="cc">cc (cuillère à café)</SelectItem>
                  <SelectItem value="cs">cs (cuillère à soupe)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={isAdding || !name.trim()}>
              {isAdding ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
