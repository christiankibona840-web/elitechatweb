import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from '@/components/Avatar';
import { Gamepad2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface IncomingGameInviteProps {
  me: Profile;
  onOpenGame: (gameId: string) => void;
}

interface PendingInvite {
  id: string;
  from_user: string;
  fromProfile?: Profile | null;
}

const IncomingGameInvite = ({ me, onOpenGame }: IncomingGameInviteProps) => {
  const [invites, setInvites] = useState<PendingInvite[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('game_invites')
      .select('id, from_user')
      .eq('to_user', me.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    const list = (data || []) as PendingInvite[];
    // hydrate from-profile
    if (list.length > 0) {
      const ids = [...new Set(list.map(i => i.from_user))];
      const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
      const byId = new Map<string, Profile>((profs || []).map(p => [p.id, p as Profile]));
      list.forEach(i => { i.fromProfile = byId.get(i.from_user) || null; });
    }
    setInvites(list);
  };

  useEffect(() => {
    load();

    // Listen for accepted invites where I'm the inviter — auto-open the game
    const channel = supabase
      .channel(`game-invites-${me.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `to_user=eq.${me.id}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_invites', filter: `to_user=eq.${me.id}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_invites', filter: `from_user=eq.${me.id}` },
        (payload) => {
          const inv = payload.new as { status: string; game_id: string | null };
          if (inv.status === 'accepted' && inv.game_id) {
            toast.success('Your challenge was accepted! 🎮');
            onOpenGame(inv.game_id);
          } else if (inv.status === 'declined') {
            toast.info('Your challenge was declined');
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  const accept = async (invite: PendingInvite) => {
    if (!invite.fromProfile) return;
    // Create the game; inviter is X, accepter is O
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        player_x: invite.from_user,
        player_o: me.id,
        current_turn: 'X',
        status: 'active',
        board: ['', '', '', '', '', '', '', '', ''],
      })
      .select('id')
      .single();
    if (gameErr || !game) {
      toast.error('Could not start the game');
      console.error(gameErr);
      return;
    }
    await supabase
      .from('game_invites')
      .update({ status: 'accepted', game_id: game.id })
      .eq('id', invite.id);
    setInvites(prev => prev.filter(i => i.id !== invite.id));
    onOpenGame(game.id);
  };

  const decline = async (invite: PendingInvite) => {
    await supabase.from('game_invites').update({ status: 'declined' }).eq('id', invite.id);
    setInvites(prev => prev.filter(i => i.id !== invite.id));
  };

  if (invites.length === 0) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[calc(100%-1.5rem)] max-w-sm">
      {invites.slice(0, 3).map(inv => (
        <div
          key={inv.id}
          className="flex items-center gap-3 rounded-2xl bg-app-panel border border-primary/30 shadow-elegant px-3 py-2.5 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="relative flex-shrink-0">
            <Avatar
              name={inv.fromProfile?.display_name || '?'}
              size={42}
              avatarUrl={inv.fromProfile?.avatar_url || undefined}
            />
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Gamepad2 size={11} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {inv.fromProfile?.display_name || 'Someone'}
            </div>
            <div className="text-xs text-muted-foreground">wants to play Tic Tac Toe</div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => decline(inv)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              aria-label="Decline"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => accept(inv)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="Accept"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IncomingGameInvite;
