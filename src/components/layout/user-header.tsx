import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShoppingBag, LogOut, Film, User, Settings, BellRing, Home, Package, Video } from "lucide-react";
import { useLocation } from "wouter";
import { NotificationsCenter } from "@/components/notifications/notifications-center";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Admin email from environment variable or use the default
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ademmsallem782@gmail.com';

export function UserHeader({ userName, showShopButton = true }: { 
  userName: string;
  showShopButton?: boolean;
}) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleDeleteUsers = async () => {
    if (!isAdmin) return;

    const confirmDelete = window.confirm("Are you sure you want to delete all non-admin users? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.rpc('delete_non_admin_users');
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "All non-admin users have been deleted",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete users",
        variant: "destructive",
      });
    }
  };

  // Get first letter of username for avatar fallback
  const nameLetter = userName?.charAt(0).toUpperCase() || 'U';
  const nameWords = userName?.split(' ') || [];
  const initials = nameWords.length > 1 
    ? (nameWords[0].charAt(0) + nameWords[nameWords.length - 1].charAt(0)).toUpperCase()
    : nameLetter;

  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 bg-gradient-to-br from-purple-600 to-blue-600 border-2 border-purple-500/30 icon-hover">
          <AvatarImage src={`https://avatar.vercel.sh/${userName}.png`} />
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, <span className="gradient-heading">{userName}</span>
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsCenter />
        
        <Button
          onClick={() => setLocation("/")}
          variant="ghost"
          className="glass-card button-hover"
        >
          <Home className="h-4 w-4 mr-2 icon-hover" />
          Home
        </Button>
        
        {isAdmin && (
          <Button
            onClick={() => setLocation("/admin/config")}
            variant="ghost"
            className="glass-card button-hover"
          >
            <Settings className="h-4 w-4 mr-2 icon-hover" />
            Admin
          </Button>
        )}
        
        {showShopButton && (
          <Button
            onClick={() => setLocation("/shop")}
            variant="ghost"
            className="glass-card button-hover"
          >
            <ShoppingBag className="h-4 w-4 mr-2 icon-hover" />
            Shop
          </Button>
        )}
        
        <Button
          onClick={() => setLocation("/borrowings")}
          variant="ghost"
          className="glass-card button-hover"
        >
          <Package className="h-4 w-4 mr-2 icon-hover" />
          Borrowings
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => setLocation("/profile")}
          className="glass-card button-hover"
        >
          <User className="h-4 w-4 mr-2 icon-hover" />
          Profile
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="glass-card button-hover"
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-2 icon-hover" />
              Logout
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 