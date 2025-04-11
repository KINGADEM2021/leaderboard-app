import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Check, X } from "lucide-react";

type ShopItem = {
  name: string;
  points_cost: number;
};

type ClaimItem = {
  id: string;
  quantity: number;
  shop_items: ShopItem;
};

type Claim = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user: {
    email: string;
  };
  claim_items: ClaimItem[];
};

export function AdminClaimsPanel() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase
        .from("claims_with_user")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to match our Claim type
      const transformedData = (data || []).map(claim => ({
        id: claim.id,
        status: claim.status,
        created_at: claim.created_at,
        user: { email: claim.user_email },
        claim_items: claim.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          shop_items: {
            name: item.item.name,
            points_cost: item.item.points_cost
          }
        }))
      }));

      setClaims(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load claims",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleUpdateStatus = async (claimId: string, newStatus: 'approved' | 'rejected') => {
    setUpdating(claimId);
    
    try {
      console.log(`Updating claim ${claimId} to status: ${newStatus}`);
      
      // Call the RPC function to update status and handle points
      const { error } = await supabase.rpc('update_claim_status_with_notification', {
        claim_uuid: claimId,
        new_status: newStatus
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Claim ${newStatus} successfully!`,
      });
      
      // Refresh claims list
      fetchClaims();
      
    } catch (error: any) {
      console.error('Error updating claim status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update claim status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Claims Management</h2>
      {claims.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No claims to review</p>
        </Card>
      ) : (
        claims.map((claim) => (
          <Card
            key={claim.id}
            className="p-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium">
                  Claim from {claim.user.email}
                </h3>
                <p className="text-sm text-gray-500">
                  Status: {claim.status}
                </p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(claim.created_at).toLocaleString()}
                </p>
              </div>
              {claim.status === "pending" && (
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleUpdateStatus(claim.id, "approved")}
                    disabled={updating === claim.id}
                  >
                    {updating === claim.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Approve"
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUpdateStatus(claim.id, "rejected")}
                    disabled={updating === claim.id}
                  >
                    {updating === claim.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Reject"
                    )}
                  </Button>
                </div>
              )}
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Items:</h4>
              <ul className="space-y-2">
                {claim.claim_items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.shop_items.name} × {item.quantity}
                    </span>
                    <span className="text-primary font-medium">
                      {item.shop_items.points_cost * item.quantity} points
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between mt-4 pt-2 border-t font-medium">
                <span>Total Points:</span>
                <span className="text-primary">
                  {claim.claim_items.reduce(
                    (sum, item) =>
                      sum + item.shop_items.points_cost * item.quantity,
                    0
                  )}
                </span>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
