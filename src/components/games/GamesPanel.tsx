import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from '@/components/Avatar';
import { Gamepad2, Plus, Trophy } from 'lucide-react';
import { fmtTime } from '@/lib/chatStore';
import GameInviteModal from './GameInviteModal';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface GamesPanelProps {
  me: Profile;
  onOpenGame: (gameId: string) => void;
}

interface GameItem {
  id: string;
  status: string;
  winner: string | null;
  current_turn: string;
  player_x: string;
  player_o: string;
  updated_at: string;
  opponent: Profile | null;
  iAm: 'X' | 'O';
}

const GamesPanel = ({ me, onOpenGame }: GamesPanelProps) => {
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('games')
      .select('id, status, winner, current_turn, player_x, player_o, updated_at')
      .or(`player_x.eq.${me.id},player_o.eq.${me.id}`)
      .order('updated_at', { ascending: false })
      .limit(50);

    const rows = data || [];
    const opponentIds = [
      ...new Set(rows.map(g => (g.player_x === me.id ? g.player_o : g.player_x))),
    ];
    const { data: profs } = opponentIds.length
      ? await supabase.from('profiles').select('*').in('id', opponentIds)
      : { data: [] as Profile[] };
    const byId = new Map<string, Profile>((profs || []).map(p => [p.id, p as Profile]));

    setGames(
      rows.map(g => ({
        ...g,
        opponent: byId.get(g.player_x === me.id ? g.player_o : g.player_x) || null,
        iAm: g.player_x === me.id ? 'X' : 'O',
      })) as GameItem[],
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`games-list-${me.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  const active = games.filter(g => g.status === 'active');
  const finished = games.filter(g => g.status === 'finished');

  const statusLabel = (g: GameItem) => {
    if (g.status === 'active') {
      return g.current_turn === g.iAm ? <span className="text-primary font-semibold">Your move</span> : 'Waiting…';
    }
    if (g.winner === 'draw') return <span className="text-muted-foreground">Draw 🤝</span>;
    if (g.winner === g.iAm) return <span className="text-app-online font-semibold">You won 🎉</span>;
    return <span className="text-destructive">You lost</span>;
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-primary" size={18} />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">Tic Tac Toe</h2>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Plus size={14} /> Challenge
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-10 px-4 text-muted-foreground">
            <div className="text-5xl mb-3">🎮</div>
            <p className="text-sm leading-relaxed mb-4">No games yet.<br />Challenge a bestie to a match!</p>
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus size={14} /> Pick a bestie
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <Section title="Active games">
                {active.map(g => (
                  <GameRow key={g.id} g={g} onOpen={() => onOpenGame(g.id)} status={statusLabel(g)} />
                ))}
              </Section>
            )}
            {finished.length > 0 && (
              <Section title="Past games">
                {finished.map(g => (
                  <GameRow key={g.id} g={g} onOpen={() => onOpenGame(g.id)} status={statusLabel(g)} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>

      {showInvite && (
        <GameInviteModal me={me} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
    {children}
  </div>
);

const GameRow = ({
  g,
  onOpen,
  status,
}: {
  g: GameItem;
  onOpen: () => void;
  status: React.ReactNode;
}) => (
  <button
    onClick={onOpen}
    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-app-input-bg"
  >
    <div className="relative flex-shrink-0">
      <Avatar name={g.opponent?.display_name || '?'} size={44} avatarUrl={g.opponent?.avatar_url || undefined} />
      {g.status === 'finished' && g.winner !== 'draw' && g.winner === g.iAm && (
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Trophy size={11} />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-foreground truncate">
        {g.opponent?.display_name || 'Opponent'} <span className="text-xs text-muted-foreground">· You: {g.iAm}</span>
      </div>
      <div className="text-xs">{status}</div>
    </div>
    <div className="text-[10px] text-muted-foreground flex-shrink-0">
      {g.updated_at ? fmtTime(g.updated_at) : ''}
    </div>
  </button>
);

export default GamesPanel;
