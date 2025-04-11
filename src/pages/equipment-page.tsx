import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Headphones, Tag, Check, ArrowRight, Camera, Mic, Music, Calendar, ShoppingBag } from "lucide-react";
import { UserHeader } from "@/components/layout/user-header";
import { Equipment } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

type BorrowingRequest = {
  itemId: string;
  name: string; 
  returnDate: string;
  purpose: string;
};

// Update Equipment type to match database schema
interface EquipmentItem {
  id: string;
  name: string;
  count: number;
  type: string;
  description: string;
}

// Interface for approved shop items
interface ApprovedShopItem {
  id: string;
  name: string;
  description?: string;
  return_date?: string;
  created_at: string;
  from_shop: boolean;
}

export default function EquipmentPage() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const { toast } = useToast();
  
  const [borrowRequest, setBorrowRequest] = useState<BorrowingRequest>({
    itemId: "",
    name: "",
    returnDate: "",
    purpose: ""
  });

  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowingEquipment, setBorrowingEquipment] = useState<EquipmentItem | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isBorrowing, setIsBorrowing] = useState(false);

  const [approvedShopItems, setApprovedShopItems] = useState<ApprovedShopItem[]>([]);
  const [allEquipment, setAllEquipment] = useState<(EquipmentItem | ApprovedShopItem)[]>([]);

  // Fetch equipment from Supabase
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      
      // Try primary method first - direct query to equipment_stats
      const { data, error } = await supabase
        .from('equipment_stats')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error with primary equipment fetch method:', error);
        // Try fallback method 1: use the load_equipment_for_client_v2 function
        const { data: fnData, error: fnError } = await supabase
          .rpc('load_equipment_for_client_v2');
        
        if (fnError) {
          console.error('Error with fallback method 1:', fnError);
          // Try fallback method 2: use the simple_load_equipment function
          const { data: simpleData, error: simpleError } = await supabase
            .rpc('simple_load_equipment');
          
          if (simpleError) {
            console.error('Error with fallback method 2:', simpleError);
            // Try fallback method 3: use the fix_equipment_loading function
            const { data: fixResult, error: fixError } = await supabase
              .rpc('fix_equipment_loading');
            
            if (fixError) {
              console.error('Failed to fix equipment loading:', fixError);
              throw new Error('All equipment loading methods failed');
            } else {
              console.log('Equipment fix attempted:', fixResult);
              // Try one more time with the direct query
              const { data: retryData, error: retryError } = await supabase
                .from('equipment_stats')
                .select('*')
                .order('name');
              
              if (retryError || !retryData || retryData.length === 0) {
                throw new Error('Failed to load equipment after fix attempt');
              }
              
              setEquipment(retryData);
              return;
            }
          } else if (simpleData) {
            // Parse JSON string to object
            try {
              const parsedData = JSON.parse(simpleData);
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                setEquipment(parsedData);
                return;
              }
            } catch (parseError) {
              console.error('Error parsing simple equipment data:', parseError);
            }
          }
        } else if (fnData) {
          setEquipment(fnData);
          return;
        }
        
        throw error;
      }
      
      if (data && data.length > 0) {
        setEquipment(data);
      } else {
        console.warn('No equipment found in equipment_stats, trying to fix...');
        // Try to fix and reload
        const { data: fixResult, error: fixError } = await supabase
          .rpc('fix_equipment_loading');
          
        if (fixError) {
          console.error('Failed to fix equipment loading:', fixError);
        } else {
          console.log('Equipment fix attempted:', fixResult);
          // Try again with the direct query
          const { data: retryData, error: retryError } = await supabase
            .from('equipment_stats')
            .select('*')
            .order('name');
          
          if (!retryError && retryData && retryData.length > 0) {
            setEquipment(retryData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: "Error",
        description: "Failed to load equipment. Please try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved shop claims
  const fetchApprovedShopItems = async () => {
    if (!user) return;
    
    try {
      // Fetch claims with metadata that includes return date
      const { data, error } = await supabase
        .from('claims_with_metadata')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved');
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transform shop claim items into equipment-like format
        const shopItems: ApprovedShopItem[] = [];
        
        // Process each claim to extract individual items
        for (const claim of data) {
          if (claim.items && Array.isArray(claim.items)) {
            for (const item of claim.items) {
              shopItems.push({
                id: `shop-${claim.id}-${item.id}`,
                name: item.item.name,
                description: `Shop item - quantity: ${item.quantity}`,
                return_date: claim.return_date,
                created_at: claim.created_at,
                from_shop: true
              });
            }
          }
        }
        
        setApprovedShopItems(shopItems);
      }
    } catch (error) {
      console.error('Error fetching approved shop items:', error);
    }
  };

  // Combine regular equipment and shop items
  useEffect(() => {
    const combined = [...equipment, ...approvedShopItems];
    setAllEquipment(combined);
  }, [equipment, approvedShopItems]);

  // Load equipment when component mounts
  useEffect(() => {
    fetchEquipment();
    fetchApprovedShopItems();
    
    // Refresh equipment list every 30 seconds
    const interval = setInterval(() => {
      fetchEquipment();
      fetchApprovedShopItems();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Get the appropriate icon for each equipment type
  const getEquipmentIcon = (type: string, fromShop = false) => {
    if (fromShop) {
      return <ShoppingBag className="h-5 w-5" />;
    }
    
    switch(type?.toLowerCase()) {
      case 'camera':
        return <Camera className="h-5 w-5" />;
      case 'microphone':
      case 'mic':
        return <Mic className="h-5 w-5" />;
      case 'audio':
        return <Headphones className="h-5 w-5" />;
      default:
        return <Music className="h-5 w-5" />;
    }
  };

  // Filter equipment based on search term
  const filteredEquipment = allEquipment.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ('type' in item && item.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle borrow dialog opening
  const handleBorrow = async (equipment: EquipmentItem) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to borrow equipment",
        variant: "destructive",
      });
      return;
    }
    
    // Ask for return date and purpose
    setBorrowingEquipment(equipment);
    setReturnDate('');
    setPurpose('');
    setShowBorrowModal(true);
  };

  // Handle borrowing request submission
  const handleBorrowSubmit = async () => {
    if (!selectedEquipment || !user) return;
    
    try {
      setBorrowing(true);
      
      // Call the borrow_equipment function
      const { data, error } = await supabase.rpc('borrow_equipment', {
        equipment_uuid: borrowRequest.itemId,
        return_date: borrowRequest.returnDate,
        request_purpose: borrowRequest.purpose
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `You have successfully borrowed ${selectedEquipment.name}`,
      });
      
      // Refresh equipment list
      fetchEquipment();
      setSelectedEquipment(null);
    } catch (error: any) {
      console.error('Error borrowing equipment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to borrow equipment",
        variant: "destructive"
      });
    } finally {
      setBorrowing(false);
    }
  };

  // Add a modal component for borrowing equipment
  const BorrowEquipmentModal = () => {
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);
    
    const minDate = today.toISOString().split('T')[0];
    const maxDate = twoWeeksLater.toISOString().split('T')[0];
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!returnDate) {
        toast({
          title: "Return Date Required",
          description: "Please select when you plan to return the equipment",
          variant: "destructive",
        });
        return;
      }
      
      if (!purpose.trim()) {
        toast({
          title: "Purpose Required",
          description: "Please explain why you need to borrow this equipment",
          variant: "destructive",
        });
        return;
      }
      
      try {
        setIsBorrowing(true);
        
        console.log("Borrowing equipment:", borrowingEquipment?.id, "return date:", returnDate, "purpose:", purpose);
        
        const { data, error } = await supabase.rpc('borrow_equipment', {
          equipment_uuid: borrowingEquipment?.id,
          return_date: returnDate,
          purpose: purpose
        });
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: `${borrowingEquipment?.name} borrowed successfully!`,
        });
        
        // Refresh equipment list to update availability
        fetchEquipment();
        
        // Close modal
        setShowBorrowModal(false);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to borrow equipment",
          variant: "destructive",
        });
      } finally {
        setIsBorrowing(false);
      }
    };
    
    return (
      <Dialog open={showBorrowModal} onOpenChange={setShowBorrowModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle>Borrow Equipment</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide the following information to borrow {borrowingEquipment?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="return-date" className="text-right">
                  Return Date
                </Label>
                <Input
                  id="return-date"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="col-span-3 bg-gray-800 border-gray-700"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purpose" className="text-right">
                  Purpose
                </Label>
                <Textarea
                  id="purpose"
                  placeholder="Explain why you need to borrow this equipment"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="col-span-3 bg-gray-800 border-gray-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowBorrowModal(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isBorrowing}
              >
                {isBorrowing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Borrow Equipment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="mt-4 text-xl font-light">Loading your profile...</p>
      </div>
    );
  }

  const userName = user.user_metadata?.name || user.email;

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName={userName} />
        
        <div className="mb-8">
          <div className="flex flex-col items-center md:flex-row md:justify-between mb-6">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-600 mb-2">
                Equipment Library
              </h1>
              <p className="text-white/60">
                Browse and borrow equipment for your projects
              </p>
            </div>
            
            <div className="relative w-full md:w-72">
              <Input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                <p className="text-white/60">Loading equipment...</p>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Music className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Equipment Found</h3>
                <p className="text-white/60 max-w-md">
                  No equipment is currently available in the library.
                </p>
              </div>
            ) : (
              filteredEquipment.map(item => {
                const isFromShop = 'from_shop' in item && item.from_shop;
                
                return (
                  <Card key={item.id} className="bg-white/5 border-0 backdrop-blur-sm shadow-lg overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2 items-center">
                          <div className="bg-purple-500/20 p-2 rounded-lg">
                            {getEquipmentIcon(isFromShop ? '' : (item as EquipmentItem).type, isFromShop)}
                          </div>
                          <CardTitle className="text-lg font-semibold text-white">{item.name}</CardTitle>
                        </div>
                        {isFromShop ? (
                          <Badge className="bg-amber-600">From Shop</Badge>
                        ) : (
                          <Badge className="bg-purple-600">{(item as EquipmentItem).type}</Badge>
                        )}
                      </div>
                      <CardDescription className="text-white/60 line-clamp-2">
                        {isFromShop ? (item as ApprovedShopItem).description : (item as EquipmentItem).description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        {isFromShop ? (
                          <div className="flex items-center gap-1 text-amber-400">
                            <Calendar className="h-4 w-4" />
                            <span>Return by: {formatDate((item as ApprovedShopItem).return_date || '')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-purple-400">
                            <Tag className="h-4 w-4" />
                            <span>Available: {(item as EquipmentItem).count}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-1 pb-3">
                      {!isFromShop && (item as EquipmentItem).count > 0 && (
                        <Button 
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleBorrow(item as EquipmentItem)}
                        >
                          Borrow
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                      {isFromShop && (
                        <Button 
                          className="w-full bg-amber-600 hover:bg-amber-700" 
                          disabled
                        >
                          Already Claimed
                          <Check className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
      <BorrowEquipmentModal />
    </div>
  );
} 