import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Calendar, Package } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type BorrowingItem = {
  id: string;
  quantity: number;
  shop_item: {
    name: string;
    description: string;
    points_cost: number;
  };
};

type BorrowingCardProps = {
  borrowing: {
    id: string;
    created_at: string;
    return_date: string;
    status: string;
    is_hidden: boolean;
    items: BorrowingItem[];
  };
  onVisibilityChange?: () => void;
};

export function BorrowingCard({ borrowing, onVisibilityChange }: BorrowingCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleVisibility = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .rpc('toggle_borrowing_visibility', {
          claim_id: borrowing.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Borrowing is now ${data ? 'hidden' : 'visible'}`,
      });

      if (onVisibilityChange) {
        onVisibilityChange();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update visibility",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate total points safely
  const totalPoints = borrowing.items?.reduce(
    (sum, item) => sum + (item.shop_item?.points_cost || 0) * (item.quantity || 0),
    0
  ) || 0;

  return (
    <Card className={cn(
      "p-4 bg-white/5 backdrop-blur-sm border-white/10 relative group transition-all duration-300",
      borrowing.is_hidden && "opacity-75 hover:opacity-100"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <Package className="h-5 w-5 text-purple-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">Created:</span>
              <span className="text-sm text-white">
                {format(new Date(borrowing.created_at), "PPP")}
              </span>
            </div>
            {borrowing.return_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-white/50">Return by:</span>
                <span className="text-sm text-white">
                  {format(new Date(borrowing.return_date), "PPP")}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {borrowing.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/90">
                  {item.shop_item?.name} × {item.quantity}
                </span>
                <span className="text-purple-400 font-medium">
                  {(item.shop_item?.points_cost || 0) * (item.quantity || 0)} points
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-4 pt-2 border-t border-white/10">
            <span className="text-white/70">Total Points:</span>
            <span className="text-purple-400 font-bold">{totalPoints} points</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVisibility}
          disabled={isUpdating}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {borrowing.is_hidden ? (
            <Eye className="h-4 w-4 text-blue-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      </div>

      {borrowing.is_hidden && (
        <div className="absolute top-2 right-2">
          <span className="text-xs text-white/50 bg-black/20 px-2 py-1 rounded">
            Hidden
          </span>
        </div>
      )}
    </Card>
  );
} 