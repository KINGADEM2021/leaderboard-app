// Types for club configuration data
export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'event' | 'alert';
};

export interface Equipment {
  id: string;
  name: string;
  count: number;
  type: string;
  description: string;
}

export type Meeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
};

// Default values
const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'New Equipment',
    content: "We've added new professional microphones to our inventory!",
    type: 'news'
  },
  {
    id: '2',
    title: 'Workshop',
    content: 'Join our sound mixing workshop this Saturday at 2pm.',
    type: 'event'
  },
  {
    id: '3',
    title: 'Contest',
    content: 'Submit your short films for our monthly contest by the 25th.',
    type: 'alert'
  }
];

export const DEFAULT_EQUIPMENT: Equipment[] = [
  {
    id: '1',
    name: 'Professional DSLR Cameras',
    count: 8,
    type: 'camera',
    description: 'High-quality DSLR cameras perfect for photography projects and video recordings.'
  },
  {
    id: '2',
    name: 'Condenser Microphones',
    count: 12,
    type: 'microphone',
    description: 'Studio-quality condenser microphones ideal for voice recording and podcasts.'
  },
  {
    id: '3',
    name: 'Camera Tripods',
    count: 10,
    type: 'camera',
    description: 'Adjustable height tripods with smooth pan and tilt for stable filming.'
  },
  {
    id: '4',
    name: 'Wireless Lavalier Mics',
    count: 6,
    type: 'microphone',
    description: 'Clip-on wireless microphones perfect for interviews and presentations.'
  },
  {
    id: '5',
    name: 'LED Light Panels',
    count: 8,
    type: 'lighting',
    description: 'Adjustable brightness LED panels with color temperature control for professional lighting.'
  },
  {
    id: '6',
    name: 'Audio Mixers',
    count: 4,
    type: 'audio',
    description: 'Multi-channel audio mixers for professional sound recording and live events.'
  }
];

const DEFAULT_MEETING: Meeting = {
  id: '1',
  title: 'Weekly Club Meeting',
  date: '2023-12-15',
  time: '16:00',
  location: 'Studio Room 204'
};

// Storage keys
export const STORAGE_KEYS = {
  announcements: 'av_club_announcements',
  equipment: 'av_club_equipment',
  meeting: 'av_club_meeting'
};

// Initialize storage with defaults if not already set
export const initializeStorage = (): void => {
  if (!localStorage.getItem(STORAGE_KEYS.equipment)) {
    localStorage.setItem(STORAGE_KEYS.equipment, JSON.stringify(DEFAULT_EQUIPMENT));
  }
  if (!localStorage.getItem(STORAGE_KEYS.announcements)) {
    localStorage.setItem(STORAGE_KEYS.announcements, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.meeting)) {
    localStorage.setItem(STORAGE_KEYS.meeting, JSON.stringify(DEFAULT_MEETING));
  }
};

import { supabase } from "@/lib/supabase";

// Save data to Supabase and localStorage
export const saveAnnouncements = async (announcements: Announcement[]): Promise<void> => {
  try {
    console.log('Saving announcements:', announcements);
    
    // First, save to localStorage as a backup
    localStorage.setItem(STORAGE_KEYS.announcements, JSON.stringify(announcements));
    
    // Get existing announcements to compare
    const { data: existingData, error: fetchError } = await supabase
      .from('announcements')
      .select('id');
      
    if (fetchError) {
      console.error('Error fetching existing announcements:', fetchError);
      // Continue anyway - we'll try to upsert
    }
    
    // Get list of existing IDs
    const existingIds = (existingData || []).map(item => item.id);
    console.log('Existing announcement IDs:', existingIds);
    
    // Find IDs to delete (those in DB but not in our current list)
    const currentIds = announcements.map(a => a.id);
    const idsToDelete = existingIds.filter(id => !currentIds.includes(id));
    
    if (idsToDelete.length > 0) {
      console.log('Deleting removed announcements:', idsToDelete);
      // Delete announcements that are no longer in the list
      const { error: deleteError } = await supabase
        .from('announcements')
        .delete()
        .in('id', idsToDelete);
        
      if (deleteError) {
        console.error('Error deleting removed announcements:', deleteError);
        // Continue anyway - we'll still try to upsert the current ones
      }
    }
    
    // If there are announcements to insert, do it
    if (announcements.length > 0) {
      // Prepare data for batch upsert
      const announcementsData = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type
      }));
      
      console.log('Upserting announcements:', announcementsData);
      
      // Upsert all announcements in a single batch operation
      const { error: upsertError } = await supabase
        .from('announcements')
        .upsert(announcementsData, { 
          onConflict: 'id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        console.error('Error upserting announcements:', upsertError);
        console.error('Error details:', upsertError.details, upsertError.hint, upsertError.message);
        throw upsertError;
      }
    }
    
    console.log('Announcements saved successfully');
  } catch (error) {
    console.error('Error saving announcements:', error);
    throw error; // Re-throw to allow caller to handle
  }
};

