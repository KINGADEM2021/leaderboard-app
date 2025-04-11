import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
};

export function AdminAnnouncementPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_announcement', {
        p_title: formData.title,
        p_content: formData.content
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement created successfully",
      });

      setFormData({
        title: "",
        content: "",
      });
      setShowAddForm(false);
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });

      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete announcement",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-purple-400" />
          Announcements
        </h2>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 bg-white/5 p-4 rounded-lg">
          <div>
            <Input
              placeholder="Announcement Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Textarea
              placeholder="Announcement Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Announcement
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card
            key={announcement.id}
            className="p-4 bg-white/5 border-white/10 relative group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white">{announcement.title}</h3>
                </div>
                <p className="text-white/70 text-sm whitespace-pre-wrap">{announcement.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                  <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => deleteAnnouncement(announcement.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 text-white/40 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-8 text-white/50">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No announcements yet</p>
          </div>
        )}
      </div>
    </Card>
  );
} 