import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users2, UserMinus, Crown, X, AlertTriangle, Plus, Check, Search } from 'lucide-react';

interface Group { id: string; name: string; description: string | null; created_at: string; created_by: string | null; owner_username: string | null; member_count: number; ownerless: boolean; }
interface Member { user_id: string; username: string; display_name: string; avatar_url: string | null; role: string; joined_at: string; is_owner: boolean; }

const GroupsPanel = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroup, setOpenGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [confirm, setConfirm] = useState<{ group: Group; member: Member } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; display_name: string; username: string; avatar_url: string | null }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const loadAllUsers = async () => {
    const { data } = await supabase.rpc('admin_list_users');
    if (data) setAllUsers((data as any[]).map(u => ({ id: u.id, display_name: u.display_name, username: u.username, avatar_url: u.avatar_url })));
  };

  const openCreate = () => {
    setShowCreate(true);
    setNewName(''); setNewDesc(''); setSelectedMembers([]); setUserSearch('');
    if (allUsers.length === 0) loadAllUsers();
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast({ title: 'Enter a name', variant: 'destructive' }); return; }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }
    const { data: g, error } = await supabase.from('groups')
      .insert({ name: newName.trim(), description: newDesc.trim() || null, created_by: user.id })
      .select().single();
    if (error || !g) {
      toast({ title: 'Error', description: error?.message || 'Failed to create', variant: 'destructive' });
      setCreating(false); return;
    }
    await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id, role: 'admin' });
    for (const uid of selectedMembers) {
      if (uid === user.id) continue;
      await supabase.from('group_members').insert({ group_id: g.id, user_id: uid, role: 'member' });
    }
    toast({ title: 'Group created', description: `"${newName}" with ${selectedMembers.length + 1} member(s)` });
    setShowCreate(false);
    load();
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_all_groups');
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setGroups((data as Group[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openMembers = async (g: Group) => {
    setOpenGroup(g);
    setLoadingMembers(true);
    const { data } = await supabase.rpc('admin_list_group_members', { _group_id: g.id });
    setMembers((data as Member[]) || []);
    setLoadingMembers(false);
  };

  const handleRemove = async () => {
    if (!confirm) return;
    setRemoving(true);
    const { error } = await supabase.rpc('admin_remove_from_group', {
      _target_user_id: confirm.member.user_id, _group_id: confirm.group.id,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Removed', description: `@${confirm.member.username} removed from ${confirm.group.name}` });
      setMembers(prev => prev.filter(m => m.user_id !== confirm.member.user_id));
      load();
    }
    setRemoving(false);
    setConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium">
          <Plus size={14} /> Create Group
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Group</th>
                <th className="text-left px-4 py-3 font-medium">Members</th>
                <th className="text-left px-4 py-3 font-medium">Owner</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No groups</td></tr>
              ) : groups.map(g => (
                <tr key={g.id} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-2">
                      {g.name}
                      {g.ownerless && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                          <AlertTriangle size={10} /> Ownerless
                        </span>
                      )}
                    </div>
                    {g.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{g.description}</div>}
                  </td>
                  <td className="px-4 py-3">{g.member_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.owner_username ? `@${g.owner_username}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(g.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openMembers(g)} className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium">
                      <Users2 size={12} /> View Members
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{openGroup.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{members.length} members</p>
              </div>
              <button onClick={() => { setOpenGroup(null); setMembers([]); }}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {loadingMembers ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                      {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5 truncate">
                        {m.display_name}
                        {m.is_owner && <Crown size={12} className="text-accent flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">@{m.username}</div>
                    </div>
                  </div>
                  <button onClick={() => setConfirm({ group: openGroup, member: m })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium flex-shrink-0">
                    <UserMinus size={12} /> Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5">
            <h4 className="font-semibold mb-2">Remove member?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Remove <span className="font-medium text-foreground">@{confirm.member.username}</span> from <span className="font-medium text-foreground">{confirm.group.name}</span>?
              {confirm.member.is_owner && <span className="block mt-2 text-xs text-accent">Ownership will transfer automatically.</span>}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleRemove} disabled={removing} className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50">
                {removing ? 'Removing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Users2 size={16} className="text-primary" /> Create Group</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" autoFocus />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Search size={12} /> Add members ({selectedMembers.length} selected)</label>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..."
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary mb-2" />
                <div className="border border-border rounded-lg max-h-56 overflow-y-auto">
                  {allUsers.filter(u => {
                    const q = userSearch.toLowerCase();
                    return !q || u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                  }).map(u => {
                    const sel = selectedMembers.includes(u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => setSelectedMembers(prev => sel ? prev.filter(x => x !== u.id) : [...prev, u.id])}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/20 ${sel ? 'bg-primary/10' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                          {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{u.display_name}</div>
                          <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                        </div>
                        {sel && <Check size={14} className="text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                  {allUsers.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">Loading users...</div>}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPanel;
