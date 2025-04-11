import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../hooks/useSupabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { toast } from '../ui/use-toast';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string;
  meeting_date: string;
  location: string;
  max_participants: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  current_participants: number;
}

export function MeetingControl() {
  const { supabase } = useSupabase();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_date: '',
    location: '',
    max_participants: '',
  });

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('upcoming_meetings')
        .select('*')
        .order('meeting_date', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meetings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (editingMeeting) {
        // Update existing meeting
        const { error } = await supabase.rpc('update_club_meeting', {
          meeting_id: editingMeeting.id,
          new_title: formData.title || undefined,
          new_description: formData.description || undefined,
          new_meeting_date: formData.meeting_date ? new Date(formData.meeting_date).toISOString() : undefined,
          new_location: formData.location || undefined,
          new_max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Meeting updated successfully',
        });
      } else {
        // Create new meeting
        const { error } = await supabase.rpc('create_club_meeting', {
          title: formData.title,
          description: formData.description,
          meeting_date: new Date(formData.meeting_date).toISOString(),
          location: formData.location,
          max_participants: parseInt(formData.max_participants) || null,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Meeting created successfully',
        });
      }

      setFormData({
        title: '',
        description: '',
        meeting_date: '',
        location: '',
        max_participants: '',
      });
      setEditingMeeting(null);
      fetchMeetings();
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingMeeting ? 'update' : 'create'} meeting`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      meeting_date: format(new Date(meeting.meeting_date), "yyyy-MM-dd'T'HH:mm"),
      location: meeting.location,
      max_participants: meeting.max_participants?.toString() || '',
    });
  };

  const handleCancel = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('club_meetings')
        .update({ status: 'cancelled' })
        .eq('id', meetingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Meeting cancelled successfully',
      });

      fetchMeetings();
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel meeting',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-gray-800 border-gray-700">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">
              {editingMeeting ? 'Edit Meeting' : 'Create New Meeting'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Title</label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Meeting Title"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Meeting Description"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Date and Time</label>
                <Input
                  required
                  type="datetime-local"
                  value={formData.meeting_date}
                  onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Location</label>
                <Input
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Meeting Location"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Max Participants</label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {loading ? 'Saving...' : editingMeeting ? 'Update Meeting' : 'Create Meeting'}
                </Button>
                {editingMeeting && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setEditingMeeting(null);
                      setFormData({
                        title: '',
                        description: '',
                        meeting_date: '',
                        location: '',
                        max_participants: '',
                      });
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </div>
        </Card>

        <Card className="mt-8 bg-gray-800 border-gray-700">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">Upcoming Meetings</h2>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <Card key={meeting.id} className="bg-gray-700 border-gray-600">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{meeting.title}</h3>
                        <p className="text-sm text-gray-300">{meeting.description}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-300">
                            📅 {format(new Date(meeting.meeting_date), 'PPP p')}
                          </p>
                          <p className="text-sm text-gray-300">📍 {meeting.location}</p>
                          <p className="text-sm text-gray-300">
                            👥 {meeting.current_participants}/
                            {meeting.max_participants || '∞'} participants
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(meeting)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(meeting.id)}
                          disabled={meeting.status === 'cancelled'}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {meetings.length === 0 && (
                <p className="text-center text-gray-400">No upcoming meetings</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 