import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, BellRing, Camera, Calendar, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { UserHeader } from "@/components/layout/user-header";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Announcement, Equipment, Meeting, 
  getAnnouncements, getEquipment, getMeeting,
  saveAnnouncements, saveEquipment, saveMeeting
} from "@/lib/storage";

// This should match your admin email from setup
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function AnnouncementsConfigPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // State for club info
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [meeting, setMeeting] = useState<Meeting>({
    id: '1',
    title: '',
    date: '',
    time: '',
    location: ''
  });
  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading announcements in config page');
        const announcementsData = await getAnnouncements();
        setAnnouncements(announcementsData);
        
        // Initialize equipment as an array
        const equipmentData = getEquipment();
        setEquipment(Array.isArray(equipmentData) ? equipmentData : []);
        
        setMeeting(getMeeting());
      } catch (error) {
        console.error('Error loading announcements:', error);
        toast({
          title: "Error",
          description: "Failed to load announcements. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Set up real-time subscription for announcements
    const announcementsSubscription = supabase
      .channel('admin-announcements-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcements' 
        }, 
        async (payload) => {
          console.log('Realtime announcement change detected in admin page:', payload);
          // When announcements change, reload them
          try {
            const updatedAnnouncements = await getAnnouncements();
            setAnnouncements(updatedAnnouncements);
          } catch (error) {
            console.error('Error reloading announcements:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Admin announcements subscription status:', status);
      });
      
    return () => {
      supabase.removeChannel(announcementsSubscription);
    };
  }, [toast]);
  
  // New announcement form
  const [newAnnouncement, setNewAnnouncement] = useState<Omit<Announcement, 'id'>>({
    title: '',
    content: '',
    type: 'news'
  });
  
  // New equipment form
  const [newEquipment, setNewEquipment] = useState<Omit<Equipment, 'id'>>({
    name: '',
    count: 0,
    type: 'camera',
    description: ''
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="mt-4 text-xl font-light">Loading your profile...</p>
      </div>
    );
  }

  // Check if user is admin
  const isAdmin = user.email === ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <div className="container mx-auto py-8 px-4">
          <UserHeader userName={user.user_metadata?.name || user.email} />
          
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <BellRing className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/60 max-w-md mb-6">
              Only administrators can configure announcements and club information.
            </p>
            <Button onClick={() => setLocation("/")} className="bg-purple-600 hover:bg-purple-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      saveAnnouncements(announcements);
      saveEquipment(equipment);
      saveMeeting(meeting);
      
      toast({
        title: "Changes Saved",
        description: "Your club information has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    
    setIsSaving(true);
    
    try {
      const newAnnouncementWithId = {
        id: Date.now().toString(),
        ...newAnnouncement
      };
      
      console.log('Adding new announcement:', newAnnouncementWithId);
      
      // Add to state optimistically
      const updatedAnnouncements = [...announcements, newAnnouncementWithId];
      setAnnouncements(updatedAnnouncements);
      
      // Save to Supabase through storage function
      console.log('Saving updated announcements to Supabase:', updatedAnnouncements);
      
      try {
        await saveAnnouncements(updatedAnnouncements);
        
        // Reset form after successful save
        setNewAnnouncement({
          title: '',
          content: '',
          type: 'news'
        });
        
        toast({
          title: "Announcement Added",
          description: "Your announcement has been added successfully.",
        });
      } catch (saveError: any) {
        console.error('Error from saveAnnouncements:', saveError);
        
        // More detailed error message based on the error
        let errorMessage = "Failed to add announcement. Please try again.";
        if (saveError?.message) {
          errorMessage += ` Error: ${saveError.message}`;
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        
        // Revert optimistic update
        const reloadedAnnouncements = await getAnnouncements();
        setAnnouncements(reloadedAnnouncements);
      }
    } catch (error) {
      console.error('Unexpected error adding announcement:', error);
      
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      
      // Try to reload announcements
      try {
        const reloadedAnnouncements = await getAnnouncements();
        setAnnouncements(reloadedAnnouncements);
      } catch (reloadError) {
        console.error('Error reloading announcements after failed add:', reloadError);
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const removeAnnouncement = async (id: string) => {
    setIsSaving(true);
    
    try {
      console.log('Removing announcement with id:', id);
      
      // Remove optimistically from state
      const updatedAnnouncements = announcements.filter(a => a.id !== id);
      setAnnouncements(updatedAnnouncements);
      
      // Save to Supabase through storage function
      await saveAnnouncements(updatedAnnouncements);
      
      toast({
        title: "Announcement Removed",
        description: "The announcement has been removed.",
      });
    } catch (error) {
      console.error('Error removing announcement:', error);
      toast({
        title: "Error",
        description: "Failed to remove announcement. Please try again.",
        variant: "destructive",
      });
      
      // Revert optimistic update
      try {
        const reloadedAnnouncements = await getAnnouncements();
        setAnnouncements(reloadedAnnouncements);
      } catch (reloadError) {
        console.error('Error reloading announcements after failed remove:', reloadError);
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const addEquipment = () => {
    if (!newEquipment.name || newEquipment.count <= 0) return;
    
    const updatedEquipment = [
      ...equipment,
      {
        id: Date.now().toString(),
        ...newEquipment
      }
    ];
    
    setEquipment(updatedEquipment);
    saveEquipment(updatedEquipment);
    
    setNewEquipment({
      name: '',
      count: 0,
      type: 'camera',
      description: ''
    });
    
    toast({
      title: "Equipment Added",
      description: "The equipment has been added successfully.",
    });
  };
  
  const removeEquipment = (id: string) => {
    const updatedEquipment = equipment.filter(e => e.id !== id);
    setEquipment(updatedEquipment);
    saveEquipment(updatedEquipment);
    
    toast({
      title: "Equipment Removed",
      description: "The equipment has been removed.",
    });
  };
  
  const updateMeeting = (field: keyof Meeting, value: string) => {
    const updatedMeeting = { ...meeting, [field]: value };
    setMeeting(updatedMeeting);
  };

  const userName = user.user_metadata?.name || user.email;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <div className="container mx-auto py-8 px-4">
          <UserHeader userName={userName} />
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={userName} />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BellRing className="h-6 w-6 mr-3 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Club Information</h1>
          </div>
          <Button onClick={() => setLocation("/")} variant="ghost" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        
        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList className="bg-white/5 p-1 rounded-xl grid grid-cols-3 gap-2">
            <TabsTrigger value="announcements" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg">
              <BellRing className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="equipment" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg">
              <Camera className="h-4 w-4 mr-2" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="meetings" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg">
              <Calendar className="h-4 w-4 mr-2" />
              Club Meetings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="announcements" className="space-y-6">
            <Card className="border-0 bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-purple-400">Announcements</CardTitle>
                <CardDescription className="text-white/60">
                  Manage announcements displayed on the home page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <motion.div 
                      key={announcement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-between items-start p-4 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm px-2 py-0.5 rounded-full ${
                            announcement.type === 'news' ? 'bg-blue-500/20 text-blue-300' :
                            announcement.type === 'event' ? 'bg-purple-500/20 text-purple-300' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                          </span>
                          <h3 className="font-medium text-white">{announcement.title}</h3>
                        </div>
                        <p className="text-white/70 text-sm">{announcement.content}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => removeAnnouncement(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <h3 className="font-medium text-white mb-3">Add New Announcement</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <Label htmlFor="title" className="text-white mb-2">Title</Label>
                        <Input
                          id="title"
                          value={newAnnouncement.title}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Announcement Title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type" className="text-white mb-2">Type</Label>
                        <Select 
                          value={newAnnouncement.type}
                          onValueChange={(value: any) => setNewAnnouncement({...newAnnouncement, type: value})}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="alert">Alert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="content" className="text-white mb-2">Content</Label>
                      <Textarea
                        id="content"
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                        className="bg-white/10 border-white/20 text-white min-h-[100px]"
                        placeholder="Announcement content..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        onClick={addAnnouncement}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Announcement
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="equipment" className="space-y-6">
            <Card className="border-0 bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-purple-400">Equipment Stats</CardTitle>
                <CardDescription className="text-white/60">
                  Manage equipment statistics shown on the home page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.isArray(equipment) && equipment.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.type === 'audio' ? 'bg-blue-500/20' :
                          item.type === 'video' ? 'bg-purple-500/20' :
                          item.type === 'lighting' ? 'bg-amber-500/20' : 'bg-gray-500/20'
                        }`}>
                          <Camera className="h-5 w-5 text-white/80" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{item.name}</h3>
                          <p className="text-white/70 text-sm">{item.count} available</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => removeEquipment(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <h3 className="font-medium text-white mb-3">Add New Equipment</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-white mb-2">Name</Label>
                        <Input
                          id="name"
                          value={newEquipment.name}
                          onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Equipment Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="count" className="text-white mb-2">Count</Label>
                        <Input
                          id="count"
                          type="number"
                          min="1"
                          value={newEquipment.count.toString()}
                          onChange={(e) => setNewEquipment({...newEquipment, count: parseInt(e.target.value) || 0})}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Quantity"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type" className="text-white mb-2">Type</Label>
                        <Select 
                          value={newEquipment.type}
                          onValueChange={(value: any) => setNewEquipment({...newEquipment, type: value})}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="lighting">Lighting</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        onClick={addEquipment}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Equipment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="meetings" className="space-y-6">
            <Card className="border-0 bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-purple-400">Club Meetings</CardTitle>
                <CardDescription className="text-white/60">
                  Configure the next club meeting information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="meetingTitle" className="text-white mb-2">Meeting Title</Label>
                      <Input
                        id="meetingTitle"
                        value={meeting.title}
                        onChange={(e) => updateMeeting('title', e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meetingLocation" className="text-white mb-2">Location</Label>
                      <Input
                        id="meetingLocation"
                        value={meeting.location}
                        onChange={(e) => updateMeeting('location', e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meetingDate" className="text-white mb-2">Date</Label>
                      <Input
                        id="meetingDate"
                        type="date"
                        value={meeting.date}
                        onChange={(e) => updateMeeting('date', e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meetingTime" className="text-white mb-2">Time</Label>
                      <Input
                        id="meetingTime"
                        type="time"
                        value={meeting.time}
                        onChange={(e) => updateMeeting('time', e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={saveChanges} 
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
} 