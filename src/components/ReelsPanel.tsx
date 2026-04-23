import { useEffect, useRef, useState } from 'react';
import { Instagram, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Reel {
  id: string;
  url: string;
  position: number;
}

const ReelsPanel = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [hidden, setHidden] = useState<boolean>(() => localStorage.getItem('reels-panel-hidden') === '1');
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('reels')
      .select('id, url, position')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    setReels((data as Reel[]) || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('reels-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => load())
      .subscribe();
    const handler = () => setHidden(localStorage.getItem('reels-panel-hidden') === '1');
    window.addEventListener('reels-panel-toggle', handler);
    window.addEventListener('storage', handler);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('reels-panel-toggle', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  if (hidden) return null;

  const hide = () => {
    localStorage.setItem('reels-panel-hidden', '1');
    setHidden(true);
    window.dispatchEvent(new Event('reels-panel-toggle'));
  };

  return (
    <aside className="hidden xl:flex flex-col w-[360px] flex-shrink-0 border-l border-border bg-app-header h-screen">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-app-header z-10">
        <Instagram size={18} className="text-pink-500" />
        <h2 className="font-display text-sm font-semibold text-foreground">Latest Reels</h2>
        <a
          href="https://www.instagram.com/respect_chf/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-primary hover:underline"
        >
          @respect_chf
        </a>
        <button
          onClick={hide}
          className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          title="Hide reels panel"
          aria-label="Hide reels panel"
        >
          <X size={16} />
        </button>
      </div>

      {reels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-muted-foreground text-center">No reels yet.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {reels.map((r) => (
            <div
              key={r.id}
              className="snap-start snap-always w-full h-full flex items-center justify-center bg-black"
              style={{ height: '100%', minHeight: '100%' }}
            >
              <iframe
                src={`${r.url}embed`}
                className="w-full h-full border-0"
                scrolling="no"
                allow="encrypted-media"
                allowFullScreen
                loading="lazy"
                title="Instagram reel"
              />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};

export default ReelsPanel;
