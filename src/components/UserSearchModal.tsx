import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { Search, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface UserSearchModalProps {
  me: Profile;
  onClose: () => void;
  onStartChat: (userId: string) => void;
}

const UserSearchModal = ({ me, onClose, onStartChat }: UserSearchModalProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }

    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', me.id)
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,readable_id.ilike.%${q}%`)
      .limit(20);

    setResults(data || []);
    setLoading(false);
  };

  const addAndChat = async (profile: Profile) => {
    await supabase.from('contacts').upsert({
      user_id: me.id,
      contact_id: profile.id,
    }, { onConflict: 'user_id,contact_id' });

    await supabase.from('contacts').upsert({
      user_id: profile.id,
      contact_id: me.id,
    }, { onConflict: 'user_id,contact_id' });

    toast.success(`✅ ${profile.display_name} added`);
    onStartChat(profile.id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-popover border border-border rounded-2xl w-[400px] max-w-[90vw] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">🔍 Find Users</h3>
          <button onClick={onClose} className="text-wa-icon hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        <div className="px-5 py-3">
          <div className="flex items-center gap-2 bg-wa-input-bg rounded-3xl px-3.5 py-2">
            <Search size={16} className="text-muted-foreground" />
            <input className="bg-transparent text-foreground text-sm flex-1 outline-none placeholder:text-muted-foreground" placeholder="Search by name, username, or ID..." value={query} onChange={e => searchUsers(e.target.value)} autoFocus />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading && <div className="text-center text-muted-foreground text-sm py-4">Searching...</div>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">No results found</div>
          )}
          {results.map(profile => (
            <button key={profile.id} onClick={() => addAndChat(profile)} className="flex items-center gap-3 px-3 py-2.5 w-full text-left hover:bg-wa-input-bg rounded-lg transition-colors">
              <Avatar name={profile.display_name} size={44} online={profile.is_online || false} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{profile.display_name}</div>
                <div className="text-xs text-muted-foreground">@{profile.username} · {profile.readable_id}</div>
              </div>
              <MessageCircle size={18} className="text-primary flex-shrink-0" />
            </button>
          ))}
          {!loading && query.length < 2 && (
            <div className="text-center text-muted-foreground text-xs py-6">
              Type 2+ characters to search all registered users
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;
