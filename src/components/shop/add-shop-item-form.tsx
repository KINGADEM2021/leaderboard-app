import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  { value: "audio", label: "Audio Equipment" },
  { value: "video", label: "Video Equipment" },
  { value: "lighting", label: "Lighting" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" }
];

type AddShopItemFormProps = {
  onItemAdded: () => void;
  editingItem?: any;
};

interface FormData {
  name: string;
  description: string;
  points_cost: number;
  image_url: string;
  active: boolean;
  category: string;
}

export default function AddShopItemForm({ onItemAdded, editingItem }: AddShopItemFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: editingItem?.name || "",
    description: editingItem?.description || "",
    points_cost: editingItem?.points_cost || 10,
    image_url: editingItem?.image_url || "",
    active: editingItem?.active ?? true,
    category: editingItem?.category || "" // Add category to form state
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };
  
  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      category: value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.category) {
      toast({
        title: "Error",
        description: "Category is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.description) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.points_cost < 1) {
      toast({
        title: "Error",
        description: "Points cost must be at least 1",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create item with user ID
      const itemData = {
        name: formData.name,
        description: formData.description,
        points_cost: parseInt(formData.points_cost.toString()),
        image_url: formData.image_url,
        active: formData.active,
        category: formData.category, // Include category in the data
        created_by: user?.id
      };
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      let result;
      
      if (editingItem) {
        // Update existing item
        result = await supabase
          .from("shop_items")
          .update(itemData)
          .eq("id", editingItem.id);
      } else {
        // Insert new item
        result = await supabase
          .from("shop_items")
          .insert(itemData);
      }
      
      if (result.error) throw result.error;
      
      toast({
        title: "Success",
        description: editingItem ? "Item updated" : "Item added to shop",
      });
      
      // Reset form
      if (!editingItem) {
        setFormData({
          name: "",
          description: "",
          points_cost: 10,
          image_url: "",
          active: true,
          category: ""
        });
      }
      
      // Notify parent component
      onItemAdded();
      
    } catch (error) {
      console.error("Error adding shop item:", error);
      toast({
        title: "Error",
        description: "Failed to add item to shop",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="bg-white/10 border-white/20 text-white"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          value={formData.category} 
          onValueChange={handleCategoryChange}
          required
        >
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-white/20 text-white">
            {CATEGORIES.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="bg-white/10 border-white/20 text-white"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="points_cost">Points Cost</Label>
        <Input
          id="points_cost"
          name="points_cost"
          type="number"
          min="1"
          value={formData.points_cost}
          onChange={handleChange}
          className="bg-white/10 border-white/20 text-white"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL (optional)</Label>
        <Input
          id="image_url"
          name="image_url"
          value={formData.image_url}
          onChange={handleChange}
          className="bg-white/10 border-white/20 text-white"
          placeholder="https://example.com/image.jpg"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          checked={formData.active}
          onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <Label htmlFor="active">Active (visible in shop)</Label>
      </div>
      
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {editingItem ? "Updating..." : "Adding..."}
          </>
        ) : (
          editingItem ? "Update Item" : "Add to Shop"
        )}
      </Button>
    </form>
  );
} 