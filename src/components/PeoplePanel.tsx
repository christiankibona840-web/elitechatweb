import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { UserPlus, Search, Check, Sparkles, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface PeoplePanelProps {
  me: Profile;
  onStartChat: (userId: string) => void;
}

const PeoplePanel = ({ me, onStartChat }: PeoplePanelProps) => {
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [myContacts, setMyContacts] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', me.id)
      .order('username', { ascending: true });

    const { data: contacts } = await supabase
      .from('contacts')
      .select('contact_id')
      .eq('user_id', me.id);

    if (users) setAllUsers(users);
    if (contacts) setMyContacts(new Set(contacts.map(c => c.contact_id)));
    setLoading(false);
  };

  const addContact = async (profile: Profile) => {
    setAddingId(profile.id);
    await supabase.from('contacts').upsert(
      { user_id: me.id, contact_id: profile.id },
      { onConflict: 'user_id,contact_id' }
    );
    await supabase.from('contacts').upsert(
      { user_id: profile.id, contact_id: me.id },
      { onConflict: 'user_id,contact_id' }
    );
    setMyContacts(prev => new Set([...prev, profile.id]));
    setDismissed(prev => { const n = new Set(prev); n.delete(profile.id); return n; });
    toast.success(`Added ${profile.display_name}!`);
    setAddingId(null);
    onStartChat(profile.id);
  };

  const dismissSuggestion = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const filtered = allUsers.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  // Suggested friends = non-contacts, not dismissed
  const suggested = allUsers
    .filter(u => !myContacts.has(u.id) && !dismissed.has(u.id))
    .slice(0, 8);

  const contacts = filtered.filter(u => myContacts.has(u.id));
  const others = filtered.filter(u => !myContacts.has(u.id));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 bg-muted rounded-3xl px-3.5 py-1.5">
          <Search size={15} className="text-muted-foreground" />
          <input
            className="bg-transparent text-foreground text-sm flex-1 outline-none placeholder:text-muted-foreground"
            placeholder="Search people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <>
          {/* IG-style Suggested Friends */}
          {!search && suggested.length > 0 && (
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between px-1 py-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-primary">Suggested for you</span>
                </div>
                <span className="text-[10px] text-muted-foreground">See All</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {suggested.map(user => (
                  <div
                    key={user.id}
                    className="relative flex flex-col items-center min-w-[100px] max-w-[100px] p-3 rounded-xl border border-border bg-card"
                  >
                    {/* Dismiss X button */}
                    <button
                      onClick={() => dismissSuggestion(user.id)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    >
                      <X size={10} className="text-muted-foreground" />
                    </button>

                    {/* Avatar with presence ring + dot (green=truly active, yellow=idle) */}
                    <div className="relative mb-2">
                      <div className={`rounded-full p-[2px] ${user.is_online ? 'bg-gradient-to-tr from-primary to-accent' : ''}`}>
                        <div className="rounded-full bg-card p-[1px]">
                          <Avatar name={user.display_name} size={52} avatarUrl={user.avatar_url} isOnline={user.is_online} lastSeen={user.last_seen} />
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-medium text-foreground truncate w-full text-center">{user.display_name}</span>
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center mb-2">@{user.username}</span>

                    {/* Follow / Add button */}
                    <button
                      onClick={() => addContact(user)}
                      disabled={addingId === user.id}
                      className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {addingId === user.id ? '...' : 'Add Friend'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Contacts */}
          {contacts.length > 0 && (
            <>
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">My Contacts ({contacts.length})</span>
              </div>
              {contacts.map(user => (
                <UserRow key={user.id} user={user} isContact onAction={() => onStartChat(user.id)} />
              ))}
            </>
          )}

          {/* All People sorted by username */}
          {others.length > 0 && (
            <>
              <div className="px-4 py-1.5 mt-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">All People ({others.length})</span>
              </div>
              {others.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  isContact={false}
                  loading={addingId === user.id}
                  onAction={() => addContact(user)}
                />
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <div className="text-3xl mb-2">🔍</div>
              No users found
            </div>
          )}
        </>
      )}
    </div>
  );
};

const UserRow = ({ user, isContact, loading, onAction }: {
  user: Profile;
  isContact: boolean;
  loading?: boolean;
  onAction: () => void;
}) => (
  <button
    onClick={onAction}
    disabled={loading}
    className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors hover:bg-muted/50"
  >
    <Avatar name={user.display_name} size={44} avatarUrl={user.avatar_url} isOnline={user.is_online} lastSeen={user.last_seen} />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-foreground truncate">{user.display_name}</div>
      <div className="text-xs text-muted-foreground truncate">
        @{user.username}
        {user.gender ? ` · ${user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : ''}` : ''}
      </div>
      {user.bio && <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{user.bio}</div>}
    </div>
    {isContact ? (
      <MessageCircle size={18} className="text-primary" />
    ) : (
      <div className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold">
        Add
      </div>
    )}
  </button>
);

export default PeoplePanel;
