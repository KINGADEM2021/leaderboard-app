import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Settings, ArrowLeft, Save, Upload, Star, Headphones, Film, MusicIcon, Users, Palette, Cog } from "lucide-react";
import { UserHeader } from "@/components/layout/user-header";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";
import { UserManagement } from "@/components/admin/user-management";
import { MeetingControl } from '../components/admin/MeetingControl';

// This should match your admin email from setup
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

type ClubSettings = {
  club_name: string;
  admin_email: string;
  logo_url: string;
  primary_color: string;
  welcome_message: string;
  show_announcements: boolean;
  show_equipment_stats: boolean;
};

// Define tab types
type TabValue = "general" | "appearance" | "features" | "users";

export default function AdminConfigPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tempColor, setTempColor] = useState("");
  const [isColorChanging, setIsColorChanging] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>("general");
  const [settings, setSettings] = useState<ClubSettings>({
    club_name: "Audio Visual Club",
    admin_email: ADMIN_EMAIL || "",
    logo_url: "/assets/av-club-logo.png",
    primary_color: "#8B5CF6", // Purple
    welcome_message: "Welcome to the Audio Visual Club! Earn points by borrowing equipment and completing projects.",
    show_announcements: true,
    show_equipment_stats: true,
  });

  // Initialize temp color from settings
  useEffect(() => {
    if (!tempColor) {
      setTempColor(settings.primary_color);
    }
  }, [settings.primary_color]);

  // Debounce color changes
  useEffect(() => {
    if (!tempColor || tempColor === settings.primary_color) return;
    
    setIsColorChanging(true);
    const timer = setTimeout(() => {
      setSettings(prev => ({
        ...prev,
        primary_color: tempColor
      }));
      setIsColorChanging(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [tempColor, settings.primary_color]);

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
              <Settings className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/60 max-w-md mb-6">
              Only administrators can access club configuration settings.
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

  const handleChange = useCallback((field: keyof ClubSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTempColor(e.target.value);
  }, []);

  // Add actual file upload handler for logo
  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;
    
    try {
      setIsLoading(true);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);
        
      if (publicUrlData && publicUrlData.publicUrl) {
        // Update settings with new logo URL
        handleChange('logo_url', publicUrlData.publicUrl);
        
        toast({
          title: "Logo Uploaded",
          description: "Your club logo has been updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [handleChange, toast]);

  // Make sure primary color changes are actually saved
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real application, save settings to database
      // For now, simulate saving with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actually save the settings to app_settings table
      const { error: saveError } = await supabase
        .from('app_settings')
        .upsert([
          { key: 'club_name', value: settings.club_name },
          { key: 'admin_email', value: settings.admin_email },
          { key: 'primary_color', value: settings.primary_color },
          { key: 'logo_url', value: settings.logo_url },
          { key: 'welcome_message', value: settings.welcome_message },
          { key: 'show_announcements', value: String(settings.show_announcements) },
          { key: 'show_equipment_stats', value: String(settings.show_equipment_stats) },
        ]);
      
      if (saveError) throw saveError;
      
      toast({
        title: "Settings Saved",
        description: "Your club configuration has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = useCallback((value: TabValue) => {
    setActiveTab(value);
  }, []);

  const userName = user.user_metadata?.name || user.email;

  const renderGeneralSettings = () => (
    <Card className="border-0 bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-purple-400">General Settings</CardTitle>
        <CardDescription className="text-white/60">
          Configure basic club information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="club_name" className="text-white">Club Name</Label>
          <Input
            id="club_name"
            value={settings.club_name}
            onChange={(e) => handleChange('club_name', e.target.value)}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin_email" className="text-white">Admin Email</Label>
          <Input
            id="admin_email"
            value={settings.admin_email}
            onChange={(e) => handleChange('admin_email', e.target.value)}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="welcome_message" className="text-white">Welcome Message</Label>
          <Textarea
            id="welcome_message"
            value={settings.welcome_message}
            onChange={(e) => handleChange('welcome_message', e.target.value)}
            className="bg-white/10 border-white/20 text-white min-h-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderAppearanceSettings = () => (
    <Card className="border-0 bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-purple-400">Appearance Settings</CardTitle>
        <CardDescription className="text-white/60">
          Customize how your club looks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="logo_url" className="text-white">Logo URL</Label>
          <div className="flex gap-2">
            <Input
              id="logo_url"
              value={settings.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="bg-white/10 border-white/20 text-white flex-1"
            />
            <div className="relative">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="border-purple-500/30 text-purple-400">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 mt-4 flex justify-center h-[100px] items-center">
            {settings.logo_url && (
              <img 
                key={settings.logo_url}
                src={settings.logo_url} 
                alt="Club Logo Preview" 
                className="h-24 object-contain max-w-full"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/200x200?text=Logo+Preview';
                }}
                loading="eager"
              />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="primary_color" className="text-white">Primary Color</Label>
          <div className="flex gap-2">
            <div 
              className={`w-12 h-12 p-1 rounded-md cursor-pointer border border-white/20 overflow-hidden transition-colors relative ${isColorChanging ? 'ring-2 ring-purple-400' : ''}`}
              style={{ backgroundColor: tempColor }}
            >
              <input
                id="primary_color"
                type="color"
                value={tempColor}
                onChange={handleColorChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <Input
              value={tempColor}
              onChange={handleColorChange}
              className={`bg-white/10 border-white/20 text-white flex-1 transition-colors ${isColorChanging ? 'border-purple-400' : ''}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFeatureSettings = () => (
    <Card className="border-0 bg-white/5 backdrop-blur-sm shadow-xl overflow-hidden rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-purple-400">Feature Settings</CardTitle>
        <CardDescription className="text-white/60">
          Enable or disable club features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-white text-base">Announcements</Label>
            <p className="text-white/60 text-sm">Show announcements on the home page</p>
          </div>
          <Switch
            checked={settings.show_announcements}
            onCheckedChange={(checked) => handleChange('show_announcements', checked)}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-white text-base">Equipment Statistics</Label>
            <p className="text-white/60 text-sm">Show available equipment counts</p>
          </div>
          <Switch
            checked={settings.show_equipment_stats}
            onCheckedChange={(checked) => handleChange('show_equipment_stats', checked)}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={userName} />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="h-6 w-6 mr-3 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Club Configuration</h1>
          </div>
          <Button onClick={() => setLocation("/")} variant="ghost" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        
        {/* Custom Tabs Implementation */}
        <div className="space-y-6">
          <div className="bg-white/5 p-1 rounded-xl grid grid-cols-4 gap-2">
            <button 
              onClick={() => handleTabChange("general")}
              className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                activeTab === "general" 
                  ? "bg-purple-600 text-white" 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Cog className="h-4 w-4 mr-2" />
              General
            </button>
            <button 
              onClick={() => handleTabChange("appearance")}
              className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                activeTab === "appearance" 
                  ? "bg-purple-600 text-white" 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </button>
            <button 
              onClick={() => handleTabChange("features")}
              className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                activeTab === "features" 
                  ? "bg-purple-600 text-white" 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Settings className="h-4 w-4 mr-2" />
              Features
            </button>
            <button 
              onClick={() => handleTabChange("users")}
              className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                activeTab === "users" 
                  ? "bg-purple-600 text-white" 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              User Management
            </button>
          </div>
          
          {/* General Tab Content */}
          {activeTab === "general" && renderGeneralSettings()}
          
          {/* Appearance Tab Content */}
          {activeTab === "appearance" && renderAppearanceSettings()}
          
          {/* Features Tab Content */}
          {activeTab === "features" && renderFeatureSettings()}
          
          {/* Users Tab Content */}
          {activeTab === "users" && <UserManagement />}
        </div>
        
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>

        <div className="mt-8">
          <MeetingControl />
        </div>
      </div>
    </div>
  );
} 