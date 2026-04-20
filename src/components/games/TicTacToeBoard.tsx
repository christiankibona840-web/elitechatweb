import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { evaluateBoard, type Board, type Cell } from '@/lib/ticTacToe';
import Avatar from '@/components/Avatar';
import { ArrowLeft, RotateCcw, Trophy, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface TicTacToeBoardProps {
  gameId: string;
  me: Profile;
  onClose: () => void;
}

interface GameRow {
  id: string;
  board: string[];
  current_turn: string; // 'X' | 'O'
  player_x: string;
  player_o: string;
  status: string; // 'active' | 'finished'
  winner: string | null;
}

const TicTacToeBoard = ({ gameId, me, onClose }: TicTacToeBoardProps) => {
  const [game, setGame] = useState<GameRow | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    if (!data) return;
    const g = data as GameRow;
    setGame(g);
    const oppId = g.player_x === me.id ? g.player_o : g.player_x;
    if (!opponent || opponent.id !== oppId) {
      const { data: opp } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', oppId)
        .maybeSingle();
      if (opp) setOpponent(opp as Profile);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const mySymbol: 'X' | 'O' | null = useMemo(() => {
    if (!game) return null;
    if (game.player_x === me.id) return 'X';
    if (game.player_o === me.id) return 'O';
    return null;
  }, [game, me.id]);

  const board: Board = useMemo(() => {
    if (!game) return ['', '', '', '', '', '', '', '', ''];
    const b = (game.board || []).slice(0, 9);
    while (b.length < 9) b.push('');
    return b.map(c => (c === 'X' || c === 'O' ? c : '')) as Board;
  }, [game]);

  const result = useMemo(() => evaluateBoard(board), [board]);
  const isMyTurn = game && mySymbol && game.status === 'active' && game.current_turn === mySymbol && !result.winner;

  const handleCellClick = async (idx: number) => {
    if (!game || !mySymbol || submitting) return;
    if (game.status !== 'active') return;
    if (board[idx] !== '') return;
    if (game.current_turn !== mySymbol) {
      toast.info("It's not your turn yet");
      return;
    }
    setSubmitting(true);
    const newBoard = [...board];
    newBoard[idx] = mySymbol;
    const evalResult = evaluateBoard(newBoard);
    const nextTurn = mySymbol === 'X' ? 'O' : 'X';

    const updates: Record<string, unknown> = {
      board: newBoard,
      current_turn: evalResult.winner ? game.current_turn : nextTurn,
      updated_at: new Date().toISOString(),
    };
    if (evalResult.winner) {
      updates.status = 'finished';
      updates.winner = evalResult.winner === 'draw' ? 'draw' : evalResult.winner;
    }

    const { error } = await supabase.from('games').update(updates).eq('id', gameId);
    setSubmitting(false);
    if (error) {
      toast.error('Move failed');
      console.error(error);
    }
  };

  const handleRematch = async () => {
    if (!game || !opponent) return;
    // Swap who starts: the previous loser starts; on draw, opponent starts
    const newPlayerX = game.winner === 'X' ? game.player_o : game.player_x;
    const newPlayerO = game.winner === 'X' ? game.player_x : game.player_o;
    const { data, error } = await supabase
      .from('games')
      .insert({
        player_x: newPlayerX,
        player_o: newPlayerO,
        current_turn: 'X',
        status: 'active',
        board: ['', '', '', '', '', '', '', '', ''],
      })
      .select('id')
      .single();
    if (error || !data) {
      toast.error('Could not start rematch');
      return;
    }
    // Notify via game_invites with accepted status pointing to the new game
    await supabase.from('game_invites').insert({
      from_user: me.id,
      to_user: opponent.id,
      status: 'accepted',
      game_id: data.id,
    });
    toast.success('Rematch started!');
    // Caller can navigate; we just reload to the new id by reusing component is tricky — emit event
    window.dispatchEvent(new CustomEvent('open-game', { detail: { gameId: data.id } }));
  };

  if (!game) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  const meIsWinner = result.winner === mySymbol;
  const isDraw = result.winner === 'draw';

  return (
    <div className="flex h-full flex-col bg-app-panel">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-app-header px-4 py-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-app-icon transition-colors hover:bg-muted/30"
          aria-label="Close game"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Avatar name={opponent?.display_name || '?'} size={40} avatarUrl={opponent?.avatar_url || undefined} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              vs {opponent?.display_name || 'Opponent'}
            </div>
            <div className="text-xs text-muted-foreground">
              You play <span className="font-bold text-primary">{mySymbol}</span>
              {' · '}
              {game.status === 'finished'
                ? meIsWinner
                  ? '🎉 You won!'
                  : isDraw
                  ? "🤝 It's a draw"
                  : '😔 You lost'
                : isMyTurn
                ? 'Your turn'
                : "Opponent's turn"}
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Turn indicator */}
          <div className="mb-4 flex items-center justify-around rounded-2xl bg-app-input-bg p-3">
            <PlayerPill
              symbol="X"
              name={game.player_x === me.id ? 'You' : opponent?.display_name || 'Opponent'}
              active={game.current_turn === 'X' && game.status === 'active'}
              isWinner={result.winner === 'X'}
            />
            <div className="text-2xl font-light text-muted-foreground">vs</div>
            <PlayerPill
              symbol="O"
              name={game.player_o === me.id ? 'You' : opponent?.display_name || 'Opponent'}
              active={game.current_turn === 'O' && game.status === 'active'}
              isWinner={result.winner === 'O'}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 aspect-square">
            {board.map((cell: Cell, idx) => {
              const isWinningCell = result.line?.includes(idx);
              const disabled = !isMyTurn || cell !== '' || game.status !== 'active' || submitting;
              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={disabled}
                  className={`aspect-square rounded-xl border-2 transition-all flex items-center justify-center text-5xl sm:text-6xl font-black select-none ${
                    isWinningCell
                      ? 'bg-primary/20 border-primary scale-105 shadow-lg'
                      : cell
                      ? 'bg-app-input-bg border-border'
                      : disabled
                      ? 'bg-app-input-bg/50 border-border cursor-not-allowed'
                      : 'bg-app-input-bg border-border hover:border-primary hover:bg-primary/10 active:scale-95'
                  } ${cell === 'X' ? 'text-primary' : cell === 'O' ? 'text-accent' : ''}`}
                  aria-label={`Cell ${idx + 1}${cell ? `, ${cell}` : ', empty'}`}
                >
                  {cell}
                </button>
              );
            })}
          </div>

          {/* Result + actions */}
          {game.status === 'finished' && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-app-input-bg p-5 text-center">
              {meIsWinner ? (
                <>
                  <Trophy className="text-accent" size={36} />
                  <div className="font-display text-xl font-bold text-foreground">Victory!</div>
                </>
              ) : isDraw ? (
                <>
                  <div className="text-3xl">🤝</div>
                  <div className="font-display text-xl font-bold text-foreground">It's a draw</div>
                </>
              ) : (
                <>
                  <XIcon className="text-destructive" size={36} />
                  <div className="font-display text-xl font-bold text-foreground">You lost this round</div>
                </>
              )}
              <button
                onClick={handleRematch}
                className="mt-1 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <RotateCcw size={16} /> Rematch
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayerPill = ({
  symbol,
  name,
  active,
  isWinner,
}: {
  symbol: 'X' | 'O';
  name: string;
  active: boolean;
  isWinner: boolean;
}) => (
  <div
    className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all ${
      active ? 'bg-primary/15 ring-2 ring-primary' : isWinner ? 'bg-accent/20 ring-2 ring-accent' : ''
    }`}
  >
    <div className={`text-2xl font-black ${symbol === 'X' ? 'text-primary' : 'text-accent'}`}>{symbol}</div>
    <div className="text-[11px] font-medium text-foreground max-w-[80px] truncate">{name}</div>
  </div>
);

export default TicTacToeBoard;
