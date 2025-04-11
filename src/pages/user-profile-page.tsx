import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Award, ArrowLeft, User } from "lucide-react";
import { UserHeader } from "@/components/layout/user-header";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation, useRoute } from "wouter";

interface UserProfileData {
  id: string;
  name: string;
  avatar_url?: string;
  interests: string[];
  points: number;
  bio?: string;
  created_at: string;
}

export default function UserProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/user-profile/:id");
  const userId = params?.id;
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get name from URL query parameter
  const urlSearchParams = new URLSearchParams(window.location.search);
  const userName = urlSearchParams.get('name') || 'User';

  console.log("User profile page - userId from params:", userId);
  console.log("User profile page - userName from query:", userName);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        console.error("No userId provided");
        setError('Invalid user ID');
        setLoading(false);
        return;
      }

      // Clean the UUID if it contains extra characters
      let cleanUserId = userId;
      // If it contains slashes, take the last part
      if (userId.includes('/')) {
        cleanUserId = userId.split('/').pop() || userId;
      }
      
      console.log("Fetching profile for user ID:", cleanUserId);

      setLoading(true);
      try {
        // Get user profile from the database
        const { data, error } = await supabase
          .from('profile')
          .select('*, points(points)')
          .eq('user_id', cleanUserId)
          .single();

        console.log("Profile query result:", { data, error });

        if (error) throw error;

        if (!data) {
          throw new Error("No profile data found");
        }

        setProfileData({
          id: data.user_id,
          name: data.name || userName,
          avatar_url: data.avatar_url,
          interests: data.interests || [],
          points: data.points?.points || 0,
          bio: data.bio || 'Audio Visual Club member',
          created_at: data.created_at || new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Error fetching user profile:', error);
        setError(`Could not load this user profile: ${error.message || 'Unknown error'}`);
        
        // Try a fallback query with different casing
        try {
          console.log("Trying fallback query...");
          const { data } = await supabase
            .from('profile')
            .select('*')
            .eq('user_id', cleanUserId.toLowerCase())
            .single();
            
          if (data) {
            console.log("Fallback query success:", data);
            setProfileData({
              id: data.user_id,
              name: data.name || userName,
              avatar_url: data.avatar_url,
              interests: data.interests || [],
              points: 0,
              bio: data.bio || 'Audio Visual Club member',
              created_at: data.created_at || new Date().toISOString(),
            });
            setError(null);
          } else {
            // Create fallback display data
            setProfileData({
              id: cleanUserId,
              name: userName,
              interests: [],
              points: 0,
              bio: 'Audio Visual Club member',
              created_at: new Date().toISOString(),
            });
          }
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          // Keep the original error
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, userName]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const nameWords = name.split(' ');
    if (nameWords.length > 1) {
      return (nameWords[0][0] + nameWords[nameWords.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="mt-4 text-xl font-light">Invalid user profile URL</p>
        <Button onClick={() => setLocation("/")} className="mt-4 bg-purple-600 hover:bg-purple-700">
          Go Home
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="mt-4 text-xl font-light">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={user?.user_metadata?.name || user?.email || 'User'} />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <User className="h-6 w-6 mr-3 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">User Profile</h1>
          </div>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        
        {error ? (
          <Card className="bg-white/5 border-0 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button 
                onClick={() => setLocation("/")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        ) : profileData && (
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-white/5 border-0 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
              <CardHeader className="pb-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <Avatar className="h-16 w-16 md:h-24 md:w-24 border-2 border-purple-400">
                      <AvatarImage src={profileData.avatar_url || `https://avatar.vercel.sh/${profileData.name}.png`} />
                      <AvatarFallback className="bg-purple-600 text-white text-xl">
                        {getInitials(profileData.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{profileData.name}</h2>
                      <p className="text-white/60">Member since {formatDate(profileData.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-lg self-start md:self-auto">
                    <Award className="h-5 w-5 mr-2" />
                    {profileData.points} Points
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileData.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">About</h3>
                    <p className="text-white/80">{profileData.bio}</p>
                  </div>
                )}
                
                {profileData.interests && profileData.interests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.interests.map((interest, index) => (
                        <Badge key={index} className="bg-purple-600/30 text-white hover:bg-purple-500/40">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 