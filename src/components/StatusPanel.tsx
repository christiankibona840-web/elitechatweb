import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { Plus, X, Eye, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface StatusPanelProps {
  me: Profile;
}

interface StatusGroup {
  user: { id: string; display_name: string };
  statuses: any[];
}

const StatusPanel = ({ me }: StatusPanelProps) => {
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [viewing, setViewing] = useState<StatusGroup | null>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadStatuses(); }, []);

  const loadStatuses = async () => {
    const { data } = await supabase
      .from('statuses')
      .select('*, profiles!statuses_user_id_fkey(id, display_name)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    if (!data) return;
    const mine = data.filter(s => s.user_id === me.id);
    setMyStatuses(mine);
    const othersMap = new Map<string, StatusGroup>();
    for (const s of data) {
      if (s.user_id === me.id) continue;
      const prof = (s as any).profiles;
      if (!othersMap.has(s.user_id)) {
        othersMap.set(s.user_id, { user: { id: prof.id, display_name: prof.display_name }, statuses: [] });
      }
      othersMap.get(s.user_id)!.statuses.push(s);
    }
    setGroups(Array.from(othersMap.values()));
  };

  const postStatus = async () => {
    if (!text.trim() && !file) return;
    setPosting(true);
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    if (file) {
      const path = `statuses/${me.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('chat-files').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);
        mediaUrl = publicUrl;
        mediaType = file.type;
      }
    }
    await supabase.from('statuses').insert({ user_id: me.id, content: text.trim() || null, media_url: mediaUrl, media_type: mediaType });
    setText(''); setFile(null); setShowAdd(false); setPosting(false);
    toast.success('Status posted!');
    loadStatuses();
  };

  const deleteStatus = async (statusId: string) => {
    await supabase.from('statuses').delete().eq('id', statusId);
    toast.success('Status deleted');
    loadStatuses();
  };

  const viewStatus = async (group: StatusGroup) => {
    setViewing(group);
    setViewIdx(0);
    for (const s of group.statuses) {
      await supabase.from('status_views').upsert({ status_id: s.id, viewer_id: me.id }, { onConflict: 'status_id,viewer_id' });
    }
  };

  const loadViewers = async (statusId: string) => {
    const { data } = await supabase
      .from('status_views')
      .select('*, profiles!status_views_viewer_id_fkey(display_name)')
      .eq('status_id', statusId);
    setViewers(data || []);
    setShowViewers(true);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-3 w-full text-left">
          <div className="relative">
            <Avatar name={me.display_name} size={50} avatarUrl={me.avatar_url} />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-app-panel">
              <Plus size={12} className="text-primary-foreground" />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">My Status</div>
            <div className="text-xs text-muted-foreground">
              {myStatuses.length > 0 ? `${myStatuses.length} status update(s)` : 'Tap to add status'}
            </div>
          </div>
        </button>
      </div>

      {myStatuses.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your statuses</div>
          {myStatuses.map(s => (
            <div key={s.id} className="flex items-center justify-between py-1.5">
              <div className="text-xs text-foreground truncate flex-1">{s.content || '📷 Media'}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => loadViewers(s.id)} className="text-app-icon hover:text-primary p-1" title="View viewers"><Eye size={14} /></button>
                <button onClick={() => deleteStatus(s.id)} className="text-app-icon hover:text-destructive p-1" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <div className="px-4 py-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Recent updates</div>
          {groups.map(g => (
            <button key={g.user.id} onClick={() => viewStatus(g)} className="flex items-center gap-3 py-2.5 w-full text-left hover:bg-app-input-bg rounded-lg px-2 transition-colors">
              <div className="ring-2 ring-primary rounded-full p-0.5">
                <Avatar name={g.user.display_name} size={44} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{g.user.display_name}</div>
                <div className="text-xs text-muted-foreground">{g.statuses.length} update(s)</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && myStatuses.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">No recent status updates</div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="bg-popover border border-border rounded-2xl w-[360px] max-w-[90vw] shadow-2xl">
            <div className="flex items-center justify-between p-5 pb-3.5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">📸 Add Status</h3>
              <button onClick={() => setShowAdd(false)} className="text-app-icon hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <textarea className="bg-app-input-bg text-foreground border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full resize-none" placeholder="Write your status..." rows={3} value={text} onChange={e => setText(e.target.value)} autoFocus />
              <input type="file" ref={fileRef} className="hidden" accept="image/*,video/*" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ImageIcon size={16} /> {file ? file.name : 'Add photo/video'}
              </button>
            </div>
            <div className="flex gap-2.5 justify-end p-5 pt-3.5 border-t border-border">
              <button onClick={() => setShowAdd(false)} className="bg-app-input-bg text-foreground rounded-lg px-4 py-2 text-sm">Cancel</button>
              <button onClick={postStatus} disabled={posting || (!text.trim() && !file)} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-app-primary-dark transition-colors disabled:opacity-50">
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="absolute top-4 right-4">
            <button onClick={() => setViewing(null)} className="text-foreground/80 hover:text-foreground"><X size={24} /></button>
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-3">
            <Avatar name={viewing.user.display_name} size={40} />
            <div className="text-sm text-foreground">{viewing.user.display_name}</div>
          </div>
          <div className="absolute top-16 left-4 right-4 flex gap-1">
            {viewing.statuses.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-foreground/30">
                <div className={`h-full rounded-full bg-foreground transition-all ${i <= viewIdx ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>
          <div className="max-w-lg w-full px-4 text-center" onClick={() => { if (viewIdx < viewing.statuses.length - 1) setViewIdx(viewIdx + 1); else setViewing(null); }}>
            {viewing.statuses[viewIdx]?.media_url && <img src={viewing.statuses[viewIdx].media_url} className="max-h-[60vh] mx-auto rounded-xl mb-4" />}
            {viewing.statuses[viewIdx]?.content && <p className="text-xl text-foreground">{viewing.statuses[viewIdx].content}</p>}
          </div>
        </div>
      )}

      {showViewers && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setShowViewers(false); }}>
          <div className="bg-popover border border-border rounded-2xl w-[340px] max-w-[90vw] shadow-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">👁 Viewed by ({viewers.length})</h3>
              <button onClick={() => setShowViewers(false)} className="text-app-icon hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {viewers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No views yet</div>
              ) : (
                viewers.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2">
                    <Avatar name={v.profiles?.display_name || '?'} size={36} />
                    <div className="text-sm text-foreground">{v.profiles?.display_name || 'Unknown'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPanel;
