import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Categories for shop items
const CATEGORIES = [
  { value: "audio", label: "Audio Equipment" },
  { value: "video", label: "Video Equipment" },
  { value: "lighting", label: "Lighting" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" }
];

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  points_cost: z.coerce.number().min(1, "Points must be greater than 0"),
  image_url: z.string().url("Must be a valid URL").or(z.literal("")),
  category: z.string().min(1, "Category is required"),
});

type ItemFormValues = z.infer<typeof itemSchema>;

type AdminShopPanelProps = {
  onClose: () => void;
  onItemAdded: () => void;
};

export function AdminShopPanel({ onClose, onItemAdded }: AdminShopPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      description: "",
      points_cost: 0,
      image_url: "",
      category: "",
    },
  });

  const onSubmit = async (data: ItemFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("shop_items")
        .insert([
          {
            name: data.name,
            description: data.description,
            points_cost: data.points_cost,
            image_url: data.image_url || null,
            category: data.category,
            active: true,
            created_by: user?.id,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added successfully",
      });

      onItemAdded();
      onClose();
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
            Add Shop Item
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Add a new item to the shop. Fill out the form below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-white/50 border-gray-200 focus:border-primary focus:ring-primary transition-all duration-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white/50 border-gray-200 focus:border-primary focus:ring-primary transition-all duration-300">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="bg-white/50 border-gray-200 focus:border-primary focus:ring-primary transition-all duration-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="points_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Points Cost</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      className="bg-white/50 border-gray-200 focus:border-primary focus:ring-primary transition-all duration-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Image URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      className="bg-white/50 border-gray-200 focus:border-primary focus:ring-primary transition-all duration-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 rounded-full transition-all duration-300 hover:shadow-md"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Item
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