// Save equipment to both localStorage and Supabase
export const saveEquipment = async (equipment: Equipment[]): Promise<void> => {
  try {
    console.log('Saving equipment:', equipment);
    
    // First, save to localStorage as a backup
    localStorage.setItem(STORAGE_KEYS.equipment, JSON.stringify(equipment));
    
    // Sync to Supabase - first check if table exists
    try {
      // Get existing equipment items
      const { data: existingData, error: fetchError } = await supabase
        .from('equipment_stats')
        .select('id');
        
      if (fetchError) {
        console.error('Error fetching existing equipment:', fetchError);
        // Try to create the table or proceed with upsert
        await tryCreateEquipmentStatsTable();
      }
      
      // Get list of existing IDs
      const existingIds = (existingData || []).map(item => item.id);
      console.log('Existing equipment IDs:', existingIds);
      
      // Find IDs to delete (those in DB but not in our current list)
      const currentIds = equipment.map(e => e.id);
      const idsToDelete = existingIds.filter(id => !currentIds.includes(id));
      
      if (idsToDelete.length > 0) {
        console.log('Deleting removed equipment stats:', idsToDelete);
        // Delete equipment that are no longer in the list
        const { error: deleteError } = await supabase
          .from('equipment_stats')
          .delete()
          .in('id', idsToDelete);
          
        if (deleteError) {
          console.error('Error deleting removed equipment stats:', deleteError);
          // Continue anyway
        }
      }
      
      // If there are equipment items to upsert, do it
      if (equipment.length > 0) {
        // Prepare data for batch upsert
        const equipmentData = equipment.map(item => ({
          id: item.id,
          name: item.name,
          count: item.count,
          type: item.type,
          description: item.description
        }));
        
        console.log('Upserting equipment stats:', equipmentData);
        
        // Upsert all equipment in a single batch operation
        const { error: upsertError } = await supabase
          .from('equipment_stats')
          .upsert(equipmentData, { 
            onConflict: 'id',
            ignoreDuplicates: false
          });
        
        if (upsertError) {
          console.error('Error upserting equipment stats:', upsertError);
        }
      }
      
      console.log('Equipment saved successfully to Supabase');
    } catch (error) {
      console.error('Error syncing equipment to Supabase:', error);
      // We've still saved to localStorage, so no need to throw
    }
  } catch (error) {
    console.error('Error saving equipment:', error);
  }
};

// Try to create equipment_stats table if it doesn't exist
async function tryCreateEquipmentStatsTable() {
  try {
    // Check if the table exists, if not create it
    const { error } = await supabase.rpc('create_equipment_stats_table_if_not_exists');
    if (error) {
      console.error('Error creating equipment_stats table:', error);
    }
  } catch (error) {
    console.error('Error trying to create equipment_stats table:', error);
  }
}

export const saveMeeting = (meeting: Meeting): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.meeting, JSON.stringify(meeting));
  } catch (error) {
    console.error('Error saving meeting:', error);
  }
};

// Get data from Supabase or localStorage as fallback
export const getAnnouncements = async (): Promise<Announcement[]> => {
  try {
    console.log('Getting announcements from Supabase');
    
    // Try to get announcements from Supabase
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error fetching announcements:', error);
      throw error;
    }
    
    // If we got data from Supabase, return it
    if (data && data.length > 0) {
      console.log('Received announcements from Supabase:', data);
      return data as Announcement[];
    }
    
    console.log('No announcements found in Supabase, checking localStorage');
    
    // If no data in Supabase, try localStorage
    const stored = localStorage.getItem(STORAGE_KEYS.announcements);
    const localData = stored ? JSON.parse(stored) : DEFAULT_ANNOUNCEMENTS;
    
    // If we have data in localStorage but not in Supabase, sync it to Supabase
    if (localData.length > 0) {
      console.log('Found announcements in localStorage, syncing to Supabase:', localData);
      await saveAnnouncements(localData);
    } else {
      console.log('No announcements in localStorage either, using defaults');
    }
    
    return localData;
  } catch (error) {
    console.error('Error loading announcements:', error);
    
    // Fallback to localStorage
    console.log('Falling back to localStorage for announcements');
    const stored = localStorage.getItem(STORAGE_KEYS.announcements);
    const localData = stored ? JSON.parse(stored) : DEFAULT_ANNOUNCEMENTS;
    
    // Log what we're returning
    console.log('Returning from localStorage or defaults:', localData);
    return localData;
  }
};

