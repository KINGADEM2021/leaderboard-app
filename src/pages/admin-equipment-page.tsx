import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, RefreshCw, ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserHeader } from '@/components/layout/user-header';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Define types
type EquipmentRequest = {
  id: string;
  user_id: string;
  equipment_id: string;
  return_date: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  created_at: string;
  user_email: string;
  user_name: string;
  equipment_name: string;
};

type EquipmentItem = {
  id: string;
  name: string;
  count: number;
  type: string;
  description: string;
};

export default function AdminEquipmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('requests');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create new equipment states
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState<Omit<EquipmentItem, 'id'>>({
    name: '',
    count: 1,
    type: '',
    description: ''
  });
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);

  // Create a function to handle equipment request status updates
  const handleRequestStatusUpdate = async (requestId: string, action: 'approve' | 'reject' | 'confirm_return') => {
    try {
      // Set loading state
      setLoadingRequestId(requestId);
      
      // Call the admin function to handle the request
      const { data, error } = await supabase.rpc('admin_handle_equipment_request', {
        request_uuid: requestId,
        action: action
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Request ${action === 'confirm_return' ? 'marked as returned' : action + 'd'} successfully`,
      });
      
      // Refresh the requests list
      await fetchRequests();
      
    } catch (error: any) {
      console.error(`Error ${action}ing equipment request:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} equipment request`,
        variant: "destructive",
      });
    } finally {
      setLoadingRequestId(null);
    }
  };
  
  // Shorthand functions for clarity
  const approveRequest = (requestId: string) => handleRequestStatusUpdate(requestId, 'approve');
  const rejectRequest = (requestId: string) => handleRequestStatusUpdate(requestId, 'reject');
  const confirmReturn = (requestId: string) => handleRequestStatusUpdate(requestId, 'confirm_return');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Get all equipment requests with user and equipment details
      const { data, error } = await supabase
        .from('equipment_requests')
        .select(`
          id,
          user_id,
          equipment_id,
          return_date,
          purpose,
          status,
          created_at,
          users:user_id (email, user_metadata->name),
          equipment:equipment_id (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Format the data
      const formattedRequests = data.map(req => ({
        id: req.id,
        user_id: req.user_id,
        equipment_id: req.equipment_id,
        return_date: req.return_date,
        purpose: req.purpose,
        status: req.status,
        created_at: req.created_at,
        user_email: req.users ? (req.users as any).email : 'Unknown',
        user_name: req.users ? (req.users as any).user_metadata?.name : 'Unknown User',
        equipment_name: req.equipment ? (req.equipment as any).name : 'Unknown Equipment'
      }));
      
      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching equipment requests:', error);
      toast({
        title: "Error",
        description: "Failed to load equipment requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      // Get all equipment
      const { data, error } = await supabase
        .from('equipment_stats')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: "Error",
        description: "Failed to load equipment",
        variant: "destructive",
      });
    }
  };

  // Add new equipment
  const handleAddEquipment = async () => {
    try {
      setIsAddingEquipment(true);
      
      // Validate input
      if (!newEquipment.name.trim()) {
        toast({
          title: "Error",
          description: "Equipment name is required",
          variant: "destructive",
        });
        return;
      }
      
      if (!newEquipment.type.trim()) {
        toast({
          title: "Error",
          description: "Equipment type is required",
          variant: "destructive",
        });
        return;
      }
      
      // Generate a unique ID
      const id = crypto.randomUUID();
      
      // Add equipment to the database
      const { error } = await supabase
        .from('equipment_stats')
        .insert({
          id,
          name: newEquipment.name,
          count: newEquipment.count,
          type: newEquipment.type,
          description: newEquipment.description || ''
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Equipment added successfully",
      });
      
      // Reset form and close modal
      setNewEquipment({
        name: '',
        count: 1,
        type: '',
        description: ''
      });
      setShowAddEquipmentModal(false);
      
      // Refresh equipment list
      fetchEquipment();
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add equipment",
        variant: "destructive",
      });
    } finally {
      setIsAddingEquipment(false);
    }
  };

  // Update equipment count
  const handleUpdateEquipmentCount = async (id: string, count: number) => {
    try {
      const { error } = await supabase
        .from('equipment_stats')
        .update({ count })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Equipment count updated",
      });
      
      // Refresh equipment list
      fetchEquipment();
    } catch (error: any) {
      console.error('Error updating equipment count:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update equipment count",
        variant: "destructive",
      });
    }
  };

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchEquipment();
    }
  }, [user]);

  // Filter requests based on search term
  const filteredRequests = requests.filter(req => 
    req.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter equipment based on search term
  const filteredEquipment = equipment.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get request status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'returned':
        return <Badge className="bg-blue-500">Returned</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return dateString;
    }
  };

  // Check if user is admin
  const isAdmin = user && user.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com');

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 max-w-md w-full text-center border border-white/10">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You don't have permission to access this page. Please log in with an admin account.
          </p>
          <Button
            onClick={() => window.history.back()}
            className="bg-white/10 hover:bg-white/20 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto py-8 px-4">
        <UserHeader userName="Admin" />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
            Equipment Management
          </h1>
          <p className="text-white/60">
            Manage equipment and borrowing requests
          </p>
        </div>
        
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList className="bg-white/10">
                <TabsTrigger value="requests" className="data-[state=active]:bg-purple-600 text-white">
                  Requests
                </TabsTrigger>
                <TabsTrigger value="equipment" className="data-[state=active]:bg-purple-600 text-white">
                  Equipment
                </TabsTrigger>
              </TabsList>
              
              <div className="relative w-full max-w-xs">
                <Input
                  type="text"
                  placeholder={activeTab === 'requests' ? "Search requests..." : "Search equipment..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>
            
            <TabsContent value="requests" className="mt-0">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
                <CardHeader>
                  <CardTitle>Equipment Requests</CardTitle>
                  <CardDescription className="text-white/60">
                    Manage all equipment borrowing requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                      <p className="text-purple-500/80">Loading requests...</p>
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/60">No equipment requests found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4">User</th>
                            <th className="text-left py-3 px-4">Equipment</th>
                            <th className="text-left py-3 px-4">Return Date</th>
                            <th className="text-left py-3 px-4">Purpose</th>
                            <th className="text-left py-3 px-4">Status</th>
                            <th className="text-left py-3 px-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRequests.map((request) => (
                            <tr key={request.id} className="border-b border-white/10 hover:bg-white/5">
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium">{request.user_name}</div>
                                  <div className="text-white/60 text-sm">{request.user_email}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">{request.equipment_name}</td>
                              <td className="py-3 px-4">{formatDate(request.return_date)}</td>
                              <td className="py-3 px-4">
                                <div className="max-w-xs truncate" title={request.purpose}>
                                  {request.purpose}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {getStatusBadge(request.status)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  {request.status === 'pending' && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => approveRequest(request.id)}
                                        disabled={loadingRequestId === request.id}
                                      >
                                        {loadingRequestId === request.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4 mr-1" />
                                        )}
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => rejectRequest(request.id)}
                                        disabled={loadingRequestId === request.id}
                                      >
                                        {loadingRequestId === request.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <XCircle className="h-4 w-4 mr-1" />
                                        )}
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {request.status === 'approved' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => confirmReturn(request.id)}
                                      disabled={loadingRequestId === request.id}
                                    >
                                      {loadingRequestId === request.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                      )}
                                      Confirm Return
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="ml-auto border-white/20 text-white hover:bg-white/10"
                    onClick={fetchRequests}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="equipment" className="mt-0">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Equipment Inventory</CardTitle>
                      <CardDescription className="text-white/60">
                        Manage equipment in the inventory
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setShowAddEquipmentModal(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Equipment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                      <p className="text-purple-500/80">Loading equipment...</p>
                    </div>
                  ) : filteredEquipment.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/60">No equipment found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredEquipment.map((item) => (
                        <Card key={item.id} className="bg-white/10 border-white/10">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <Badge variant="outline" className="bg-white/10">
                                {item.type}
                              </Badge>
                              <Badge className={item.count > 0 ? "bg-green-600" : "bg-red-600"}>
                                {item.count > 0 ? "In Stock" : "Out of Stock"}
                              </Badge>
                            </div>
                            <CardTitle className="mt-2">{item.name}</CardTitle>
                            <CardDescription className="text-white/70">
                              {item.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/60">
                                Available: {item.count}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleUpdateEquipmentCount(item.id, Math.max(0, item.count - 1))}
                                >
                                  -
                                </Button>
                                <span>{item.count}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleUpdateEquipmentCount(item.id, item.count + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="ml-auto border-white/20 text-white hover:bg-white/10"
                    onClick={fetchEquipment}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Add Equipment Modal */}
      <Dialog open={showAddEquipmentModal} onOpenChange={setShowAddEquipmentModal}>
        <DialogContent className="bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle>Add New Equipment</DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill out the details to add new equipment to the inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                value={newEquipment.name}
                onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                className="col-span-3 bg-gray-800 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Input
                id="type"
                value={newEquipment.type}
                onChange={(e) => setNewEquipment({...newEquipment, type: e.target.value})}
                className="col-span-3 bg-gray-800 border-gray-700"
                placeholder="e.g. Camera, Audio, Lighting"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="count" className="text-right">Count</Label>
              <Input
                id="count"
                type="number"
                min="0"
                value={newEquipment.count}
                onChange={(e) => setNewEquipment({...newEquipment, count: parseInt(e.target.value) || 0})}
                className="col-span-3 bg-gray-800 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                value={newEquipment.description}
                onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})}
                className="col-span-3 bg-gray-800 border-gray-700"
                placeholder="Brief description of the equipment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddEquipmentModal(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEquipment}
              disabled={isAddingEquipment}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAddingEquipment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Equipment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 