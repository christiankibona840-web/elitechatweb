import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Megaphone, ChevronDown, ChevronUp, Archive } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  admin_name: string;
  admin_avatar: string | null;
  created_at: string;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  if (diff < 60 * 24 * 7) return `${Math.floor(diff / 1440)}d ago`;
  return d.toLocaleDateString();
};

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setAnnouncements(data as Announcement[]);
    };
    load();

    const channel = supabase
      .channel('announcements-marquee')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (announcements.length === 0) return null;

  const recent = announcements.slice(0, 10);

  return (
    <>
      {/* Collapsed pill — always reachable, opens archive */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-2 right-2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity text-xs font-semibold"
          title="Show announcements"
        >
          <Megaphone size={14} className="animate-pulse" />
          <span>{announcements.length}</span>
          <ChevronDown size={12} />
        </button>
      )}

      {/* Marquee banner — relative so it pushes the app down instead of covering the sidebar / logout */}
      {!collapsed && (
        <div className="relative z-40 w-full flex-shrink-0">
          <div className="marquee-container bg-gradient-to-r from-primary to-[hsl(var(--app-primary-dark))] text-primary-foreground shadow-lg flex items-center gap-2 overflow-hidden">
            <button
              onClick={() => setShowArchive(true)}
              className="flex-shrink-0 pl-3 py-2 flex items-center gap-2 bg-black/15 hover:bg-black/25 transition-colors"
              title="View all announcements"
            >
              <Megaphone size={16} className="animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Announcements</span>
              <Archive size={12} className="opacity-80" />
            </button>
            <div className="flex-1 overflow-hidden py-2 min-w-0">
              <div className="animate-marquee text-sm">
                {recent.map((a, i) => (
                  <span key={a.id} className="inline-flex items-center gap-2 mx-8">
                    <span className="w-5 h-5 rounded-full bg-white/25 overflow-hidden inline-flex items-center justify-center text-[10px] font-bold align-middle">
                      {a.admin_avatar ? (
                        <img src={a.admin_avatar} alt="" className="w-full h-full object-cover" />
                      ) : a.admin_name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-bold">{a.title}:</span>
                    <span className="opacity-95">{a.content}</span>
                    <span className="opacity-60 text-xs">— {a.admin_name}</span>
                    {i < recent.length - 1 && <span className="opacity-40">•</span>}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowArchive(true)}
              className="flex-shrink-0 px-2 py-1 rounded-md hover:bg-white/20 transition-colors text-[10px] font-semibold hidden sm:inline-flex items-center gap-1"
              title="View all announcements"
            >
              View all
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="flex-shrink-0 mr-1 px-2 py-1 rounded-md bg-white/15 hover:bg-white/30 transition-colors flex items-center gap-1 text-[10px] font-semibold"
              aria-label="Close announcements"
              title="Close (you can reopen anytime from the floating bell)"
            >
              <X size={14} />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>
      )}

      {/* Archive modal — full history, accessible anytime */}
      {showArchive && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowArchive(false)}
        >
          <div
            className="bg-card text-card-foreground border border-border rounded-2xl shadow-elegant w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary to-[hsl(var(--app-primary-dark))] text-primary-foreground">
              <div className="flex items-center gap-2">
                <Megaphone size={18} />
                <h2 className="font-display font-bold text-lg">Announcements</h2>
                <span className="text-xs opacity-80">({announcements.length})</span>
              </div>
              <button
                onClick={() => setShowArchive(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {announcements.map(a => (
                <article key={a.id} className="px-5 py-4 hover:bg-muted/40 transition-colors">
                  <header className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-full bg-accent/30 overflow-hidden inline-flex items-center justify-center text-[10px] font-bold">
                      {a.admin_avatar ? (
                        <img src={a.admin_avatar} alt="" className="w-full h-full object-cover" />
                      ) : a.admin_name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{a.admin_name}</span>
                    <span className="text-[10px] text-muted-foreground">· {formatTime(a.created_at)}</span>
                  </header>
                  <h3 className="font-bold text-sm text-foreground mb-1">{a.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.content}</p>
                </article>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border bg-muted/30 text-[11px] text-muted-foreground text-center">
              All published announcements stay here — open them anytime.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnnouncementBanner;
