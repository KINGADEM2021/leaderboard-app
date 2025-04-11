import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, User, Camera, Image, Upload, Calendar, Clock, Settings, ArrowLeft, Save, FileBadge, Award, ShoppingBag, RefreshCcw } from "lucide-react";
import { UserHeader } from "@/components/layout/user-header";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { format } from "date-fns";

// Change the logo reference to a variable that can be updated
const DEFAULT_LOGO = '/assets/av-club-logo.png';

type UserProfile = {
  id: string;
  name: string;
  bio: string;
  interests: string[];
  points: number;
  avatar_url?: string;
  created_at: string;
  email?: string;
};

type BorrowedItem = {
  id: string;
  name: string;
  borrowed_date: string;
  return_date: string;
  status: 'active' | 'returned' | 'overdue';
};

type Activity = {
  id: string;
  type: 'borrow' | 'return' | 'points' | 'event';
  description: string;
  date: string;
  pointsChange?: number;
};

// Define equipment borrowing type
type EquipmentBorrowing = {
  id: string;
  return_date: string;
  purpose: string;
  status: string;
  equipment: {
    name: string;
    type: string;
    description: string;
  };
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    bio: 'Audio Visual Club enthusiast. Love working with cameras and sound equipment.',
    interests: ['Photography', 'Sound Mixing', 'Video Editing'],
    points: 0,
    created_at: new Date().toISOString(),
    email: user?.email || '',
  });
  
  // For tags input
  const [interestsTags, setInterestsTags] = useState<string[]>([]);
  
  // Mock data for borrowed items
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([
    {
      id: '1',
      name: 'Professional Camera',
      borrowed_date: '2023-10-15',
      return_date: '2023-10-22',
      status: 'returned'
    },
    {
      id: '2',
      name: 'Wireless Microphone',
      borrowed_date: '2023-11-05',
      return_date: '2023-11-12',
      status: 'active'
    }
  ]);
  
  // Mock data for activity
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      type: 'borrow',
      description: 'Borrowed Professional Camera',
      date: '2023-10-15',
    },
    {
      id: '2',
      type: 'return',
      description: 'Returned Professional Camera',
      date: '2023-10-20',
    },
    {
      id: '3',
      type: 'points',
      description: 'Completed project: Club promotional video',
      date: '2023-10-25',
      pointsChange: 15
    },
    {
      id: '4',
      type: 'borrow',
      description: 'Borrowed Wireless Microphone',
      date: '2023-11-05',
    }
  ]);

  // Add point balance to profile page
  const [equipment, setEquipment] = useState<EquipmentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);

  const [isUpdating, setIsUpdating] = useState(false);
  const [approvedClaims, setApprovedClaims] = useState<any[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);
  const [meeting, setMeeting] = useState<any>({
    title: '',
    date: '',
    time: '',
    location: '',
  });

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
  
  // Load app settings including logo and upcoming meeting
  const loadAppSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['logo_url', 'club_name']);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const settings: Record<string, string> = {};
        data.forEach(setting => {
          settings[setting.key] = setting.value;
        });
        
        if (settings['logo_url']) {
          setLogoUrl(settings['logo_url']);
        }
      }
      
      // Load upcoming meeting
      const meetingData = await supabase
        .from('announcements')
        .select('*')
        .eq('type', 'event')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (meetingData.data) {
        setMeeting({
          title: meetingData.data.title || 'Club Meeting',
          date: meetingData.data.event_date || '',
          time: meetingData.data.event_time || '',
          location: meetingData.data.location || 'Club Room',
        });
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEquipment();
      fetchUserPoints();
      loadAppSettings();
      
      // Set up real-time subscription for points changes
      const pointsSubscription = supabase
        .channel('profile-points-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'points',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Realtime points change detected in profile:', payload);
            // When points change, reload them
            fetchUserPoints();
          }
        )
        .subscribe((status) => {
          console.log('Profile points subscription status:', status);
        });
        
      // Clean up subscription on unmount
      return () => {
        supabase.removeChannel(pointsSubscription);
      };
    }
  }, [user]);

  // Fetch borrowed equipment
  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment_requests')
        .select(`
          id, 
          return_date, 
          purpose, 
          status,
          equipment:equipment_id (name, type, description)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'approved');
        
      if (error) throw error;
      
      setEquipment(data as any || []);
    } catch (error) {
      console.error('Error fetching borrowed equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your borrowed equipment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      // Get user profile from the database
      const { data, error } = await supabase
        .from('profile')
        .select('*, points(points)')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile({
        id: data.user_id,
        name: data.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Club Member',
        bio: data.bio || 'Audio Visual Club enthusiast. Love working with cameras and sound equipment.',
        interests: data.interests || ['Photography', 'Sound Mixing', 'Video Editing'],
        points: data.points?.points || 0,
        avatar_url: data.avatar_url,
        created_at: data.created_at || new Date().toISOString(),
        email: user?.email,
      });
      
      // Set interest tags
      setInterestsTags(Array.isArray(data.interests) ? data.interests : []);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Use fallback data if fetch fails
      setProfile({
        id: user?.id || '',
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Club Member',
        bio: 'Audio Visual Club enthusiast. Love working with cameras and sound equipment.',
        interests: ['Photography', 'Sound Mixing', 'Video Editing'],
        points: 0,
        created_at: new Date().toISOString(),
        email: user?.email,
      });
      
      // Set default interest tags
      setInterestsTags(['Photography', 'Sound Mixing', 'Video Editing']);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      // Format interests as an array if it's a string
      let interests = interestsTags;
      
      // Update the profile in the database
      const { error } = await supabase
        .from('profile')
        .upsert({ 
          user_id: user.id,
          name: profile.name,
          avatar_url: profile.avatar_url,
          interests: interests,
          bio: profile.bio,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Add this function to fetch approved claims
  const fetchApprovedClaims = async () => {
    if (!user) return;
    
    try {
      setIsLoadingClaims(true);
      
      // Fetch claims with metadata that includes return date
      const { data, error } = await supabase
        .from('claims_with_metadata')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved');
        
      if (error) throw error;
      
      setApprovedClaims(data || []);
    } catch (error) {
      console.error('Error fetching approved claims:', error);
    } finally {
      setIsLoadingClaims(false);
    }
  };

  // Update useEffect to fetch claims
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserPoints();
      fetchApprovedClaims();
    }
  }, [user]);

  // Helper to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No return date';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="mt-4 text-xl font-light">Loading your profile...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'returned': return 'bg-green-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'borrow': return <Camera className="h-4 w-4 text-blue-400" />;
      case 'return': return <ArrowLeft className="h-4 w-4 text-green-400" />;
      case 'points': return <FileBadge className="h-4 w-4 text-purple-400" />;
      case 'event': return <Calendar className="h-4 w-4 text-yellow-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const memberSince = formatDate(profile.created_at);
  const userName = profile.name || user.user_metadata?.name || user.email;
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    const nameWords = name.split(' ');
    if (nameWords.length > 1) {
      return (nameWords[0][0] + nameWords[nameWords.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={profile.name || 'User'} />
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm">
              <Award className="h-4 w-4 mr-2" />
              {userPoints} Points
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {/* Profile Card */}
            <Card className="bg-white/5 border-0 backdrop-blur-sm shadow-2xl overflow-hidden rounded-xl mb-6">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold text-white">{profile.name || 'Update your profile'}</CardTitle>
                    <CardDescription className="text-white/60">
                      {profile.email}
                    </CardDescription>
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="bg-purple-700 text-white">
                      {profile.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Name</Label>
                    <Input
                      id="name"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url" className="text-white">Avatar URL</Label>
                    <Input
                      id="avatar_url"
                      value={profile.avatar_url || ''}
                      onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="interests" className="text-white">Interests</Label>
                    <Input
                      id="interests"
                      value={interestsTags.join(', ')}
                      onChange={(e) => setInterestsTags(e.target.value.split(',').map(tag => tag.trim()))}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Photography, Sound Mixing, Video Editing"
                    />
                    <p className="text-xs text-white/50">Separate interests with commas</p>
                  </div>
                  
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={isUpdating}
                    type="submit"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Club Meeting Card */}
            <Card className="bg-white/5 border-0 backdrop-blur-sm shadow-2xl overflow-hidden rounded-xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-bold text-white">Next Club Meeting</CardTitle>
                    <CardDescription className="text-white/60">
                      Upcoming events
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {meeting.date ? (
                  <div className="bg-white/10 rounded-lg p-4">
                    <h3 className="font-semibold text-xl text-white mb-2">{meeting.title}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-white/70">
                        <Calendar className="h-4 w-4 mr-2 text-purple-400" />
                        <span>{formatMeetingDateTime()}</span>
                      </div>
                      {meeting.location && (
                        <div className="flex items-center text-white/70">
                          <Image className="h-4 w-4 mr-2 text-purple-400" />
                          <span>{meeting.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="h-12 w-12 mx-auto text-white/20 mb-3" />
                    <p className="text-white/60">No upcoming meetings scheduled.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            {/* Borrowed Items Section */}
            <Card className="bg-white/5 border-0 backdrop-blur-sm shadow-2xl overflow-hidden rounded-xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-bold text-white">My Borrowed Items</CardTitle>
                    <CardDescription className="text-white/60">
                      Items you've borrowed from the shop
                    </CardDescription>
                  </div>
                  <div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={fetchApprovedClaims} 
                      className="text-white hover:bg-white/10"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingClaims ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                    <p className="text-white/60">Loading borrowed items...</p>
                  </div>
                ) : approvedClaims.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="h-8 w-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Borrowed Items</h3>
                    <p className="text-white/60 max-w-md mx-auto">
                      You haven't borrowed any items from the shop yet. Visit the shop to browse available items.
                    </p>
                    <Button 
                      className="mt-4 bg-purple-600 hover:bg-purple-700"
                      onClick={() => window.location.href = '/shop'}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Browse Shop
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedClaims.slice(0, 2).map(claim => (
                      <div key={claim.id} className="bg-white/10 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <ShoppingBag className="h-5 w-5 mr-2 text-purple-400" />
                            <h3 className="font-semibold text-white">Claim #{claim.id.substring(0, 8)}</h3>
                          </div>
                          <Badge className="bg-green-600">Approved</Badge>
                        </div>
                        
                        <div className="pl-7 space-y-2">
                          <div className="text-sm text-white/70">
                            <span className="font-semibold text-white/90">Borrowed On:</span> {new Date(claim.created_at).toLocaleDateString()}
                          </div>
                          
                          <div className="text-sm text-white/70">
                            <span className="font-semibold text-white/90">Return By:</span> {formatDate(claim.return_date)}
                          </div>
                          
                          <div className="mt-2">
                            <h4 className="font-semibold text-white/90 mb-1">Items:</h4>
                            <ul className="text-sm space-y-1">
                              {claim.items && claim.items.map((item: any, index: number) => (
                                <li key={index} className="flex items-center">
                                  <div className="h-1.5 w-1.5 rounded-full bg-purple-400 mr-2"></div>
                                  <span>{item.item.name}</span>
                                  {item.quantity > 1 && <span className="text-white/50 ml-1">x{item.quantity}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {approvedClaims.length > 2 && (
                      <div className="text-center pt-2">
                        <Button 
                          variant="outline" 
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          onClick={() => window.location.href = '/borrowings'}
                        >
                          View All {approvedClaims.length} Borrowings
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 