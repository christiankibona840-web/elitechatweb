import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { Plus, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface StoryTrayProps {
  me: Profile;
}

interface StoryGroup {
  user: { id: string; display_name: string; avatar_url?: string | null };
  statuses: any[];
  hasUnviewed: boolean;
}

const StoryTray = ({ me }: StoryTrayProps) => {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [viewing, setViewing] = useState<StoryGroup | null>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<number | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('statuses')
      .select('*, profiles!statuses_user_id_fkey(id, display_name, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    if (!data) return;

    const { data: viewedRows } = await supabase
      .from('status_views')
      .select('status_id')
      .eq('viewer_id', me.id);
    const viewedSet = new Set((viewedRows || []).map((v: any) => v.status_id));

    const mine = data.filter(s => s.user_id === me.id);
    setMyStatuses(mine);

    const map = new Map<string, StoryGroup>();
    for (const s of data) {
      if (s.user_id === me.id) continue;
      const prof = (s as any).profiles;
      if (!prof) continue;
      if (!map.has(s.user_id)) {
        map.set(s.user_id, {
          user: { id: prof.id, display_name: prof.display_name, avatar_url: prof.avatar_url },
          statuses: [],
          hasUnviewed: false,
        });
      }
      const g = map.get(s.user_id)!;
      g.statuses.push(s);
      if (!viewedSet.has(s.id)) g.hasUnviewed = true;
    }
    // unviewed first
    const list = Array.from(map.values()).sort((a, b) => Number(b.hasUnviewed) - Number(a.hasUnviewed));
    setGroups(list);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('story-tray-statuses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  // Auto-advance like IG
  useEffect(() => {
    if (!viewing) return;
    if (progressRef.current) window.clearTimeout(progressRef.current);
    progressRef.current = window.setTimeout(() => {
      if (viewIdx < viewing.statuses.length - 1) setViewIdx(viewIdx + 1);
      else setViewing(null);
    }, 4000);
    return () => { if (progressRef.current) window.clearTimeout(progressRef.current); };
  }, [viewing, viewIdx]);

  const openStory = async (group: StoryGroup) => {
    setViewing(group);
    setViewIdx(0);
    for (const s of group.statuses) {
      await supabase.from('status_views').upsert({ status_id: s.id, viewer_id: me.id }, { onConflict: 'status_id,viewer_id' });
    }
    load();
  };

  const openMine = () => {
    if (myStatuses.length === 0) { setShowAdd(true); return; }
    setViewing({ user: { id: me.id, display_name: 'You', avatar_url: me.avatar_url }, statuses: myStatuses, hasUnviewed: false });
    setViewIdx(0);
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
    toast.success('Story posted!');
    load();
  };

  const deleteCurrentStory = async () => {
    if (!viewing) return;
    const s = viewing.statuses[viewIdx];
    if (!s || s.user_id !== me.id) return;
    if (!window.confirm('Delete this story? This cannot be undone.')) return;
    if (progressRef.current) window.clearTimeout(progressRef.current);
    const { error } = await supabase.from('statuses').delete().eq('id', s.id);
    if (error) { toast.error('Failed to delete story'); return; }
    toast.success('Story deleted');
    const remaining = viewing.statuses.filter((_, i) => i !== viewIdx);
    if (remaining.length === 0) {
      setViewing(null);
      setMyStatuses(prev => prev.filter(x => x.id !== s.id));
    } else {
      const newGroup = { ...viewing, statuses: remaining };
      setViewing(newGroup);
      setViewIdx(Math.min(viewIdx, remaining.length - 1));
      if (s.user_id === me.id) setMyStatuses(remaining);
    }
    load();
  };

  // Hide entirely if nothing & nothing to add — keep visible so user can add
  return (
    <div className="border-b border-border bg-app-panel flex-shrink-0">
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 py-3">
        {/* My story */}
        <button onClick={openMine} className="flex flex-col items-center gap-1 flex-shrink-0 group">
          <div className="relative">
            <div className={`p-[2px] rounded-full ${myStatuses.length > 0 ? 'bg-gradient-to-br from-primary via-accent to-primary' : 'bg-border'}`}>
              <div className="bg-app-panel rounded-full p-[2px]">
                <Avatar name={me.display_name} size={56} avatarUrl={me.avatar_url} />
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowAdd(true); }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-app-panel"
              aria-label="Add story"
            >
              <Plus size={12} className="text-primary-foreground" />
            </button>
          </div>
          <span className="text-[10px] text-foreground max-w-[64px] truncate">Your story</span>
        </button>

        {/* Other stories */}
        {groups.map(g => (
          <button key={g.user.id} onClick={() => openStory(g)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`p-[2px] rounded-full ${g.hasUnviewed ? 'bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400' : 'bg-border'}`}>
              <div className="bg-app-panel rounded-full p-[2px]">
                <Avatar name={g.user.display_name} size={56} avatarUrl={g.user.avatar_url} />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground max-w-[64px] truncate">{g.user.display_name}</span>
          </button>
        ))}
      </div>

      {/* Add story modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="bg-popover border border-border rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">📸 Add Story</h3>
              <button onClick={() => setShowAdd(false)} className="text-app-icon hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <textarea className="bg-app-input-bg text-foreground border border-transparent rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full resize-none" placeholder="Write your story..." rows={3} value={text} onChange={e => setText(e.target.value)} autoFocus />
              <input type="file" ref={fileRef} className="hidden" accept="image/*,video/*" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ImageIcon size={16} /> {file ? file.name : 'Add photo/video'}
              </button>
            </div>
            <div className="flex gap-2 justify-end p-4 pt-3 border-t border-border">
              <button onClick={() => setShowAdd(false)} className="bg-app-input-bg text-foreground rounded-lg px-4 py-2 text-sm">Cancel</button>
              <button onClick={postStatus} disabled={posting || (!text.trim() && !file)} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-app-primary-dark transition-colors disabled:opacity-50">
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen viewer (IG-style) */}
      {viewing && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          {/* Progress bars */}
          <div className="absolute top-3 left-3 right-3 flex gap-1">
            {viewing.statuses.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{
                    width: i < viewIdx ? '100%' : i === viewIdx ? '100%' : '0%',
                    transition: i === viewIdx ? 'width 4s linear' : 'none',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="absolute top-7 left-3 right-3 flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Avatar name={viewing.user.display_name} size={32} avatarUrl={viewing.user.avatar_url} />
              <div className="text-sm text-white font-medium">{viewing.user.display_name}</div>
            </div>
            <button onClick={() => setViewing(null)} className="text-white/80 hover:text-white"><X size={22} /></button>
          </div>

          {/* Tap zones */}
          <div className="absolute inset-0 flex">
            <button className="flex-1" onClick={() => setViewIdx(i => Math.max(0, i - 1))} aria-label="Previous" />
            <button className="flex-1" onClick={() => {
              if (viewIdx < viewing.statuses.length - 1) setViewIdx(viewIdx + 1);
              else setViewing(null);
            }} aria-label="Next" />
          </div>

          <div className="max-w-md w-full px-4 text-center pointer-events-none">
            {viewing.statuses[viewIdx]?.media_url && (
              viewing.statuses[viewIdx]?.media_type?.startsWith('video/') ? (
                <video src={viewing.statuses[viewIdx].media_url} className="max-h-[70vh] mx-auto rounded-xl mb-4" autoPlay controls={false} muted playsInline />
              ) : (
                <img src={viewing.statuses[viewIdx].media_url} alt="" className="max-h-[70vh] mx-auto rounded-xl mb-4" />
              )
            )}
            {viewing.statuses[viewIdx]?.content && <p className="text-xl text-white">{viewing.statuses[viewIdx].content}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryTray;
