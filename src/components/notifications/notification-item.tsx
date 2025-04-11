import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Check, Bell, AlertCircle, Info, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  related_claim_id?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleMarkAsRead = async () => {
    if (notification.is_read) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("mark_notification_read", {
        notification_uuid: notification.id
      });
      
      if (error) throw error;
      
      onMarkAsRead(notification.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getBgColor = () => {
    if (notification.is_read) return "bg-gray-50";
    
    switch (notification.type) {
      case "success":
        return "bg-green-50";
      case "warning":
        return "bg-yellow-50";
      case "error":
        return "bg-red-50";
      case "info":
      default:
        return "bg-blue-50";
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getBgColor()} transition-colors duration-200 ${notification.is_read ? 'opacity-70' : 'opacity-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="mt-1">
            {getIcon()}
          </div>
          <div>
            <p className="text-sm font-medium">{notification.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        {!notification.is_read && (
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2 h-8 w-8 p-0 rounded-full"
            disabled={isLoading}
            onClick={handleMarkAsRead}
          >
            <Check className="h-4 w-4" />
            <span className="sr-only">Mark as read</span>
          </Button>
        )}
      </div>
    </div>
  );
} 