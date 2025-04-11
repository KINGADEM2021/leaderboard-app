import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShoppingCart, Trash2, CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CartItem = {
  id: string;
  item_id: string;
  quantity: number;
  shop_items: {
    name: string;
    description: string;
    points_cost: number;
    image_url: string | null;
  };
};

// Type for the response from the get_cart_items RPC function
type CartItemRpcResponse = {
  id: string;
  item_id: string;
  quantity: number;
  user_id: string;
  created_at: string;
  item_name: string;
  item_description: string;
  item_points_cost: number;
  item_image_url: string | null;
};

export function Cart() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | undefined>();

  const fetchCart = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          item_id,
          quantity,
          shop_items (
            name,
            description,
            points_cost,
            image_url
          )
        `)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      // Parse and correctly type the response
      const typedData: CartItem[] = data?.map((item: any) => ({
        id: item.id,
        item_id: item.item_id,
        quantity: item.quantity,
        shop_items: {
          name: item.shop_items.name,
          description: item.shop_items.description,
          points_cost: item.shop_items.points_cost,
          image_url: item.shop_items.image_url
        }
      })) || [];
      
      setItems(typedData);
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchCart();
    }
  }, [open, user]);

  const removeFromCart = async (id: string) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setItems(items.filter((item) => item.id !== id));
      
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
    } catch (error) {
      console.error("Error removing item:", error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    }
  };

  const submitClaim = async () => {
    if (!user || items.length === 0) return;
    
    setSubmitting(true);
    try {
      // If a return date is selected, pass it to the function
      let result;
      if (returnDate) {
        result = await supabase.rpc("submit_cart_claim", {
          return_date: format(returnDate, "yyyy-MM-dd"),
        });
      } else {
        result = await supabase.rpc("submit_cart_claim");
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: "Your request has been submitted",
      });

      setItems([]);
      setOpen(false);
      setReturnDate(undefined);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPoints = items.reduce(
    (sum, item) => sum + item.shop_items.points_cost * item.quantity,
    0
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative bg-gray-800 border-gray-700 hover:bg-gray-700 text-white">
          <ShoppingCart className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="border-l border-gray-800 bg-gray-900 text-white p-0">
        <SheetHeader className="p-6 border-b border-gray-800">
          <SheetTitle className="text-white flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Your Cart
          </SheetTitle>
        </SheetHeader>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-500 mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.shop_items.name}</p>
                      <p className="text-sm text-gray-400">{item.shop_items.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-400">Total Points:</span>
                  <span className="font-bold text-purple-400">{totalPoints} points</span>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    When will you return the items?
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-gray-800 border-gray-700 hover:bg-gray-700",
                          !returnDate && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate ? (
                          format(returnDate, "PPP")
                        ) : (
                          <span>Select a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                        className="bg-gray-800 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={submitting || !returnDate}
                  onClick={submitClaim}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    returnDate ? "Submit Request" : "Select a return date"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
