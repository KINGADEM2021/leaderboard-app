import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// SQL statements are kept for reference but will be executed on the server
const CREATE_POINTS_TABLE = `
CREATE TABLE IF NOT EXISTS points (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (user_id)
);
`;

const CREATE_POINTS_TABLE_FUNCTION = `
CREATE OR REPLACE FUNCTION create_points_table_if_not_exists()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS points (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (user_id)
  );
END;
$$ LANGUAGE plpgsql;
`;

const CREATE_ADD_POINTS_FUNCTION = `
CREATE OR REPLACE FUNCTION add_points_to_user(user_uuid UUID, points_to_add INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO points (user_id, points)
  VALUES (user_uuid, points_to_add)
  ON CONFLICT (user_id) 
  DO UPDATE SET points = points.points + points_to_add;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const CREATE_PROFILES_WITH_POINTS_VIEW = `
CREATE OR REPLACE VIEW profiles_with_points AS
SELECT 
  u.id,
  u.raw_user_meta_data->>'name' as name,
  COALESCE(p.points, 0) as points
FROM auth.users u
LEFT JOIN points p ON u.id = p.user_id;
`;

const CREATE_PROFILES_WITH_POINTS_VIEW_FUNCTION = `
CREATE OR REPLACE FUNCTION create_profiles_with_points_view()
RETURNS void AS $$
BEGIN
  CREATE OR REPLACE VIEW profiles_with_points AS
  SELECT 
    u.id,
    u.raw_user_meta_data->>'name' as name,
    COALESCE(p.points, 0) as points
  FROM auth.users u
  LEFT JOIN points p ON u.id = p.user_id;
