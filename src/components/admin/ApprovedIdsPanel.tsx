import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Sparkles, Trash2, Ban, CheckCircle2, Search, X } from 'lucide-react';

interface ApprovedId {
  id: string;
  member_id: string;
  status: 'available' | 'claimed' | 'disabled';
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  created_at: string;
  claimed_username?: string | null;
}

const ApprovedIdsPanel = () => {
  const [ids, setIds] = useState<ApprovedId[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed' | 'disabled'>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [adding, setAdding] = useState(false);
  const [genPrefix, setGenPrefix] = useState('#180-');
  const [genStart, setGenStart] = useState(1);
  const [genCount, setGenCount] = useState(50);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: idsData, error } = await supabase
      .from('approved_ids')
      .select('*')
      .order('member_id', { ascending: true });
    if (error) {
      toast({ title: 'Error loading IDs', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const claimedUserIds = (idsData || []).map(i => i.claimed_by_user_id).filter(Boolean) as string[];
    let usernames: Record<string, string> = {};
    if (claimedUserIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', claimedUserIds);
      profs?.forEach(p => { usernames[p.id] = p.username; });
    }
    setIds((idsData || []).map(i => ({ ...i, claimed_username: i.claimed_by_user_id ? usernames[i.claimed_by_user_id] : null })) as ApprovedId[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const parts = bulkText.split(/[\s,;\n]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) { toast({ title: 'Enter at least one ID', variant: 'destructive' }); return; }
    setAdding(true);
    const { data, error } = await supabase.rpc('admin_add_approved_ids', { _member_ids: parts });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const ok = (data as any[]).filter((r: any) => r.success).length;
      const fail = (data as any[]).length - ok;
      toast({ title: 'IDs processed', description: `${ok} added · ${fail} skipped` });
      setBulkText('');
      setShowAdd(false);
      load();
    }
    setAdding(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const { data, error } = await supabase.rpc('admin_generate_approved_ids', {
      _prefix: genPrefix, _start: genStart, _count: genCount,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'IDs generated', description: `${data} new IDs added` });
      setShowGen(false);
      load();
    }
    setGenerating(false);
  };

  const setStatus = async (memberId: string, status: 'available' | 'disabled') => {
    const { error } = await supabase.rpc('admin_set_approved_id_status', { _member_id: memberId, _status: status });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: status === 'disabled' ? 'ID disabled' : 'ID re-enabled' });
    load();
  };

  const remove = async (memberId: string) => {
    if (!confirm(`Remove ${memberId} from the approved list?`)) return;
    const { error } = await supabase.from('approved_ids').delete().eq('member_id', memberId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'ID removed' });
    setIds(prev => prev.filter(i => i.member_id !== memberId));
  };

  const filtered = ids.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return i.member_id.toLowerCase().includes(s) || (i.claimed_username || '').toLowerCase().includes(s);
    }
    return true;
  });

  const counts = {
    all: ids.length,
    available: ids.filter(i => i.status === 'available').length,
    claimed: ids.filter(i => i.status === 'claimed').length,
    disabled: ids.filter(i => i.status === 'disabled').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Add ID
        </button>
        <button onClick={() => setShowGen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-gold text-accent-foreground rounded-lg text-sm font-semibold hover:shadow-gold-strong transition-all">
          <Sparkles size={16} /> Generate IDs
        </button>
        <div className="ml-auto flex gap-1">
          {(['all', 'available', 'claimed', 'disabled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input placeholder="Search by ID or username..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Member ID</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Claimed By</th>
                <th className="text-left px-4 py-3 font-medium">Date Added</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No IDs found</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="px-4 py-3 font-mono font-semibold">{i.member_id}</td>
                  <td className="px-4 py-3">
                    {i.status === 'available' && <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-app-online/15 text-app-online"><span className="w-1.5 h-1.5 rounded-full bg-app-online" />Available</span>}
                    {i.status === 'claimed' && <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary"><CheckCircle2 size={10} />Claimed</span>}
                    {i.status === 'disabled' && <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"><Ban size={10} />Disabled</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{i.claimed_username ? `@${i.claimed_username}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(i.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {i.status === 'claimed' && (
                        <button onClick={() => setStatus(i.member_id, 'disabled')} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" title="Disable">
                          <Ban size={14} />
                        </button>
                      )}
                      {i.status === 'disabled' && (
                        <button onClick={() => setStatus(i.member_id, 'available')} className="p-2 rounded-lg text-app-online hover:bg-app-online/10" title="Re-enable">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {i.status === 'available' && (
                        <button onClick={() => remove(i.member_id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Add Member IDs</h3>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">One ID per line, or comma-separated. Format: #180-001</p>
            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
              placeholder="#180-001&#10;#180-002&#10;#360-001"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-primary resize-none" />
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleAdd} disabled={adding} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50">{adding ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate modal */}
      {showGen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Generate Sequential IDs</h3>
              <button onClick={() => setShowGen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Prefix</label>
                <select value={genPrefix} onChange={e => setGenPrefix(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono mt-1">
                  <option value="#180-">#180-</option>
                  <option value="#360-">#360-</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Starting #</label>
                  <input type="number" min="1" max="999" value={genStart} onChange={e => setGenStart(parseInt(e.target.value) || 1)}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Count</label>
                  <input type="number" min="1" max="1000" value={genCount} onChange={e => setGenCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Will create <span className="font-mono text-foreground">{genPrefix}{String(genStart).padStart(3, '0')}</span> through <span className="font-mono text-foreground">{genPrefix}{String(genStart + genCount - 1).padStart(3, '0')}</span>
              </p>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowGen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleGenerate} disabled={generating} className="px-4 py-2 text-sm rounded-lg bg-gradient-gold text-accent-foreground font-semibold disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedIdsPanel;
