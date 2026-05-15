import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { Plus, X, Eye, Image as ImageIcon, Trash2, Heart, MessageCircle, Send } from 'lucide-react';
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

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

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
  const [likesByStatus, setLikesByStatus] = useState<Record<string, any[]>>({});
  const [commentsByStatus, setCommentsByStatus] = useState<Record<string, any[]>>({});
  const [showLikes, setShowLikes] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
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

    // Load likes for all statuses
    const ids = data.map(s => s.id);
    if (ids.length) {
      const { data: likes } = await supabase.from('status_likes').select('*').in('status_id', ids);
      const byS: Record<string, any[]> = {};
      (likes || []).forEach(l => {
        if (!byS[l.status_id]) byS[l.status_id] = [];
        byS[l.status_id].push(l);
      });
      setLikesByStatus(byS);
    }
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
      .select('*, profiles!status_views_viewer_id_fkey(display_name, avatar_url)')
      .eq('status_id', statusId)
      .order('viewed_at', { ascending: false });
    setViewers(data || []);
    setShowViewers(true);
  };

  const toggleLike = async (statusId: string) => {
    const existing = (likesByStatus[statusId] || []).find(l => l.user_id === me.id);
    if (existing) {
      await supabase.from('status_likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('status_likes').insert({ status_id: statusId, user_id: me.id });
    }
    const { data: likes } = await supabase.from('status_likes').select('*').eq('status_id', statusId);
    setLikesByStatus(prev => ({ ...prev, [statusId]: likes || [] }));
  };

  const loadLikers = async (statusId: string) => {
    const { data } = await supabase
      .from('status_likes')
      .select('*, profiles!status_likes_user_id_fkey(display_name, avatar_url)')
      .eq('status_id', statusId)
      .order('created_at', { ascending: false });
    setViewers(data || []);
    setShowLikes(true);
  };

  const loadComments = async (statusId: string) => {
    const { data } = await supabase
      .from('status_comments')
      .select('*, profiles!status_comments_user_id_fkey(display_name, avatar_url)')
      .eq('status_id', statusId)
      .order('created_at', { ascending: true });
    setCommentsByStatus(prev => ({ ...prev, [statusId]: data || [] }));
    setShowComments(true);
  };

  const sendComment = async (statusId: string) => {
    if (!commentText.trim()) return;
    await supabase.from('status_comments').insert({ status_id: statusId, user_id: me.id, content: commentText.trim() });
    setCommentText('');
    loadComments(statusId);
    toast.success('Reply sent privately');
  };

  const currentStatus = viewing?.statuses[viewIdx];
  const currentLikes = currentStatus ? (likesByStatus[currentStatus.id] || []) : [];
  const iLiked = currentStatus ? currentLikes.some(l => l.user_id === me.id) : false;
  const isOwnViewing = viewing?.user.id === me.id;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (myStatuses.length > 0) {
              setViewing({ user: { id: me.id, display_name: me.display_name }, statuses: myStatuses });
              setViewIdx(0);
            } else {
              setShowAdd(true);
            }
          }}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div className="relative">
            <Avatar name={me.display_name} size={50} avatarUrl={me.avatar_url} />
            {myStatuses.length > 0 ? (
              <div className="absolute inset-0 rounded-full ring-2 ring-primary" />
            ) : (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-app-panel">
                <Plus size={12} className="text-primary-foreground" />
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">My Status</div>
            <div className="text-xs text-muted-foreground">
              {myStatuses.length > 0 ? `Tap to view · ${myStatuses.length} update(s)` : 'Tap to add status'}
            </div>
          </div>
        </button>
        {myStatuses.length > 0 && (
          <button
            onClick={() => setShowAdd(true)}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-app-primary-dark transition-colors"
            title="Add status"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {myStatuses.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your statuses</div>
          {myStatuses.map(s => (
            <div key={s.id} className="flex items-center justify-between py-1.5">
              <div className="text-xs text-foreground truncate flex-1">{s.content || '📷 Media'}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => loadViewers(s.id)} className="text-app-icon hover:text-primary p-1 flex items-center gap-0.5 text-xs" title="View viewers"><Eye size={14} /></button>
                <button onClick={() => loadLikers(s.id)} className="text-app-icon hover:text-pink-500 p-1 flex items-center gap-0.5 text-xs" title="View likes"><Heart size={14} /> {(likesByStatus[s.id] || []).length || ''}</button>
                <button onClick={() => loadComments(s.id)} className="text-app-icon hover:text-primary p-1" title="View private replies"><MessageCircle size={14} /></button>
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

      {viewing && currentStatus && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={() => setViewing(null)} className="text-foreground/80 hover:text-foreground"><X size={24} /></button>
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
            <Avatar name={viewing.user.display_name} size={40} />
            <div>
              <div className="text-sm text-foreground">{viewing.user.display_name}</div>
              <div className="text-xs text-foreground/60">{formatTime(currentStatus.created_at)}</div>
            </div>
          </div>
          <div className="absolute top-16 left-4 right-4 flex gap-1 z-10">
            {viewing.statuses.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-foreground/30">
                <div className={`h-full rounded-full bg-foreground transition-all ${i <= viewIdx ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>
          <div className="max-w-lg w-full px-4 text-center" onClick={() => { if (viewIdx < viewing.statuses.length - 1) setViewIdx(viewIdx + 1); else setViewing(null); }}>
            {currentStatus.media_url && <img src={currentStatus.media_url} className="max-h-[60vh] mx-auto rounded-xl mb-4" />}
            {currentStatus.content && <p className="text-xl text-foreground">{currentStatus.content}</p>}
          </div>

          {/* Action bar */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3 px-4">
            {isOwnViewing ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); loadViewers(currentStatus.id); }}
                  className="flex items-center gap-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-full px-4 py-2 text-sm backdrop-blur-md"
                >
                  <Eye size={16} /> Viewed by
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); loadLikers(currentStatus.id); }}
                  className="flex items-center gap-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-full px-4 py-2 text-sm backdrop-blur-md"
                >
                  <Heart size={16} /> {currentLikes.length} {currentLikes.length === 1 ? 'Like' : 'Likes'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); loadComments(currentStatus.id); }}
                  className="flex items-center gap-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-full px-4 py-2 text-sm backdrop-blur-md"
                >
                  <MessageCircle size={16} /> Replies
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(currentStatus.id); }}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur-md ${iLiked ? 'bg-pink-500 text-white' : 'bg-foreground/10 hover:bg-foreground/20 text-foreground'}`}
                >
                  <Heart size={16} fill={iLiked ? 'currentColor' : 'none'} /> {currentLikes.length}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); loadComments(currentStatus.id); }}
                  className="flex items-center gap-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-full px-4 py-2 text-sm backdrop-blur-md"
                >
                  <MessageCircle size={16} /> Reply privately
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showViewers && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={e => { if (e.target === e.currentTarget) setShowViewers(false); }}>
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
                    <Avatar name={v.profiles?.display_name || '?'} size={36} avatarUrl={v.profiles?.avatar_url} />
                    <div className="flex-1">
                      <div className="text-sm text-foreground">{v.profiles?.display_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{formatTime(v.viewed_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showLikes && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={e => { if (e.target === e.currentTarget) setShowLikes(false); }}>
          <div className="bg-popover border border-border rounded-2xl w-[340px] max-w-[90vw] shadow-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Heart size={16} className="text-pink-500" fill="currentColor" /> Liked by ({viewers.length})</h3>
              <button onClick={() => setShowLikes(false)} className="text-app-icon hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {viewers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No likes yet</div>
              ) : (
                viewers.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2">
                    <Avatar name={v.profiles?.display_name || '?'} size={36} avatarUrl={v.profiles?.avatar_url} />
                    <div className="flex-1">
                      <div className="text-sm text-foreground">{v.profiles?.display_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{formatTime(v.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showComments && currentStatus && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={e => { if (e.target === e.currentTarget) setShowComments(false); }}>
          <div className="bg-popover border border-border rounded-2xl w-[380px] max-w-[90vw] shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">💬 {isOwnViewing ? 'Private replies' : 'Reply privately'}</h3>
              <button onClick={() => setShowComments(false)} className="text-app-icon hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {(commentsByStatus[currentStatus.id] || []).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No replies yet</div>
              ) : (
                (commentsByStatus[currentStatus.id] || []).map((c: any) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar name={c.profiles?.display_name || '?'} size={32} avatarUrl={c.profiles?.avatar_url} />
                    <div className="flex-1 bg-app-input-bg rounded-lg px-3 py-2">
                      <div className="text-xs font-medium text-foreground">{c.profiles?.display_name || 'Unknown'}</div>
                      <div className="text-sm text-foreground">{c.content}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{formatTime(c.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {!isOwnViewing && (
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  className="flex-1 bg-app-input-bg text-foreground rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Reply privately..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendComment(currentStatus.id); }}
                  autoFocus
                />
                <button
                  onClick={() => sendComment(currentStatus.id)}
                  disabled={!commentText.trim()}
                  className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPanel;