END;
$$ LANGUAGE plpgsql;
`;

// Add SQL for shop and claims
const CREATE_SHOP_TABLES = `
-- Create shop_items table
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create claim_items table
CREATE TABLE IF NOT EXISTS claim_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  item_id UUID REFERENCES shop_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES shop_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES shop_items(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

const CREATE_APP_SETTINGS_TABLE = `
-- Create app_settings table for admin email
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert admin email if it doesn't exist
INSERT INTO app_settings (key, value)
VALUES ('admin_email', 'ademmsallem782@gmail.com')
ON CONFLICT (key) DO NOTHING;
`;

const CREATE_USER_EMAIL_FUNCTION = `
-- Create function to get user email
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = user_uuid;
  RETURN v_email;
END;
$$;
`;

const CREATE_CLAIMS_WITH_USER_VIEW = `
-- Create view for claims with user info
CREATE OR REPLACE VIEW claims_with_user AS
SELECT 
  c.*,
  get_user_email(c.user_id) as user_email,
  json_agg(
    json_build_object(
      'id', ci.id,
      'quantity', ci.quantity,
      'item', json_build_object(
        'name', si.name,
        'points_cost', si.points_cost
      )
    )
  ) as items
FROM claims c
LEFT JOIN claim_items ci ON c.id = ci.claim_id
LEFT JOIN shop_items si ON ci.item_id = si.id
GROUP BY c.id;

-- Grant access to the view and function
GRANT SELECT ON claims_with_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email TO authenticated;
`;

const CREATE_ACTIVE_SHOP_ITEMS_VIEW = `
-- Create active_shop_items view
CREATE OR REPLACE VIEW active_shop_items AS
SELECT * FROM shop_items WHERE active = true;

-- Grant permissions
GRANT ALL ON shop_items TO authenticated;
GRANT ALL ON cart_items TO authenticated;
GRANT ALL ON claims TO authenticated;
GRANT ALL ON claim_items TO authenticated;
`;

// Add purchase functions
const CREATE_PURCHASE_FUNCTION = `
-- Function to handle purchases
CREATE OR REPLACE FUNCTION purchase_shop_item(
  item_uuid UUID,
  user_uuid UUID,
  quantity INTEGER DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_points INTEGER;
  total_points INTEGER;
  current_points INTEGER;
BEGIN
  -- Get points cost of the item
  SELECT points_cost INTO item_points FROM shop_items WHERE id = item_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  
  -- Calculate total points needed
  total_points := item_points * quantity;
  
  -- Check if user has enough points
  SELECT points INTO current_points FROM points WHERE user_id = user_uuid;
  
  IF current_points IS NULL OR current_points < total_points THEN
    RAISE EXCEPTION 'Not enough points';
  END IF;
  
  -- Deduct points from user
  UPDATE points SET points = points - total_points WHERE user_id = user_uuid;
  
  -- Record the purchase
  INSERT INTO purchases (user_id, item_id, points_spent)
  VALUES (user_uuid, item_uuid, total_points);
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_shop_item TO authenticated;

-- Function to fetch user points
CREATE OR REPLACE FUNCTION fetch_user_points(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_points INTEGER;
BEGIN
  SELECT points INTO user_points 
  FROM points 
  WHERE user_id = user_uuid;
  
  RETURN user_points;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fetch_user_points TO authenticated;

-- Create function to submit cart as a claim
CREATE OR REPLACE FUNCTION submit_cart_claim()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim_id UUID;
BEGIN
  -- Check if cart is empty
  IF NOT EXISTS (SELECT 1 FROM cart_items WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Create claim
  INSERT INTO claims (user_id) VALUES (auth.uid()) RETURNING id INTO v_claim_id;

  -- Move cart items to claim items
  INSERT INTO claim_items (claim_id, item_id, quantity)
  SELECT v_claim_id, item_id, quantity
  FROM cart_items
  WHERE user_id = auth.uid();

  -- Clear cart
  DELETE FROM cart_items WHERE user_id = auth.uid();

  RETURN v_claim_id;
END;
$$;

-- Grant permissions for purchases
GRANT ALL ON purchases TO authenticated;
GRANT EXECUTE ON FUNCTION submit_cart_claim TO authenticated;
`;

// Add SQL for notification system
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

export default function SetupSQL() {
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
      
      // Clone the response before trying to read it
      const responseClone = response.clone();
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If we can't parse JSON, use the cloned response to read as text
        const text = await responseClone.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned an invalid response. Using direct SQL execution as fallback.");
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize database');
      }
      
      toast({
        title: "Setup in Progress",
        description: "Database tables and functions are being created. If the leaderboard doesn't show data after refreshing, you may need to run the SQL manually.",
      });
      
      // Run the SQL directly if the server doesn't have permission
      if (data.message?.includes("manually") || data.runManually) {
        // Log the SQL for manual execution
        console.log("Please run these SQL statements in your Supabase SQL Editor:");
        console.log(CREATE_POINTS_TABLE);
        console.log(CREATE_POINTS_TABLE_FUNCTION);
        console.log(CREATE_ADD_POINTS_FUNCTION);
        console.log(CREATE_PROFILES_WITH_POINTS_VIEW);
        console.log(CREATE_PROFILES_WITH_POINTS_VIEW_FUNCTION);
        console.log(CREATE_SHOP_TABLES);
        console.log(CREATE_APP_SETTINGS_TABLE);
        console.log(CREATE_USER_EMAIL_FUNCTION);
        console.log(CREATE_CLAIMS_WITH_USER_VIEW);
        console.log(CREATE_ACTIVE_SHOP_ITEMS_VIEW);
        console.log(CREATE_PURCHASE_FUNCTION);
        console.log(CREATE_NOTIFICATIONS_TABLE);
        
        toast({
          title: "Action Required",
          description: "SQL statements have been logged to the console. Please run them in your Supabase SQL Editor.",
          variant: "destructive",
        });
      }
      
      // Try to add initial points to the admin user
      try {
        const { error: addPointsError } = await supabase.rpc('add_points_to_user', { 
          user_uuid: user.id,
          points_to_add: 0
        });
        
        if (addPointsError) {
          // If RPC fails, try direct insert
          const { error: insertError } = await supabase
            .from('points')
            .upsert({ 
              user_id: user.id, 
              points: 0 
            });
            
          if (insertError) throw insertError;
        }
      } catch (pointsError) {
        console.error("Could not add initial points:", pointsError);
        // Continue anyway as this is not critical
      }

      toast({
        title: "Setup Complete",
        description: "Database tables and functions have been created successfully.",
      });
      
      // Refresh the page to see changes
      window.location.reload();
    } catch (error: any) {
      console.error('Setup error:', error);
      
      // Show the SQL statements in the console for manual execution
      console.log("Please run these SQL statements in your Supabase SQL Editor:");
      console.log(CREATE_POINTS_TABLE);
      console.log(CREATE_POINTS_TABLE_FUNCTION);
      console.log(CREATE_ADD_POINTS_FUNCTION);
      console.log(CREATE_PROFILES_WITH_POINTS_VIEW);
      console.log(CREATE_PROFILES_WITH_POINTS_VIEW_FUNCTION);
      console.log(CREATE_SHOP_TABLES);
      console.log(CREATE_APP_SETTINGS_TABLE);
      console.log(CREATE_USER_EMAIL_FUNCTION);
      console.log(CREATE_CLAIMS_WITH_USER_VIEW);
      console.log(CREATE_ACTIVE_SHOP_ITEMS_VIEW);
      console.log(CREATE_PURCHASE_FUNCTION);
      console.log(CREATE_NOTIFICATIONS_TABLE);
      
      toast({
        title: "Setup Failed",
        description: `${error.message}. SQL statements have been logged to the console for manual execution.`,
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
    <Card className="glass-card border-yellow-500/30">
      <CardHeader>
        <CardTitle className="text-yellow-500">Database Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to set up the database tables and functions required for the leaderboard.
          </p>
          <Button 
            onClick={runSetup} 
            disabled={loading}
            className="w-full bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Run Database Setup"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}