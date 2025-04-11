import { useState, useEffect, MutableRefObject, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Medal, Bird, Home, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

// Logo path needs to be added to your public assets
const CLUB_LOGO = '/assets/av-club-logo.png';

type LeaderboardUser = {
  id: string;
  name: string;
  points: number;
  rank?: number;
  is_admin?: boolean;
  borrowed_items?: Array<{
    item_name: string;
    borrowed_at: string;
    status: string;
  }>;
};

interface LeaderboardProps {
  onRefreshTriggered?: () => void;
  refreshFnRef?: MutableRefObject<(() => void) | null>;
}

type PointAdjustment = {
  value: number;
  label: string;
};

const POINT_ADJUSTMENTS: PointAdjustment[] = [
  { value: -10, label: '-10' },
  { value: -5, label: '-5' },
  { value: -1, label: '-1' },
  { value: 1, label: '+1' },
  { value: 5, label: '+5' },
  { value: 10, label: '+10' },
];

// Get icon based on rank
const getMedalIcon = (rank: number | undefined) => {
  if (!rank) return null;
  
  switch (rank) {
    case 1:
      return <Medal className="h-6 w-6 text-yellow-400 icon-hover animate-bounce" style={{ filter: 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.5))' }} />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-300 icon-hover animate-pulse" style={{ filter: 'drop-shadow(0 0 4px rgba(156, 163, 175, 0.5))' }} />;
    case 3:
      return <Medal className="h-6 w-6 text-amber-600 icon-hover" style={{ filter: 'drop-shadow(0 0 4px rgba(180, 83, 9, 0.5))' }} />;
    default:
      return <Bird className="h-6 w-6 text-sky-400 icon-hover" style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.3))' }} />;
  }
};

