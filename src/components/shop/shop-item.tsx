import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Plus, Star, Award, Music, Headphones, Film, Tv, Trash2, Package } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ItemProps = {
  item: {
    id: string;
    name: string;
    description: string;
    points_cost: number;
    image_url?: string;
    category?: string;
  };
  onPurchase?: (item: any) => void;
  onAddToCart?: (item: any) => void;
  onAction?: (item: any) => void;
  actionLabel?: string;
  className?: string;
  purchaseMode?: "direct" | "cart";
  disabled?: boolean;
  isAdmin?: boolean;
  onDelete?: (item?: any) => void;
};

export function ShopItem({
  item,
  onPurchase,
  onAddToCart,
  onAction,
  actionLabel = "Borrow",
  className,
  purchaseMode = "direct",
  disabled = false,
  isAdmin = false,
  onDelete,
}: ItemProps) {
  const [loading, setLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (onAction) {
        await onAction(item);
      } else if (onPurchase) {
        await onPurchase(item);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setDeleting(true);
    try {
      await onDelete(item);
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'audio':
        return <Headphones className="h-3 w-3" />;
      case 'video':
        return <Film className="h-3 w-3" />;
      case 'lighting':
        return <Tv className="h-3 w-3" />;
      case 'accessories':
        return <Star className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className={cn("h-full", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Card className="glass-card hover-card h-full flex flex-col">
        <div className="p-4 relative overflow-hidden">
          {item.category && (
            <Badge className="absolute top-2 right-2 z-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs flex items-center gap-1 button-hover">
              {getCategoryIcon(item.category)}
              {item.category}
            </Badge>
          )}
          
          <div
            className={cn(
              "rounded-lg overflow-hidden bg-gradient-to-br from-purple-700/20 to-blue-800/20 h-40 flex items-center justify-center relative",
              isHovering ? "border-white/20" : "border-transparent"
            )}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <Award className="w-16 h-16 text-purple-400/50 icon-hover" />
            )}
          </div>
        </div>

        <CardContent className="flex-grow">
          <h3 className="font-bold text-lg text-white/90 mb-1 gradient-heading">{item.name}</h3>
          <p className="text-white/70 text-sm line-clamp-3">{item.description}</p>
        </CardContent>

        <CardFooter className="pb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-white">{item.points_cost}</span>
              <span className="text-white/60 text-sm">points</span>
            </div>

            {isAdmin && onDelete && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          
          <div className="w-full">
            {(purchaseMode === "direct" && (onPurchase || onAction)) && (
              <Button
                onClick={handleAction}
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 w-full"
                disabled={loading || disabled}
              >
                {loading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                {actionLabel || "Borrow"}
              </Button>
            )}

            {purchaseMode === "cart" && onAddToCart && (
              <Button
                onClick={() => onAddToCart(item)}
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 w-full"
                disabled={disabled}
              >
                <ShoppingCart className="mr-1 h-4 w-4" />
                Add
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
