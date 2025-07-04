import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  team: string;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  name: string;
  type: string;
  owner_id: string;
  starred: boolean;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface BoardElement {
  id: string;
  board_id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  stroke_width?: number;
  points?: { x: number; y: number }[];
  rotation: number;
  locked: boolean;
  kanban_data?: any;
  created_at: string;
  updated_at: string;
}

export interface BoardCollaborator {
  id: string;
  board_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: Profile;
}

export interface UserCursor {
  id: string;
  board_id: string;
  user_id: string;
  x: number;
  y: number;
  updated_at: string;
  profiles?: Profile;
}