// Admin email from environment variable
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function Leaderboard({ onRefreshTriggered, refreshFnRef }: LeaderboardProps = {}) {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPointChange, setLoadingPointChange] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Memoize the current user's ID to prevent unnecessary re-renders
  const currentUserId = useMemo(() => user?.id, [user]);

  // Memoize the users list to prevent unnecessary re-renders
  const memoizedUsers = useMemo(() => users, [users]);

  useEffect(() => {
    fetchUsers();
    
    // Store the fetchUsers function in the ref if provided
    if (refreshFnRef) {
      refreshFnRef.current = fetchUsers;
    }
  }, [refreshFnRef, onRefreshTriggered]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles_with_points')
        .select('*')
        .order('points', { ascending: false });

      if (error) {
        throw error;
      }

      // Use Set to ensure unique users and filter out admin users
      const uniqueUsers = new Set<string>();
      const rankedUsers = data
        .filter(user => {
          if (uniqueUsers.has(user.id) || user.is_admin) {
            return false;
          }
          uniqueUsers.add(user.id);
          return true;
        })
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }));

      setUsers(rankedUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addPoints = async (userId: string, pointsToAdd: number) => {
    if (!user || user.email !== ADMIN_EMAIL) return;

    setLoadingPointChange(userId);
    try {
      console.log(`Attempting to update points for user ${userId} with change ${pointsToAdd}`);
      
      // Use the RPC function instead of direct table updates
      const { error } = await supabase.rpc('add_points_to_user', {
        user_uuid: userId,
        points_to_add: pointsToAdd
      });

      if (error) {
        console.error('Error updating points:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Create notification for the user
      let notificationMessage = '';
      let notificationType = '';

      if (pointsToAdd > 0) {
        notificationMessage = `You've earned ${pointsToAdd} points!`;
        notificationType = 'success';
      } else {
        notificationMessage = `${Math.abs(pointsToAdd)} points have been deducted.`;
        notificationType = 'error';
      }

      // Call the create_notification function
      const { error: notifError } = await supabase
        .rpc('create_notification', {
          user_uuid: userId,
          message: notificationMessage,
          notification_type: notificationType
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }

      // Refresh leaderboard
      fetchUsers();

      toast({
        title: 'Success',
        description: `Points ${pointsToAdd >= 0 ? 'added to' : 'deducted from'} user`,
      });
    } catch (error) {
      console.error('Error updating points:', error);
      toast({
        title: 'Error',
        description: 'Failed to update points',
        variant: 'destructive',
      });
    } finally {
      setLoadingPointChange(null);
    }
  };

  // Add a new function to handle clicking on a user
  const handleUserClick = (userId: string, userName: string) => {
    window.location.href = `/user-profile/${userId}?name=${encodeURIComponent(userName)}`;
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="text-center pb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20"></div>
          <div className="relative z-10">
            <div className="flex flex-col items-center justify-center mb-4">
              <img 
                src={CLUB_LOGO} 
                alt="Audio Visual Club Logo" 
                className="h-32 md:h-40 mb-2 drop-shadow-lg filter brightness-110"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.log('Logo image failed to load. Please add the logo to public/assets/av-club-logo.png');
                }}
              />
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-1">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400">
                Audio Visual Club
              </span>
            </CardTitle>
            <CardDescription className="text-white/60 text-lg">
              Hammam Sousse
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex justify-end mb-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {memoizedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto rounded-full bg-purple-900/20 flex items-center justify-center mb-4">
                    <Camera className="h-10 w-10 text-purple-400/50" />
                  </div>
                  <p className="text-lg font-semibold text-white">No club members yet</p>
                  <p className="text-sm text-white/60 mt-1">Be the first to join!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memoizedUsers.map((leaderboardUser, index) => (
                    <motion.div
                      key={leaderboardUser.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                        leaderboardUser.rank === 1
                          ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/20 border border-purple-500/30'
                          : 'bg-white/5 border border-white/5 hover:border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${
                          leaderboardUser.rank === 1 ? 'bg-purple-900/50' : 'bg-white/10'
                        }`}>
                          {getMedalIcon(leaderboardUser.rank)}
                        </div>
                        <div 
                          className="flex-1 font-medium text-white cursor-pointer hover:text-purple-400 transition-colors"
                          onClick={() => handleUserClick(leaderboardUser.id, leaderboardUser.name)}
                        >
                          <div className="flex items-center">
                            <span>{leaderboardUser.name}</span>
                            {currentUserId === leaderboardUser.id && (
                              <span className="ml-2 text-xs bg-purple-600 px-2 py-0.5 rounded-full">You</span>
                            )}
                            {leaderboardUser.is_admin && (
                              <span className="ml-2 text-xs bg-yellow-600 px-2 py-0.5 rounded-full">Admin</span>
                            )}
                          </div>
                          <div className="flex items-center mt-0.5">
                            <span className="text-sm font-semibold text-purple-400">{leaderboardUser.points}</span>
                            <span className="text-white/60 text-xs ml-1">points</span>
                          </div>
                          {leaderboardUser.borrowed_items && leaderboardUser.borrowed_items.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs text-white/60">Borrowed: </span>
                              {leaderboardUser.borrowed_items.map((item, index) => (
                                <span key={index} className="text-xs bg-blue-900/50 px-2 py-0.5 rounded-full ml-1">
                                  {item.item_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Panel - Only visible to admin */}
      {user?.email === ADMIN_EMAIL && (
        <>
          <Card className="border-0 bg-white/5 backdrop-blur-sm shadow-2xl overflow-hidden rounded-xl">
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-semibold text-purple-400">Admin Controls</CardTitle>
                  <CardDescription className="text-white/60">
                    Manage club member points
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {users.map((leaderboardUser) => (
                  <div key={leaderboardUser.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/20 transition-all duration-300">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-900/20">
                        <span className="text-sm font-bold text-purple-400">
                          {leaderboardUser.rank}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-white">{leaderboardUser.name || 'Anonymous'}</span>
                        <div className="flex items-center mt-0.5">
                          <span className="text-sm font-semibold text-purple-400">{leaderboardUser.points}</span>
                          <span className="text-white/60 text-xs ml-1">points</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POINT_ADJUSTMENTS.map((adjustment) => (
                        <Button
                          key={adjustment.value}
                          size="sm"
                          variant="ghost"
                          className={`px-2 min-w-[42px] transition-all duration-200 ${
                            adjustment.value < 0
                              ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50'
                              : 'border border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50'
                          }`}
                          onClick={() => addPoints(leaderboardUser.id, adjustment.value)}
                          disabled={loadingPointChange === leaderboardUser.id}
                        >
                          {loadingPointChange === leaderboardUser.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            adjustment.label
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}