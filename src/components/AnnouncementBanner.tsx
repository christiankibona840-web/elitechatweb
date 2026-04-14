import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  admin_name: string;
  admin_avatar: string | null;
  created_at: string;
}

const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadLatest = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const seenKey = `announcement-seen-${data.id}`;
        if (!localStorage.getItem(seenKey)) {
          setAnnouncement(data as Announcement);
          setVisible(true);
          localStorage.setItem(seenKey, 'true');

          // Auto-dismiss after 60 seconds
          setTimeout(() => {
            setVisible(false);
          }, 60000);
        }
      }
    };
    loadLatest();
  }, []);

  if (!visible || dismissed || !announcement) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-[msg-pop_0.3s_ease-out]">
      <div className="bg-gradient-to-r from-primary to-[hsl(var(--app-primary-dark))] text-primary-foreground px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Megaphone size={20} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm">{announcement.title}</h4>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{announcement.content}</p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-xs font-bold">
              {announcement.admin_avatar ? (
                <img src={announcement.admin_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                announcement.admin_name.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-[9px] opacity-80 truncate max-w-[60px]">{announcement.admin_name}</span>
            <span className="text-[8px] opacity-60 font-medium uppercase tracking-wider">Admin</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
