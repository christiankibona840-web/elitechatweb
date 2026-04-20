import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from '@/components/Avatar';
import { X, Search, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface GameInviteModalProps {
  me: Profile;
  preselectedContactId?: string | null;
  onClose: () => void;
  onInvited?: (toUserId: string) => void;
}

const GameInviteModal = ({ me, preselectedContactId, onClose, onInvited }: GameInviteModalProps) => {
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('contact_id, profiles!contacts_contact_id_fkey(*)')
        .eq('user_id', me.id);
      const list = (data || [])
        .map((c: { profiles: unknown }) => c.profiles as Profile)
        .filter(Boolean);
      setContacts(list);
      setLoading(false);

      // If preselected, send right away
      if (preselectedContactId && list.some(c => c.id === preselectedContactId)) {
        sendInvite(preselectedContactId);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  const sendInvite = async (toUserId: string) => {
    setSendingTo(toUserId);
    // Cancel any of my own previous pending invites to this user
    await supabase
      .from('game_invites')
      .update({ status: 'cancelled' })
      .eq('from_user', me.id)
      .eq('to_user', toUserId)
      .eq('status', 'pending');

    const { error } = await supabase.from('game_invites').insert({
      from_user: me.id,
      to_user: toUserId,
      status: 'pending',
    });
    setSendingTo(null);
    if (error) {
      toast.error('Could not send invite');
      console.error(error);
      return;
    }
    toast.success('Game invite sent! 🎮');
    onInvited?.(toUserId);
    onClose();
  };

  const filtered = contacts.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.username || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-app-panel border border-border shadow-elegant flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="text-primary" size={20} />
            <h2 className="font-display text-base font-semibold text-foreground">Challenge a bestie</h2>
          </div>
          <button onClick={onClose} className="text-app-icon hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-app-input-bg rounded-full px-3.5 py-2">
            <Search size={15} className="text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search your besties..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4 text-muted-foreground">
              <div className="text-4xl mb-2">👯</div>
              <p className="text-sm">
                {contacts.length === 0
                  ? 'Add contacts first to challenge them.'
                  : 'No besties match your search.'}
              </p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => sendInvite(c.id)}
                disabled={sendingTo === c.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-app-input-bg disabled:opacity-50"
              >
                <Avatar name={c.display_name} size={42} avatarUrl={c.avatar_url || undefined} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{c.display_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.is_online ? <span className="text-app-online">● Online</span> : '@' + c.username}
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {sendingTo === c.id ? '...' : 'Invite'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInviteModal;
