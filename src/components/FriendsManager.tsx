import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Check, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  friend_profile?: Profile;
  user_profile?: Profile;
}

interface FriendsManagerProps {
  userId: string;
}

export const FriendsManager = ({ userId }: FriendsManagerProps) => {
  const [searchEmail, setSearchEmail] = useState("");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, [userId]);

  const loadFriends = async () => {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:profiles!friends_friend_id_fkey(id, email, display_name)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error loading friends:', error);
      return;
    }

    setFriends(data || []);
  };

  const loadPendingRequests = async () => {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        user_profile:profiles!friends_user_id_fkey(id, email, display_name)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error loading pending requests:', error);
      return;
    }

    setPendingRequests(data || []);
  };

  const sendFriendRequest = async () => {
    if (!searchEmail.trim()) return;

    setLoading(true);
    try {
      // Find user by email
      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', searchEmail.trim())
        .single();

      if (searchError || !profiles) {
        toast({
          title: "Utilisateur non trouvé",
          description: "Aucun utilisateur avec cet email",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (profiles.id === userId) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas vous ajouter vous-même",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Send friend request
      const { error: insertError } = await supabase
        .from('friends')
        .insert({
          user_id: userId,
          friend_id: profiles.id,
          status: 'pending'
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast({
            title: "Demande déjà existante",
            description: "Vous avez déjà envoyé une demande à cet utilisateur",
            variant: "destructive",
          });
        } else {
          throw insertError;
        }
      } else {
        toast({
          title: "Demande envoyée",
          description: "Votre demande d'ami a été envoyée",
        });
        setSearchEmail("");
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    const { error } = await supabase
      .from('friends')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', friendshipId);

    if (error) {
      console.error('Error responding to request:', error);
      toast({
        title: "Erreur",
        description: "Impossible de répondre à la demande",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: accept ? "Ami ajouté" : "Demande refusée",
      description: accept ? "Vous êtes maintenant amis" : "La demande a été refusée",
    });

    loadPendingRequests();
    if (accept) loadFriends();
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('Error removing friend:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer cet ami",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ami retiré",
      description: "L'ami a été retiré de votre liste",
    });

    loadFriends();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Amis
        </CardTitle>
        <CardDescription>
          Gérez vos amis et partagez des recettes avec eux
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">
              Mes amis ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Demandes ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Email de votre ami"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
              />
              <Button 
                onClick={sendFriendRequest} 
                disabled={loading || !searchEmail.trim()}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun ami pour le moment
                </p>
              ) : (
                friends.map((friendship) => (
                  <div
                    key={friendship.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {friendship.friend_profile?.display_name || 'Utilisateur'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {friendship.friend_profile?.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFriend(friendship.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-2">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune demande en attente
              </p>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {request.user_profile?.display_name || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.user_profile?.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => respondToRequest(request.id, true)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => respondToRequest(request.id, false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};