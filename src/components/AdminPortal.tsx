import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, LogOut, Shield, Users, Search, KeyRound } from 'lucide-react';
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
}

const AdminPortal = ({ onLogout }: AdminPortalProps) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadUsers();
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

  const filtered = users.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Shield size={20} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Admin Portal</h1>
            <p className="text-xs text-muted-foreground">Manage users & settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="max-w-5xl mx-auto p-6">
        {/* Password change form */}
        {showPasswordForm && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <KeyRound size={16} className="text-primary" />
              Change Admin Password
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={changePassword}
                disabled={changingPassword}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {changingPassword ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Users size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.is_online).length}</p>
                <p className="text-xs text-muted-foreground">Online Now</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => !u.is_online).length}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search users by name, email, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Users table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">Loading users...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  filtered.map(user => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold overflow-hidden">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.display_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.display_name}</p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.is_online
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_online ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                          {user.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteUser(user.id, user.display_name)}
                          disabled={deleting === user.id}
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;
