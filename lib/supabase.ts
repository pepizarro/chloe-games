import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type Game<S = unknown> = {
  id: string;
  type: string;
  players: string[];
  turn: string | null;
  winner: string | null;
  state: S;
  created_at: string;
  updated_at: string;
};
