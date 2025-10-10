import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
}

interface Friend {
  id: string;
  friend_profile?: Profile;
}

interface ShareRecipeDialogProps {
  recipeId: string;
  userId: string;
}

export const ShareRecipeDialog = ({ recipeId, userId }: ShareRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadFriendsAndShares();
    }
  }, [open, userId, recipeId]);

  const loadFriendsAndShares = async () => {
    // Load friends
    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select(`
        id,
        friend_profile:profiles!friends_friend_id_fkey(id, email, display_name)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (friendsError) {
      console.error('Error loading friends:', friendsError);
      return;
    }

    setFriends(friendsData || []);

    // Load existing shares for this recipe
    const { data: sharesData, error: sharesError } = await supabase
      .from('shared_recipes')
      .select('shared_with_user_id')
      .eq('recipe_id', recipeId)
      .eq('shared_by_user_id', userId);

    if (sharesError) {
      console.error('Error loading shares:', sharesError);
      return;
    }

    setSelectedFriends(sharesData?.map(s => s.shared_with_user_id) || []);
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      // Get current shares
      const { data: currentShares } = await supabase
        .from('shared_recipes')
        .select('shared_with_user_id')
        .eq('recipe_id', recipeId)
        .eq('shared_by_user_id', userId);

      const currentShareIds = currentShares?.map(s => s.shared_with_user_id) || [];

      // Find friends to add and remove
      const toAdd = selectedFriends.filter(id => !currentShareIds.includes(id));
      const toRemove = currentShareIds.filter(id => !selectedFriends.includes(id));

      // Add new shares
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('shared_recipes')
          .insert(
            toAdd.map(friendId => ({
              recipe_id: recipeId,
              shared_by_user_id: userId,
              shared_with_user_id: friendId,
            }))
          );

        if (insertError) throw insertError;
      }

      // Remove unselected shares
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('shared_recipes')
          .delete()
          .eq('recipe_id', recipeId)
          .eq('shared_by_user_id', userId)
          .in('shared_with_user_id', toRemove);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Recette partagée",
        description: "La recette a été partagée avec vos amis",
      });

      setOpen(false);
    } catch (error) {
      console.error('Error sharing recipe:', error);
      toast({
        title: "Erreur",
        description: "Impossible de partager la recette",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager la recette</DialogTitle>
          <DialogDescription>
            Sélectionnez les amis avec qui vous souhaitez partager cette recette
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Vous n'avez pas encore d'amis. Ajoutez des amis pour partager des recettes !
            </p>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-lg cursor-pointer"
                onClick={() => toggleFriend(friend.friend_profile!.id)}
              >
                <Checkbox
                  checked={selectedFriends.includes(friend.friend_profile!.id)}
                  onCheckedChange={() => toggleFriend(friend.friend_profile!.id)}
                />
                <div className="flex-1">
                  <p className="font-medium">
                    {friend.friend_profile?.display_name || 'Utilisateur'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {friend.friend_profile?.email}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleShare} disabled={loading || friends.length === 0}>
            {loading ? "Partage..." : "Partager"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};