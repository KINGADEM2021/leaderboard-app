import { useEffect } from "react";
import { useLocation } from "wouter";
import AuthForm from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { Headphones, Camera, Film, Video, Music, Star } from "lucide-react";

// Logo path
const CLUB_LOGO = '/assets/av-club-logo.png';

export default function AuthPage() {
  const { isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Form column */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-black via-gray-900 to-black relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]" />
        </div>
        <div className="w-full max-w-md z-10 bg-black/40 backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-8">
            <img 
              src={CLUB_LOGO} 
              alt="Audio Visual Club" 
              className="h-16 md:h-20"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                // Show fallback text
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const textNode = document.createElement('h1');
                  textNode.className = "text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500";
                  textNode.textContent = "Audio Visual Club";
                  parent.appendChild(textNode);
                }
              }}
            />
          </div>
          <AuthForm />
        </div>
      </div>

      {/* Hero column */}
      <div className="hidden md:flex flex-1 bg-black items-center justify-center p-12">
        <div className="grid grid-cols-2 gap-8 max-w-2xl">
          <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
            <Headphones className="w-12 h-12 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-400">Audio Equipment</h3>
            <p className="text-center text-gray-400">Access professional audio recording and mixing equipment</p>
          </div>
          <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
            <Camera className="w-12 h-12 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-400">Photography</h3>
            <p className="text-center text-gray-400">Professional cameras and photography equipment</p>
          </div>
          <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
            <Film className="w-12 h-12 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-400">Film Making</h3>
            <p className="text-center text-gray-400">Cinema cameras and film production gear</p>
          </div>
          <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
            <Video className="w-12 h-12 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-400">Live Streaming</h3>
            <p className="text-center text-gray-400">Streaming equipment and accessories</p>
          </div>
        </div>
      </div>
    </div>
  );
}
