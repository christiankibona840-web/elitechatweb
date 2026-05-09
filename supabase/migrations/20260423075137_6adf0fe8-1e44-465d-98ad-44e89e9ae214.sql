-- Connect 4 games table
CREATE TABLE public.c4_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_red UUID NOT NULL,
  player_yellow UUID NOT NULL,
  -- 42 cells = 6 rows x 7 cols, row-major top-to-bottom
  board TEXT[] NOT NULL DEFAULT ARRAY['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
  current_turn TEXT NOT NULL DEFAULT 'R',
  status TEXT NOT NULL DEFAULT 'active',
  winner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.c4_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "C4 players see their games"
  ON public.c4_games FOR SELECT TO authenticated
  USING (auth.uid() = player_red OR auth.uid() = player_yellow);

CREATE POLICY "C4 players create games"
  ON public.c4_games FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_red OR auth.uid() = player_yellow);

CREATE POLICY "C4 players update their games"
  ON public.c4_games FOR UPDATE TO authenticated
  USING (auth.uid() = player_red OR auth.uid() = player_yellow);

-- Add a 'game_type' column to game_invites so we can reuse it for Connect 4 too
ALTER TABLE public.game_invites
  ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'ttt';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.c4_games;
