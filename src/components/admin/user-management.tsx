import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserX, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  email: string;
  role: string;
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch users
  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      
      // First get the current user's email to identify admin
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isAdmin = currentUser?.email === 'ademmsallem782@gmail.com';

      if (!isAdmin) {
        throw new Error('Only administrators can access user management');
      }

      // Get all users from public.users table
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('id, email, role')
        .order('email');

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      // Transform the data to match our User type
      const transformedUsers = (dbUsers || []).map(user => ({
        id: user.id,
        email: user.email || '',
        role: user.role || (user.email === 'ademmsallem782@gmail.com' ? 'admin' : 'user')
      }));
      
      // Add the current admin if not in the list
      if (!transformedUsers.some(u => u.email === 'ademmsallem782@gmail.com')) {
        transformedUsers.unshift({
          id: currentUser?.id || 'admin',
          email: 'ademmsallem782@gmail.com',
          role: 'admin'
        });
      }
      
      console.log('Fetched users:', transformedUsers);
      setUsers(transformedUsers);
    } catch (error: any) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete specific user
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      // Delete from public.users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${userEmail} has been deleted`,
        variant: "default",
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">User Management</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No users found
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center">
                    {user.role === 'admin' ? (
                      <Shield className="h-5 w-5 text-purple-400" />
                    ) : (
                      <UserX className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">{user.email}</div>
                    <div className="text-white/60 text-sm">
                      {user.role === 'admin' ? 'Administrator' : 'User'}
                    </div>
                  </div>
                </div>
                {user.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 