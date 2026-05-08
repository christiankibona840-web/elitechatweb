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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) setAnnouncements(data as Announcement[]);
    };
    load();

    const channel = supabase
      .channel('announcements-marquee')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (dismissed || announcements.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="marquee-container bg-gradient-to-r from-primary to-[hsl(var(--app-primary-dark))] text-primary-foreground shadow-lg flex items-center gap-2 overflow-hidden">
        <div className="flex-shrink-0 pl-3 py-2 flex items-center gap-2 bg-black/15">
          <Megaphone size={16} className="animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Announcement</span>
        </div>
        <div className="flex-1 overflow-hidden py-2">
          <div className="animate-marquee text-sm">
            {announcements.map((a, i) => (
              <span key={a.id} className="inline-flex items-center gap-2 mx-8">
                <span className="w-5 h-5 rounded-full bg-white/25 overflow-hidden inline-flex items-center justify-center text-[10px] font-bold align-middle">
                  {a.admin_avatar ? (
                    <img src={a.admin_avatar} alt="" className="w-full h-full object-cover" />
                  ) : a.admin_name.charAt(0).toUpperCase()}
                </span>
                <span className="font-bold">{a.title}:</span>
                <span className="opacity-95">{a.content}</span>
                <span className="opacity-60 text-xs">— {a.admin_name}</span>
                {i < announcements.length - 1 && <span className="opacity-40">•</span>}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-2 rounded-full hover:bg-white/20 transition-colors mr-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
