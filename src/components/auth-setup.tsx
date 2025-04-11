import { useEffect, useState } from 'react';
import { initializeDatabase } from '@/lib/supabase';
import { saveAnnouncements, getAnnouncements, emergencyFixAnnouncements } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

export function DatabaseSetup() {
  const [isChecking, setIsChecking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(true);
  const [showEmergencyFix, setShowEmergencyFix] = useState(false);
  const { toast } = useToast();

  const checkDatabase = async () => {
    setIsChecking(true);
    try {
      const result = await initializeDatabase();
      
      // Also check announcements table
      try {
        const announcements = await getAnnouncements();
        console.log('Current announcements:', announcements);
        if (announcements && announcements.length > 0) {
          setIsInitialized(true);
          setShowEmergencyFix(false);
        } else {
          console.warn('No announcements found');
          setShowEmergencyFix(true);
        }
      } catch (error) {
        console.error('Error getting announcements:', error);
        setShowEmergencyFix(true);
        toast({
          title: 'Announcements Issue',
          description: 'There was a problem with the announcements. Click the Fix button to repair.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error checking database:', error);
      setIsInitialized(false);
      setShowEmergencyFix(true);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check database initialization status when component mounts
    checkDatabase();
  }, []);

  const handleEmergencyFix = async () => {
    setIsChecking(true);
    try {
      const success = await emergencyFixAnnouncements();
      
      if (success) {
        toast({
          title: 'Fix Applied',
          description: 'The announcements table has been fixed. Please refresh the page.'
        });
        setShowEmergencyFix(false);
        setIsInitialized(true);
      } else {
        toast({
          title: 'Fix Failed',
          description: 'Failed to fix announcements. Try running the SQL setup script directly.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error during emergency fix:', error);
      toast({
        title: 'Error',
        description: 'An error occurred during the fix. See console for details.',
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      {showEmergencyFix && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleEmergencyFix}
            variant="destructive"
            disabled={isChecking}
            className="flex items-center shadow-lg"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Fix Announcements
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
} 