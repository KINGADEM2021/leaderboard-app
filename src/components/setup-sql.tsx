import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// SQL to create notifications table
const CREATE_NOTIFICATIONS_TABLE = `
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  related_claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow admin to create notifications for any user
CREATE POLICY "Admin can create notifications" ON notifications
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM app_settings 
    WHERE key = 'admin_email' 
    AND value = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));

-- Grant necessary permissions
GRANT ALL ON notifications TO authenticated;

-- Create function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id UUID,
  notification_message TEXT,
  notification_type TEXT DEFAULT 'info',
  claim_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, message, type, related_claim_id)
  VALUES (target_user_id, notification_message, notification_type, claim_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET is_read = TRUE
  WHERE id = notification_uuid AND user_id = auth.uid();
END;
$$;

-- Create function to handle claim status updates and send notifications
CREATE OR REPLACE FUNCTION update_claim_status_with_notification(
  claim_uuid UUID,
  new_status TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_user_id UUID;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Get the user_id for the claim
  SELECT user_id INTO claim_user_id FROM claims WHERE id = claim_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;
  
  -- Update the claim status
  UPDATE claims SET status = new_status WHERE id = claim_uuid;
  
  -- Create appropriate notification message based on status
  IF new_status = 'approved' THEN
    notification_message := 'Your claim request has been approved!';
    notification_type := 'success';
  ELSIF new_status = 'rejected' THEN
    notification_message := 'Your claim request has been rejected.';
    notification_type := 'error';
  ELSE
    notification_message := 'Your claim status has been updated to ' || new_status;
    notification_type := 'info';
  END IF;
  
  -- Create the notification
  PERFORM create_notification(
    claim_user_id,
    notification_message,
    notification_type,
    claim_uuid
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION update_claim_status_with_notification TO authenticated;
`;

const ADMIN_EMAIL = 'ademmsallem782@gmail.com';

export default function SetupNotificationsTable() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const runSetup = async () => {
    if (!user || user.email !== ADMIN_EMAIL) {
      toast({
        title: "Access Denied",
        description: "Only the admin can run the setup.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Log the SQL for the admin to run manually in Supabase SQL Editor
      console.log("Please run this SQL statement in your Supabase SQL Editor:");
      console.log(CREATE_NOTIFICATIONS_TABLE);
      
      // Call the server-side endpoint to initialize the database
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail: user.email,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Server endpoint failed. Please run the SQL manually.');
      }
      
      toast({
        title: "Notification System Setup",
        description: "The SQL statements have been logged to the console. Please run them in your Supabase SQL Editor.",
        variant: "destructive",
      });
      
      toast({
        title: "Manual Action Required",
        description: "After running the SQL, refresh the page to use the notifications system.",
      });
    } catch (error: any) {
      console.error('Setup error:', error);
      console.log("Please run this SQL statement in your Supabase SQL Editor:");
      console.log(CREATE_NOTIFICATIONS_TABLE);
      
      toast({
        title: "Setup Failed",
        description: `${error.message}. SQL statement has been logged to the console for manual execution.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Only render for admin users
  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <Card className="glass-card border-blue-500/30">
      <CardHeader>
        <CardTitle className="text-blue-500">Notifications Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to set up the notifications system table and functions.
          </p>
          <Button 
            onClick={runSetup} 
            disabled={loading}
            className="w-full bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Run Notifications Setup"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 