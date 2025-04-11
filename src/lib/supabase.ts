import { createClient } from '@supabase/supabase-js';

// Check if environment variables are set
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    }
  }
);

// Initialize database
export const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Create points table
    const { error: tableError } = await supabase.rpc('create_points_table_if_not_exists');
    if (tableError) {
      console.error('Error creating points table:', tableError);
      throw tableError;
    }

    // Create add points function
    const { error: pointsFnError } = await supabase.rpc('add_points_to_user', {
      user_uuid: '00000000-0000-0000-0000-000000000000',
      points_to_add: 0
    });
    if (pointsFnError) {
      console.error('Error checking add_points_to_user function:', pointsFnError);
      throw pointsFnError;
    }

    // Create profiles view
    const { error: viewError } = await supabase.rpc('create_profiles_with_points_view');
    if (viewError) {
      console.error('Error creating profiles view:', viewError);
      throw viewError;
    }
    
    // Check if announcements table exists and is accessible
    console.log('Checking announcements table access...');
    const { error: announcementsError } = await supabase
      .from('announcements')
      .select('count(*)')
      .limit(1)
      .single();
      
    if (announcementsError) {
      console.error('Error accessing announcements table:', announcementsError);
      console.warn('Announcements table may not be properly set up. Please run the full database setup script.');
    } else {
      console.log('Announcements table accessible');
    }

    // Initialize equipment system
    console.log('Checking equipment system...');
    try {
      // Try to fix equipment loading issues
      const { data: fixResult, error: fixError } = await supabase.rpc('fix_equipment_loading');
      
      if (fixError) {
        console.error('Error fixing equipment loading:', fixError);
        console.warn('Equipment system may not be properly set up. Please run the full database setup script.');
      } else {
        console.log('Equipment system check completed:', fixResult);
      }
    } catch (equipmentError) {
      console.error('Error checking equipment system:', equipmentError);
      console.warn('Could not verify equipment system. Some features may not work correctly.');
    }

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}; 