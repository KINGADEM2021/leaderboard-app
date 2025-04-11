import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Headphones, BellRing, Video } from "lucide-react";
import Leaderboard from "@/components/leaderboard/leaderboard";
import { UserHeader } from "@/components/layout/user-header";
import { getAnnouncements, getEquipment, getEquipmentAsync, getMeeting } from "@/lib/storage";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type LeaderboardUser = {
  id: string;
  name: string;
  points: number;
  rank: number;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'event' | 'alert';
};

type Equipment = {
  id: string;
  name: string;
  count: number;
};

export default function HomePage() {
  const { user } = useAuth();
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [meeting, setMeeting] = useState(getMeeting());
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [borrowedItems, setBorrowedItems] = useState<number>(0);
  const [userName, setUserName] = useState("");
  
  // Total equipment count
  const totalEquipment = equipment.reduce((total, item) => total + item.count, 0);
  
  // Format meeting date and time
  const formatMeetingDateTime = () => {
    if (!meeting.date || !meeting.time) {
      return "Not scheduled";
    }
    
    try {
      const [hours, minutes] = meeting.time.split(':');
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(parseInt(hours), parseInt(minutes));
      
      return format(meetingDate, "EEEE, h:mm a");
    } catch (error) {
      console.error('Error formatting meeting date:', error);
      return `${meeting.date} at ${meeting.time}`;
    }
  };
  
  // Load user points
  const fetchUserPoints = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('fetch_user_points', {
        user_uuid: user.id
      });
      
      if (error) throw error;
      setUserPoints(data || 0);
    } catch (error) {
      console.error('Error fetching user points:', error);
    }
  };
  
  // Load announcements from Supabase
  const loadAnnouncements = async () => {
    try {
      const announcementsData = await getAnnouncements();
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };
  
  // Load equipment from Supabase
  const loadEquipment = async () => {
    try {
      const equipmentData = await getEquipmentAsync();
      setEquipment(equipmentData);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch count of borrowed items
  const fetchBorrowedItems = async () => {
    if (!user) return;
    
    try {
      // Get count of approved claims
      const { data, error } = await supabase
        .from('claims_with_metadata')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved');
        
      if (error) throw error;
      
      setBorrowedItems(data?.length || 0);
    } catch (error) {
      console.error('Error fetching borrowed items count:', error);
      setBorrowedItems(0);
    }
  };

  // Refresh club info when component mounts or when localStorage might have changed
  useEffect(() => {
    loadAnnouncements();
    loadEquipment();
    fetchUserPoints();
    fetchBorrowedItems();
    
    const handleStorageChange = () => {
      setMeeting(getMeeting());
    };
    
    handleStorageChange();
    
    // Set up real-time subscription for announcements
    const announcementsSubscription = supabase
      .channel('announcements-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcements' 
        }, 
        (payload) => {
          console.log('Realtime announcement change detected:', payload);
          // When announcements change, reload them
          loadAnnouncements();
        }
      )
      .subscribe((status) => {
        console.log('Announcements subscription status:', status);
      });
    
    // Set up real-time subscription for equipment
    const equipmentSubscription = supabase
      .channel('equipment-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'equipment_stats' 
        }, 
        (payload) => {
          console.log('Realtime equipment change detected:', payload);
          // When equipment changes, reload them
          loadEquipment();
        }
      )
      .subscribe((status) => {
        console.log('Equipment subscription status:', status);
      });
    
    // Set up real-time subscription for points changes
    const pointsSubscription = supabase
      .channel('points-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'points',
          filter: `user_id=eq.${user?.id}`
        }, 
        (payload) => {
          console.log('Realtime points change detected:', payload);
          // When points change, reload them
          fetchUserPoints();
        }
      )
      .subscribe((status) => {
        console.log('Points subscription status:', status);
      });
    
    // Set up real-time subscription for claims changes
    const claimsSubscription = supabase
      .channel('claims-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'claims',
          filter: `user_id=eq.${user?.id}`
        }, 
        (payload) => {
          console.log('Realtime claims change detected:', payload);
          // When claims change, reload borrowed items count
          fetchBorrowedItems();
        }
      )
      .subscribe((status) => {
        console.log('Claims subscription status:', status);
      });
      
    // Check for other updates every 5 seconds for non-Supabase data
    const interval = setInterval(handleStorageChange, 5000);
    
    // Clean up subscriptions and intervals on unmount
    return () => {
      clearInterval(interval);
      supabase.removeChannel(announcementsSubscription);
      supabase.removeChannel(equipmentSubscription);
      supabase.removeChannel(pointsSubscription);
      supabase.removeChannel(claimsSubscription);
    };
  }, [user]);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        setUserName(data?.name || user.email?.split('@')[0] || 'User');
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName(user.email?.split('@')[0] || 'User');
      }
    };

    fetchUserName();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="mt-4 text-xl font-light">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={userName} />
        
        <div className="mb-8 flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-purple-900/30 p-3 rounded-xl">
                  <Video className="h-8 w-8 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Audio Visual Club</h2>
                  <p className="text-white/60">Member dashboard</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">My Borrowed Items</p>
                  <p className="text-2xl font-bold text-white">{borrowedItems > 0 ? `${borrowedItems} Items` : 'No items'}</p>
                  <Button 
                    variant="link" 
                    className="text-purple-400 p-0 mt-2 h-auto" 
                    onClick={() => window.location.href = '/borrowings'}
                  >
                    View My Borrowings
                  </Button>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">Available Points</p>
                  <p className="text-2xl font-bold text-white">{userPoints} Points</p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">Next Club Meeting</p>
                  <p className="text-2xl font-bold text-white">
                    {meeting.title ? (
                      <>
                        {formatMeetingDateTime()}
                        {meeting.location && <span className="block text-base font-normal text-white/70">{meeting.location}</span>}
                      </>
                    ) : (
                      "Not scheduled"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:w-2/3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 h-full">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-blue-900/30 p-3 rounded-xl">
                  <BellRing className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Announcements</h2>
                  <p className="text-white/60">Latest club news</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <p className="text-lg text-white/70">No announcements available</p>
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div key={announcement.id} className="bg-white/5 rounded-lg p-4">
                      <p className={`text-sm mb-1 ${
                        announcement.type === 'news' ? 'text-blue-400' :
                        announcement.type === 'event' ? 'text-purple-400' :
                        'text-amber-400'
                      }`}>
                        {announcement.title}
                      </p>
                      <p className="text-lg text-white">{announcement.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <Leaderboard />
      </div>
    </div>
  );
}
