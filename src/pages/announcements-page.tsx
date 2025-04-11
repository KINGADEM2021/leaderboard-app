import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AdminAnnouncementPanel } from "@/components/shop/admin-announcement-panel";
import { UserHeader } from "@/components/layout/user-header";
import { Loader2 } from "lucide-react";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    // Redirect non-admin users
    if (!isAdmin) {
      setLocation("/shop");
    }
  }, [isAdmin, setLocation]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const userName = user?.user_metadata?.name || user?.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={userName || ''} showShopButton={true} />
        
        {/* Page Title */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-800 to-blue-700 mb-8 p-8">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-2 text-white">
              Announcements Management
            </h1>
            <p className="text-xl text-white/80 max-w-2xl">
              Create and manage announcements for the Audio Visual Club members.
            </p>
          </div>
        </div>

        {/* Announcements Panel */}
        <div className="max-w-4xl mx-auto">
          <AdminAnnouncementPanel />
        </div>
      </div>
    </div>
  );
} 