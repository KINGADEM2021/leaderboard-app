import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, ShoppingCart, Music, Headphones, Film, Tv, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AdminShopPanel } from "@/components/shop/admin-shop-panel";
import { AdminClaimsPanel } from "@/components/shop/admin-claims-panel";
import { ShopItem } from "@/components/shop/shop-item";
import { Cart } from "@/components/shop/cart";
import { UserHeader } from "@/components/layout/user-header";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ShopItemType = {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  image_url: string;
  created_by: string;
  active: boolean;
  category: string;
};

// Categories for audio visual club items
const categories = [
  { id: "all", name: "All Items", icon: <Music className="h-4 w-4" /> },
  { id: "audio", name: "Audio Equipment", icon: <Headphones className="h-4 w-4" /> },
  { id: "video", name: "Video Equipment", icon: <Film className="h-4 w-4" /> },
  { id: "lighting", name: "Lighting", icon: <Tv className="h-4 w-4" /> },
  { id: "accessories", name: "Accessories", icon: <Tv className="h-4 w-4" /> },
  { id: "other", name: "Other", icon: <Music className="h-4 w-4" /> }
];

export default function ShopPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItemType[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [, setLocation] = useLocation();

  // Check if user is admin
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    fetchItems();
    if (user) {
      fetchUserPoints();
    }
  }, [user]);

  useEffect(() => {
    // Filter items based on active category
    if (activeCategory === "all") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => item.category === activeCategory);
      setFilteredItems(filtered);
    }
  }, [activeCategory, items]);

  // Add useEffect to set up points change subscription
  useEffect(() => {
    if (user) {
      // Set up real-time subscription for points changes
      const pointsSubscription = supabase
        .channel('shop-points-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'points',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Realtime points change detected in shop:', payload);
            // When points change, reload them
            fetchUserPoints();
          }
        )
        .subscribe((status) => {
          console.log('Shop points subscription status:', status);
        });
        
      // Clean up subscription on unmount
      return () => {
        supabase.removeChannel(pointsSubscription);
      };
    }
  }, [user]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("active_shop_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load shop items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const { data, error } = await supabase
        .rpc('fetch_user_points', {
          user_uuid: user?.id
        });

      if (error) throw error;
      setUserPoints(data || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load points balance",
        variant: "destructive",
      });
    }
  };

  const handlePurchase = async (item: ShopItemType) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to make purchases",
        variant: "destructive",
      });
      return;
    }

    if (userPoints < item.points_cost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${item.points_cost} points to purchase this item. Current balance: ${userPoints} points`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('purchase_shop_item', {
        item_uuid: item.id,
        user_uuid: user.id,
        quantity: 1
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item purchased successfully!",
      });

      // Refresh points balance immediately
      fetchUserPoints();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase item",
        variant: "destructive",
      });
    }
  };

  const addToCart = async (item: ShopItemType) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("cart_items")
        .upsert(
          {
            user_id: user.id,
            item_id: item.id,
            quantity: 1
          },
          {
            onConflict: 'user_id,item_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added to cart!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  // Add delete function
  const deleteShopItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("shop_items")
        .delete()
        .eq("id", itemId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      
      // Refresh items list
      fetchItems();
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  // Fix empty shop function to handle errors better
  const emptyShop = async () => {
    try {
      const { error } = await supabase.rpc('empty_shop');
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Shop has been emptied",
      });

      fetchItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to empty shop",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="mt-4 text-xl font-light">Loading audio-visual equipment...</p>
      </div>
    );
  }

  const userName = user?.user_metadata?.name || user?.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={userName || ''} showShopButton={false} />
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-800 to-blue-700 mb-8 p-8">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-2 text-white">
              Audio Visual Club Shop
            </h1>
            <p className="text-xl text-white/80 max-w-2xl">
              Borrow professional equipment for your projects. Use your points to request gear.
            </p>
            
            <div className="mt-6 flex items-center space-x-4">
              {!isAdmin && (
                <>
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <span className="text-sm text-white/70">Your Balance</span>
                    <div className="text-2xl font-bold text-white">{userPoints} points</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                    <Cart />
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="absolute -right-10 -bottom-10 opacity-20">
            <Headphones className="w-40 h-40" />
          </div>
        </div>
        
        {/* Admin Controls */}
        {isAdmin && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white/5 backdrop-blur-sm p-4 rounded-xl">
              <h2 className="text-xl font-semibold text-white">Admin Controls</h2>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setLocation("/announcements")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Bell className="h-5 w-5 mr-2" />
                  Manage Announcements
                </Button>
                <Button
                  onClick={() => setShowAdminPanel(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Item
                </Button>
                <Button
                  onClick={emptyShop}
                  variant="destructive"
                  className="flex items-center"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Empty Shop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Panels */}
        {isAdmin && (
          <>
            {/* Shop Item Management - Only shown when Add Item is clicked */}
            {showAdminPanel && (
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AdminShopPanel 
                  onItemAdded={fetchItems} 
                  onClose={() => setShowAdminPanel(false)} 
                />
              </motion.div>
            )}
            
            {/* Claims Management */}
            <div className="mb-8">
              <AdminClaimsPanel />
            </div>
          </>
        )}

        {/* Category Filters */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 hide-scrollbar">
          {categories.map((category) => (
            <Button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              variant="ghost"
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 transition-all",
                activeCategory === category.id 
                  ? "bg-purple-600 text-white hover:bg-purple-700" 
                  : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
              )}
            >
              {category.icon}
              {category.name}
            </Button>
          ))}
        </div>

        {/* Shop Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex flex-col"
              >
                <ShopItem
                  item={item}
                  onAction={!isAdmin ? () => addToCart(item) : undefined}
                  actionLabel={!isAdmin ? "Request Item" : undefined}
                  isAdmin={isAdmin}
                  onDelete={isAdmin ? () => deleteShopItem(item.id) : undefined}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-white/5 backdrop-blur-sm text-white border-0">
            <Film className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-400">No items available in this category.</p>
            {isAdmin && (
              <Button
                onClick={() => setShowAdminPanel(true)}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Item
              </Button>
            )}
          </Card>
        )}

        {/* Features Section */}
        {filteredItems.length > 0 && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl">
              <Headphones className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-xl font-semibold mb-2">Professional Audio Gear</h3>
              <p className="text-white/70">Access high-quality microphones, mixers, and sound recording equipment for your projects.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl">
              <Film className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="text-xl font-semibold mb-2">Cinema-Grade Cameras</h3>
              <p className="text-white/70">Capture stunning footage with our selection of professional cameras and lenses.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl">
              <Tv className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="text-xl font-semibold mb-2">Production Accessories</h3>
              <p className="text-white/70">Complete your setup with lighting equipment, tripods, and other essential accessories.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
