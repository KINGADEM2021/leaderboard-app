import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { UserHeader } from "@/components/layout/user-header";
import { BorrowingCard } from "@/components/borrowings/borrowing-card";
import { Loader2, Package, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Borrowing = {
  id: string;
  created_at: string;
  return_date: string;
  status: string;
  is_hidden: boolean;
  user_name?: string;
  user_email?: string;
  return_status?: string;
  items: Array<{
    id: string;
    quantity: number;
    shop_item: {
      name: string;
      description: string;
      points_cost: number;
    };
  }>;
};

// Admin email from environment variable
const ADMIN_EMAIL = 'ademmsallem782@gmail.com';

export default function BorrowingsPage() {
  const { user } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchBorrowings = async () => {
    if (!user) return;

    try {
      let data;
      let error;

      if (isAdmin) {
        // Fetch all active borrowings for admin
        const result = await supabase
          .from('admin_borrowings')
          .select('*')
          .order('created_at', { ascending: false });
        
        data = result.data;
        error = result.error;
      } else {
        // Fetch only user's borrowings
        const result = await supabase.rpc('get_user_borrowings', {
          user_uuid: user.id
        });
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      setBorrowings(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load borrowings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowings();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
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
            <h1 className="text-4xl md:text-6xl font-bold mb-2 text-white flex items-center gap-4">
              <Package className="h-12 w-12" />
              {isAdmin ? 'All Borrowings' : 'My Borrowings'}
            </h1>
            <p className="text-xl text-white/80 max-w-2xl">
              {isAdmin 
                ? 'View and manage all equipment borrowings across the club.'
                : 'View and manage your equipment borrowings. You can hide borrowings from other users.'}
            </p>
          </div>
        </div>

        {/* Borrowings List */}
        <div className="max-w-4xl mx-auto space-y-4">
          {borrowings.length > 0 ? (
            borrowings.map((borrowing) => (
              <Card key={borrowing.id} className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader className="pb-2">
                  {isAdmin && borrowing.user_name && (
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <CardTitle className="text-lg text-white">{borrowing.user_name}</CardTitle>
                        <p className="text-sm text-white/60">{borrowing.user_email}</p>
                      </div>
                      {borrowing.return_status && (
                        <Badge 
                          variant={borrowing.return_status.includes('OVERDUE') ? 'destructive' : 'default'}
                          className="ml-2"
                        >
                          {borrowing.return_status.includes('OVERDUE') && (
                            <AlertTriangle className="w-4 h-4 mr-1" />
                          )}
                          {borrowing.return_status}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <BorrowingCard
                    borrowing={borrowing}
                    onVisibilityChange={fetchBorrowings}
                  />
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold mb-2">No Borrowings Yet</h3>
              <p className="text-gray-400">
                {isAdmin 
                  ? 'There are no active borrowings at the moment.'
                  : 'Visit the shop to request equipment for your projects.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 