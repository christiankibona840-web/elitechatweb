import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, LogOut, Shield, Users, Search, KeyRound, Ban, CheckCircle, Eye, MessageCircle, Megaphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_online: boolean;
  last_seen: string;
}

interface AdminPortalProps {
  onLogout: () => void;
  onBackToChoice?: () => void;
}

const AdminPortal = ({ onLogout, onBackToChoice }: AdminPortalProps) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState<'users' | 'blocked' | 'announcements'>('users');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const loadAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setAnnouncements(data);
  };

  const publishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast({ title: 'Please fill in title and content', variant: 'destructive' });
      return;
    }
    setPublishingAnnouncement(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user?.id).single();
    const { error } = await supabase.from('announcements').insert({
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      admin_id: user?.id,
      admin_name: profile?.display_name || 'Admin',
      admin_avatar: profile?.avatar_url || null,
    });
    if (error) {
      toast({ title: 'Error publishing', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Announcement published!' });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      loadAnnouncements();
    }
    setPublishingAnnouncement(false);
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Announcement deleted' });
  };

  useEffect(() => {
    loadUsers();
    loadBlockedUsers();
    loadAnnouncements();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      toast({ title: 'Error loading users', description: error.message, variant: 'destructive' });
    } else {
      setUsers((data as AdminUser[]) || []);
    }
    setLoading(false);
  };

  const loadBlockedUsers = async () => {
    const { data } = await supabase.from('blocked_users').select('blocked_id');
    if (data) {
      setBlockedIds(new Set(data.map((b: any) => b.blocked_id)));
    }
  };

  const deleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete user "${displayName}"? This cannot be undone.`)) return;
    setDeleting(userId);
    const { error } = await supabase.rpc('admin_delete_user', { _target_user_id: userId });
    if (error) {
      toast({ title: 'Error deleting user', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User deleted', description: `${displayName} has been removed.` });
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
    setDeleting(null);
  };

  const blockUser = async (userId: string, displayName: string) => {
    const { error } = await supabase.from('blocked_users').insert({ blocker_id: (await supabase.auth.getUser()).data.user?.id, blocked_id: userId });
    if (error) {
      toast({ title: 'Error blocking user', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User blocked', description: `${displayName} has been blocked.` });
      setBlockedIds(prev => new Set(prev).add(userId));
    }
  };

  const unblockUser = async (userId: string, displayName: string) => {
    const { error } = await supabase.from('blocked_users').delete().eq('blocked_id', userId);
    if (error) {
      toast({ title: 'Error unblocking user', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User unblocked', description: `${displayName} has been unblocked.` });
      setBlockedIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password changed successfully' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    }
    setChangingPassword(false);
  };

  const filtered = users.filter(u => {
    const matchesSearch = u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
    if (tab === 'blocked') return matchesSearch && blockedIds.has(u.id);
    return matchesSearch;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatLastSeen = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return formatDate(d);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-gradient-hero border-b border-accent/30 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold ring-2 ring-accent/40">
            <Shield size={20} className="text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-brand-light tracking-tight">YST Admin Portal</h1>
            <p className="text-xs text-brand-light/70">Full control over users & settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onBackToChoice && (
            <button
              onClick={onBackToChoice}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
            >
              💬 Back to Chats
            </button>
          )}
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors text-sm"
          >
            <KeyRound size={16} />
            Change Password
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Password change form */}
        {showPasswordForm && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <KeyRound size={16} className="text-primary" />
              Change Admin Password
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
              <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
              <button onClick={changePassword} disabled={changingPassword}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {changingPassword ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                <Users size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-app-online/15 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-app-online animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{users.filter(u => u.is_online).length}</p>
                <p className="text-xs text-muted-foreground">Online Now</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/40 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{users.filter(u => !u.is_online).length}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 hover:border-destructive/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                <Ban size={18} className="text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{blockedIds.size}</p>
                <p className="text-xs text-muted-foreground">Blocked</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          <button onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            <Users size={14} className="inline mr-1.5" /> All Users
          </button>
          <button onClick={() => setTab('blocked')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'blocked' ? 'bg-destructive text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            <Ban size={14} className="inline mr-1.5" /> Blocked ({blockedIds.size})
          </button>
          <button onClick={() => setTab('announcements')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'announcements' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            <Megaphone size={14} className="inline mr-1.5" /> Announcements
          </button>
        </div>

        {tab === 'announcements' ? (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Megaphone size={16} className="text-primary" /> Publish Announcement
              </h3>
              <input
                placeholder="Announcement title..."
                value={announcementTitle}
                onChange={e => setAnnouncementTitle(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors mb-3"
              />
              <textarea
                placeholder="Announcement content..."
                value={announcementContent}
                onChange={e => setAnnouncementContent(e.target.value)}
                rows={3}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors resize-none mb-3"
              />
              <button
                onClick={publishAnnouncement}
                disabled={publishingAnnouncement}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {publishingAnnouncement ? 'Publishing...' : '📢 Publish Announcement'}
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Recent Announcements</h3>
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No announcements yet</div>
              ) : (
                announcements.map(a => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                    <Megaphone size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">{a.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleString()} · by {a.admin_name}
                      </p>
                    </div>
                    <button onClick={() => deleteAnnouncement(a.id)}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
        <>


        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search users by name, email, or username..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary transition-colors" />
        </div>

        {/* User detail panel */}
        {selectedUser && (
          <div className="bg-card border border-border rounded-xl p-5 mb-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedUser.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.display_name}</h3>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Joined: {formatDate(selectedUser.created_at)}</span>
                    <span>Last seen: {formatLastSeen(selectedUser.last_seen)}</span>
                    <span className={`inline-flex items-center gap-1 ${selectedUser.is_online ? 'text-green-400' : ''}`}>
                      <span className={`w-2 h-2 rounded-full ${selectedUser.is_online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                      {selectedUser.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>
            <div className="flex gap-2 mt-4">
              {blockedIds.has(selectedUser.id) ? (
                <button onClick={() => unblockUser(selectedUser.id, selectedUser.display_name)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors text-sm">
                  <CheckCircle size={16} /> Unblock User
                </button>
              ) : (
                <button onClick={() => blockUser(selectedUser.id, selectedUser.display_name)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm">
                  <Ban size={16} /> Block User
                </button>
              )}
              <button onClick={() => deleteUser(selectedUser.id, selectedUser.display_name)}
                disabled={deleting === selectedUser.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm disabled:opacity-50">
                <Trash2 size={16} /> Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Last Seen</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">Loading users...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      {tab === 'blocked' ? 'No blocked users' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(user => (
                    <tr key={user.id} className={`border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer ${blockedIds.has(user.id) ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedUser(user)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold overflow-hidden">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                user.display_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            {user.is_online && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-1.5">
                              {user.display_name}
                              {blockedIds.has(user.id) && <Ban size={12} className="text-destructive" />}
                            </p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        {blockedIds.has(user.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                            <Ban size={10} /> Blocked
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            user.is_online ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                            {user.is_online ? 'Online' : 'Offline'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatLastSeen(user.last_seen)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {blockedIds.has(user.id) ? (
                            <button onClick={() => unblockUser(user.id, user.display_name)}
                              className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="Unblock user">
                              <CheckCircle size={16} />
                            </button>
                          ) : (
                            <button onClick={() => blockUser(user.id, user.display_name)}
                              className="p-2 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors" title="Block user">
                              <Ban size={16} />
                            </button>
                          )}
                          <button onClick={() => deleteUser(user.id, user.display_name)} disabled={deleting === user.id}
                            className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50" title="Delete user">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default AdminPortal;
