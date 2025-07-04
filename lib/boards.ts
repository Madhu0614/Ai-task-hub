import { supabase } from './supabase';
import type { Board, BoardElement, BoardCollaborator } from './supabase';

export interface BoardTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
  thumbnail: string;
}

export const boardTemplates: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank board',
    type: 'blank',
    description: 'Start with a clean canvas',
    icon: '➕',
    thumbnail: '/templates/blank.svg'
  },
  {
    id: 'flowchart',
    name: 'Flowchart',
    type: 'flowchart',
    description: 'Visualize processes and workflows',
    icon: '📊',
    thumbnail: '/templates/flowchart.svg'
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    type: 'mindmap',
    description: 'Organize ideas and concepts',
    icon: '🧠',
    thumbnail: '/templates/mindmap.svg'
  },
  {
    id: 'kanban',
    name: 'Kanban Framework',
    type: 'kanban',
    description: 'Manage work with Kanban boards',
    icon: '📋',
    thumbnail: '/templates/kanban.svg'
  },
  {
    id: 'retrospective',
    name: 'Quick Retrospective',
    type: 'retrospective',
    description: 'Reflect on team performance',
    icon: '🔄',
    thumbnail: '/templates/retrospective.svg'
  },
  {
    id: 'brainwriting',
    name: 'Brainwriting',
    type: 'brainwriting',
    description: 'Generate ideas collaboratively',
    icon: '💡',
    thumbnail: '/templates/brainwriting.svg'
  }
];

export const boardService = {
  // Get all boards for current user
  async getBoards(): Promise<Board[]> {
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        profiles:owner_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  // Get a specific board
  async getBoard(boardId: string): Promise<Board | null> {
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        profiles:owner_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('id', boardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Board not found
      }
      throw new Error(error.message);
    }

    return data;
  },

  // Create a new board
  async createBoard(name: string, type: string): Promise<Board> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('boards')
      .insert({
        name,
        type,
        owner_id: user.id,
      })
      .select(`
        *,
        profiles:owner_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Update a board
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', boardId)
      .select(`
        *,
        profiles:owner_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Delete a board
  async deleteBoard(boardId: string): Promise<void> {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      throw new Error(error.message);
    }
  },

  // Toggle star status
  async toggleStar(boardId: string): Promise<Board> {
    // First get current starred status
    const { data: board } = await supabase
      .from('boards')
      .select('starred')
      .eq('id', boardId)
      .single();

    if (!board) {
      throw new Error('Board not found');
    }

    return this.updateBoard(boardId, { starred: !board.starred });
  },

  // Get board elements
  async getBoardElements(boardId: string): Promise<BoardElement[]> {
    const { data, error } = await supabase
      .from('board_elements')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  // Create board element
  async createElement(element: Omit<BoardElement, 'id' | 'created_at' | 'updated_at'>): Promise<BoardElement> {
    const { data, error } = await supabase
      .from('board_elements')
      .insert(element)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Update board element
  async updateElement(elementId: string, updates: Partial<BoardElement>): Promise<BoardElement> {
    const { data, error } = await supabase
      .from('board_elements')
      .update(updates)
      .eq('id', elementId)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Delete board element
  async deleteElement(elementId: string): Promise<void> {
    const { error } = await supabase
      .from('board_elements')
      .delete()
      .eq('id', elementId);

    if (error) {
      throw new Error(error.message);
    }
  },

  // Get board collaborators
  async getCollaborators(boardId: string): Promise<BoardCollaborator[]> {
    const { data, error } = await supabase
      .from('board_collaborators')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('board_id', boardId);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  // Add collaborator
  async addCollaborator(boardId: string, userEmail: string, role: string = 'editor'): Promise<BoardCollaborator> {
    // First find the user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    const { data, error } = await supabase
      .from('board_collaborators')
      .insert({
        board_id: boardId,
        user_id: profile.id,
        role,
      })
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  // Remove collaborator
  async removeCollaborator(boardId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('board_collaborators')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  },
};