// Synchronous version of getEquipment for compatibility
export const getEquipment = (): Equipment[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.equipment);
    let equipment: Equipment[] = [];
    
    try {
      if (stored) {
        const parsed = JSON.parse(stored);
        equipment = Array.isArray(parsed) ? parsed : [];
      } else {
        equipment = DEFAULT_EQUIPMENT;
      }
    } catch (parseError) {
      console.error('Error parsing equipment from localStorage:', parseError);
      equipment = DEFAULT_EQUIPMENT;
    }
    
    // Always return a copy of the array to prevent reference issues
    return Array.isArray(equipment) ? [...equipment] : [...DEFAULT_EQUIPMENT];
  } catch (error) {
    console.error('Error in synchronous getEquipment:', error);
    // Last resort fallback
    return [...DEFAULT_EQUIPMENT];
  }
};

// Async version of getEquipment that syncs with Supabase
export const getEquipmentAsync = async (): Promise<Equipment[]> => {
  try {
    console.log('Getting equipment from Supabase');
    
    // Try to get equipment from Supabase
    const { data, error } = await supabase
      .from('equipment_stats')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Supabase error fetching equipment:', error);
      throw error;
    }
    
    // If we got data from Supabase, return it
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Received equipment from Supabase:', data);
      
      // Save to localStorage as a backup
      localStorage.setItem(STORAGE_KEYS.equipment, JSON.stringify(data));
      
      return data as Equipment[];
    }
    
    console.log('No equipment found in Supabase, checking localStorage');
    
    // If no data in Supabase, try localStorage
    const stored = localStorage.getItem(STORAGE_KEYS.equipment);
    let localData: Equipment[] = [];
    
    try {
      if (stored) {
        const parsed = JSON.parse(stored);
        localData = Array.isArray(parsed) ? parsed : DEFAULT_EQUIPMENT;
      } else {
        localData = DEFAULT_EQUIPMENT;
      }
    } catch (parseError) {
      console.error('Error parsing equipment from localStorage:', parseError);
      localData = DEFAULT_EQUIPMENT;
    }
    
    // If we have data in localStorage but not in Supabase, sync it to Supabase
    if (localData.length > 0) {
      console.log('Found equipment in localStorage, syncing to Supabase:', localData);
      await saveEquipment(localData);
    } else {
      console.log('No equipment in localStorage either, using defaults');
    }
    
    return localData;
  } catch (error) {
    console.error('Error loading equipment:', error);
    
    // Fallback to localStorage
    console.log('Falling back to localStorage for equipment');
    const stored = localStorage.getItem(STORAGE_KEYS.equipment);
    let localData: Equipment[] = [];
    
    try {
      if (stored) {
        const parsed = JSON.parse(stored);
        localData = Array.isArray(parsed) ? parsed : DEFAULT_EQUIPMENT;
      } else {
        localData = DEFAULT_EQUIPMENT;
      }
    } catch (parseError) {
      console.error('Error parsing equipment from localStorage fallback:', parseError);
      localData = DEFAULT_EQUIPMENT;
    }
    
    return localData;
  }
};

export const getMeeting = (): Meeting => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.meeting);
    return stored ? JSON.parse(stored) : DEFAULT_MEETING;
  } catch (error) {
    console.error('Error loading meeting:', error);
    return DEFAULT_MEETING;
  }
};

// Emergency function to re-initialize announcements table
export const emergencyFixAnnouncements = async (): Promise<boolean> => {
  try {
    console.log('Attempting emergency fix for announcements...');
    
    // 1. Try to create a new column (this will fail if the table doesn't exist,
    // but we catch the error and continue)
    try {
      await supabase.rpc('emergency_fix_announcements');
      console.log('Successfully ran emergency_fix_announcements function');
    } catch (error) {
      console.error('Error calling emergency_fix_announcements function:', error);
      // Continue with our manual approach
    }
    
    // 2. Try to directly check if we can access the table
    const { error: checkError } = await supabase
      .from('announcements')
      .select('count(*)')
      .limit(1)
      .single();
    
    if (checkError) {
      console.error('Still having issues accessing announcements table:', checkError);
      return false;
    }
    
    // 3. Push default announcements to make sure the table has data
    const announcements = [
      {
        id: '1',
        title: 'Welcome to the Audio Club',
        content: 'We are excited to have you join our community!',
        type: 'news'
      },
      {
        id: '2',
        title: 'New Features',
        content: 'Check out our equipment borrowing system and shop with points.',
        type: 'news'
      }
    ];
    
    console.log('Pushing default announcements:', announcements);
    
    const { error: upsertError } = await supabase
      .from('announcements')
      .upsert(announcements, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error('Error upserting default announcements:', upsertError);
      return false;
    }
    
    console.log('Successfully fixed announcements table');
    return true;
  } catch (error) {
    console.error('Emergency fix for announcements failed:', error);
    return false;
  }
}; 