import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Instagram, Trash2, ArrowLeft, LogOut, Plus } from 'lucide-react';

interface Reel {
  id: string;
  url: string;
  position: number;
  created_at: string;
}

interface Props {
  onLogout: () => void;
  onBackToChoice?: () => void;
}

const normalizeReelUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Strip query string + ensure trailing slash, accept reel/reels/p
  try {
    const u = new URL(trimmed);
    if (!u.hostname.includes('instagram.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    // Expect ['reel'|'reels'|'p', '<id>']
    if (parts.length < 2) return null;
    const kind = parts[0];
    const id = parts[1];
    if (!['reel', 'reels', 'p'].includes(kind)) return null;
    return `https://www.instagram.com/${kind}/${id}/`;
  } catch {
    return null;
  }
};

const ReelManagerPortal = ({ onLogout, onBackToChoice }: Props) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('reels')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    setReels((data as Reel[]) || []);
  };

  useEffect(() => { load(); }, []);

  const addReel = async () => {
    const normalized = normalizeReelUrl(newUrl);
    if (!normalized) {
      toast({ title: 'Invalid Instagram URL', description: 'Paste a link like https://www.instagram.com/reel/XXXX/', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const nextPos = reels.length ? Math.max(...reels.map(r => r.position)) + 1 : 1;
    const { error } = await (supabase as any).from('reels').insert({
      url: normalized,
      added_by: user.id,
      position: nextPos,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not add reel', description: error.message, variant: 'destructive' });
      return;
    }
    setNewUrl('');
    toast({ title: 'Reel added', description: 'It will appear in the sidebar.' });
    load();
  };

  const deleteReel = async (id: string) => {
    const { error } = await (supabase as any).from('reels').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Reel removed' });
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-app-header/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {onBackToChoice && (
              <button
                onClick={onBackToChoice}
                className="rounded-lg p-2 text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <Instagram size={20} className="text-pink-500" />
            <h1 className="font-display text-lg font-semibold">Reel Portal</h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold mb-1">Add Instagram Reel</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Paste a link like <code className="px-1 py-0.5 rounded bg-muted text-xs">https://www.instagram.com/reel/XXXX/</code>
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addReel(); }}
              placeholder="https://www.instagram.com/reel/..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
            />
            <button
              onClick={addReel}
              disabled={loading || !newUrl.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-display text-base font-semibold mb-3">
            Current Reels <span className="text-muted-foreground font-normal">({reels.length})</span>
          </h2>
          {reels.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
              No reels yet. Add your first one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {reels.map(r => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/10 text-pink-500 text-xs font-semibold">
                    #{r.position}
                  </span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-sm text-primary hover:underline"
                  >
                    {r.url}
                  </a>
                  <button
                    onClick={() => deleteReel(r.id)}
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Delete reel"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReelManagerPortal;
