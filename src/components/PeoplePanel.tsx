import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { UserPlus, Search, Check, Sparkles } from 'lucide-react';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Load all users
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', me.id)
      .order('username', { ascending: true });

    // Load my contacts
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
    // Upsert both ways
    await supabase.from('contacts').upsert(
      { user_id: me.id, contact_id: profile.id },
      { onConflict: 'user_id,contact_id' }
    );
    await supabase.from('contacts').upsert(
      { user_id: profile.id, contact_id: me.id },
      { onConflict: 'user_id,contact_id' }
    );
    setMyContacts(prev => new Set([...prev, profile.id]));
    toast.success(`Added ${profile.display_name}!`);
    setAddingId(null);
    onStartChat(profile.id);
  };

  const filtered = allUsers.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  // Suggested friends = users not in contacts, random-ish
  const suggested = allUsers
    .filter(u => !myContacts.has(u.id))
    .slice(0, 5);

  const contacts = filtered.filter(u => myContacts.has(u.id));
  const others = filtered.filter(u => !myContacts.has(u.id));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 bg-wa-input-bg rounded-3xl px-3.5 py-1.5">
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
          {/* Suggested Friends */}
          {!search && suggested.length > 0 && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-1.5 px-1 py-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Suggested for you</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {suggested.map(user => (
                  <button
                    key={user.id}
                    onClick={() => addContact(user)}
                    disabled={addingId === user.id}
                    className="flex flex-col items-center gap-1.5 min-w-[72px] p-2 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <Avatar name={user.display_name} size={44} avatarUrl={user.avatar_url} />
                    <span className="text-[10px] text-foreground truncate max-w-[64px]">{user.display_name}</span>
                    <span className="text-[9px] text-muted-foreground">@{user.username}</span>
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <UserPlus size={10} className="text-primary-foreground" />
                    </div>
                  </button>
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

          {/* All Others */}
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
    className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors hover:bg-wa-input-bg"
  >
    <Avatar name={user.display_name} size={44} avatarUrl={user.avatar_url} />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-foreground truncate">{user.display_name}</div>
      <div className="text-xs text-muted-foreground truncate">
        @{user.username}
        {user.gender ? ` · ${user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : ''}` : ''}
        {user.is_online && <span className="text-wa-online ml-1">● online</span>}
      </div>
      {user.bio && <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{user.bio}</div>}
    </div>
    {isContact ? (
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
        <Check size={14} className="text-primary" />
      </div>
    ) : (
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
        <UserPlus size={14} className="text-primary-foreground" />
      </div>
    )}
  </button>
);

export default PeoplePanel;
