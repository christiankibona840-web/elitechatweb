import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { evaluateC4, dropRow, idx, emptyBoard, C4_ROWS, C4_COLS, type C4Board, type C4Cell } from '@/lib/connect4';
import Avatar from '@/components/Avatar';
import { ArrowLeft, RotateCcw, Trophy, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface Connect4BoardProps {
  gameId: string;
  me: Profile;
  onClose: () => void;
}

interface C4Row {
  id: string;
  board: string[];
  current_turn: string; // 'R' | 'Y'
  player_red: string;
  player_yellow: string;
  status: string;
  winner: string | null;
}

const Connect4Board = ({ gameId, me, onClose }: Connect4BoardProps) => {
  const [game, setGame] = useState<C4Row | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from('c4_games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();
    if (error) { console.error(error); return; }
    if (!data) return;
    const g = data as C4Row;
    setGame(g);
    const oppId = g.player_red === me.id ? g.player_yellow : g.player_red;
    if (!opponent || opponent.id !== oppId) {
      const { data: opp } = await supabase.from('profiles').select('*').eq('id', oppId).maybeSingle();
      if (opp) setOpponent(opp as Profile);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`c4-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'c4_games', filter: `id=eq.${gameId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const mySymbol: 'R' | 'Y' | null = useMemo(() => {
    if (!game) return null;
    if (game.player_red === me.id) return 'R';
    if (game.player_yellow === me.id) return 'Y';
    return null;
  }, [game, me.id]);

  const board: C4Board = useMemo(() => {
    if (!game) return emptyBoard();
    const b = (game.board || []).slice(0, 42);
    while (b.length < 42) b.push('');
    return b.map(c => (c === 'R' || c === 'Y' ? c : '')) as C4Board;
  }, [game]);

  const result = useMemo(() => evaluateC4(board), [board]);
  const isMyTurn = !!(game && mySymbol && game.status === 'active' && game.current_turn === mySymbol && !result.winner);

  const handleColClick = async (col: number) => {
    if (!game || !mySymbol || submitting) return;
    if (game.status !== 'active') return;
    if (game.current_turn !== mySymbol) { toast.info("It's not your turn yet"); return; }
    const row = dropRow(board, col);
    if (row < 0) { toast.info('Column is full'); return; }

    setSubmitting(true);
    const newBoard = [...board];
    newBoard[idx(row, col)] = mySymbol;
    const evalRes = evaluateC4(newBoard);
    const nextTurn = mySymbol === 'R' ? 'Y' : 'R';

    const updates: Record<string, unknown> = {
      board: newBoard,
      current_turn: evalRes.winner ? game.current_turn : nextTurn,
      updated_at: new Date().toISOString(),
    };
    if (evalRes.winner) {
      updates.status = 'finished';
      updates.winner = evalRes.winner === 'draw' ? 'draw' : evalRes.winner;
    }
    const { error } = await (supabase as any).from('c4_games').update(updates).eq('id', gameId);
    setSubmitting(false);
    if (error) { toast.error('Move failed'); console.error(error); }
  };

  const handleRematch = async () => {
    if (!game || !opponent) return;
    // Loser starts; on draw opponent starts
    const loserId = game.winner === 'R' ? game.player_yellow : game.winner === 'Y' ? game.player_red : opponent.id;
    const otherId = loserId === game.player_red ? game.player_yellow : game.player_red;
    const { data, error } = await (supabase as any)
      .from('c4_games')
      .insert({
        player_red: loserId,
        player_yellow: otherId,
        current_turn: 'R',
        status: 'active',
        board: emptyBoard(),
      })
      .select('id')
      .single();
    if (error || !data) { toast.error('Could not start rematch'); return; }
    await supabase.from('game_invites').insert({
      from_user: me.id,
      to_user: opponent.id,
      status: 'accepted',
      game_id: data.id,
      game_type: 'c4',
    } as any);
    toast.success('Rematch started!');
    window.dispatchEvent(new CustomEvent('open-game', { detail: { gameId: data.id, gameType: 'c4' } }));
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
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-app-icon hover:bg-muted/30 transition-colors" aria-label="Close game">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Avatar name={opponent?.display_name || '?'} size={40} avatarUrl={opponent?.avatar_url || undefined} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">vs {opponent?.display_name || 'Opponent'}</div>
            <div className="text-xs text-muted-foreground">
              You play <span className={`font-bold ${mySymbol === 'R' ? 'text-red-500' : 'text-yellow-400'}`}>{mySymbol === 'R' ? '🔴 Red' : '🟡 Yellow'}</span>
              {' · '}
              {game.status === 'finished'
                ? meIsWinner ? '🎉 You won!' : isDraw ? "🤝 Draw" : '😔 You lost'
                : isMyTurn ? 'Your turn' : "Opponent's turn"}
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md">
          {/* Column hover indicators */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 px-1.5 sm:px-2">
            {Array.from({ length: C4_COLS }).map((_, c) => {
              const willLand = dropRow(board, c) >= 0;
              const showHint = isMyTurn && hoverCol === c && willLand;
              return (
                <div key={c} className="aspect-square flex items-center justify-center">
                  <div className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full transition-all ${
                    showHint ? (mySymbol === 'R' ? 'bg-red-500' : 'bg-yellow-400') + ' shadow-lg' : 'bg-transparent'
                  }`} />
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="rounded-2xl bg-blue-700 p-1.5 sm:p-2.5 shadow-xl">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {board.map((cell: C4Cell, i) => {
                const col = i % C4_COLS;
                const isWinningCell = result.line?.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => handleColClick(col)}
                    onMouseEnter={() => setHoverCol(col)}
                    onMouseLeave={() => setHoverCol(null)}
                    disabled={!isMyTurn || submitting}
                    className="aspect-square rounded-full bg-blue-900/60 flex items-center justify-center disabled:cursor-not-allowed transition-transform active:scale-95"
                    aria-label={`Column ${col + 1}`}
                  >
                    {cell && (
                      <div className={`h-[88%] w-[88%] rounded-full transition-all ${
                        cell === 'R' ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-yellow-300 to-yellow-500'
                      } ${isWinningCell ? 'ring-2 ring-white shadow-lg scale-105' : ''} shadow-inner`}
                      style={{ animation: 'msg-pop 0.25s ease-out' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Result */}
          {game.status === 'finished' && (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-app-input-bg p-5 text-center">
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
              <button onClick={handleRematch} className="mt-1 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
                <RotateCcw size={16} /> Rematch
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connect4Board;
