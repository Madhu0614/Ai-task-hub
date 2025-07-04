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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

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
        .or(`owner_id.eq.${user.id},id.in.(${await this.getCollaboratorBoardIds(user.id)})`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching boards:', error);
        throw new Error(`Failed to fetch boards: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBoards:', error);
      throw error;
    }
  },

  // Get board IDs where user is a collaborator
  async getCollaboratorBoardIds(userId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('board_collaborators')
        .select('board_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching collaborator boards:', error);
        return '';
      }

      return data?.map(item => item.board_id).join(',') || '';
    } catch (error) {
      console.error('Error in getCollaboratorBoardIds:', error);
      return '';
    }
  },

  // Get a specific board
  async getBoard(boardId: string): Promise<Board | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

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
        console.error('Error fetching board:', error);
        throw new Error(`Failed to fetch board: ${error.message}`);
      }

      // Check if user has access to this board
      const hasAccess = data.owner_id === user.id || await this.isCollaborator(boardId, user.id);
      
      if (!hasAccess) {
        throw new Error('You do not have access to this board');
      }

      return data;
    } catch (error) {
      console.error('Error in getBoard:', error);
      throw error;
    }
  },

  // Check if user is a collaborator
  async isCollaborator(boardId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('board_collaborators')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', userId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  },

  // Create a new board
  async createBoard(name: string, type: string): Promise<Board> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Validate input
      if (!name || !name.trim()) {
        throw new Error('Board name is required');
      }

      if (!type) {
        throw new Error('Board type is required');
      }

      // First, ensure the user's profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found. Please try signing out and back in.');
      }

      // Create the board
      const boardData = {
        name: name.trim(),
        type: type,
        owner_id: user.id,
        starred: false,
      };

      console.log('Creating board with data:', boardData);

      const { data, error } = await supabase
        .from('boards')
        .insert(boardData)
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
        console.error('Error creating board:', error);
        throw new Error(`Failed to create board: ${error.message}`);
      }

      if (!data) {
        throw new Error('Board was created but no data was returned');
      }

      console.log('Board created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createBoard:', error);
      throw error;
    }
  },

  // Update a board
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user has permission to update this board
      const board = await this.getBoard(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      if (board.owner_id !== user.id && !(await this.isCollaborator(boardId, user.id))) {
        throw new Error('You do not have permission to update this board');
      }

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
        console.error('Error updating board:', error);
        throw new Error(`Failed to update board: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateBoard:', error);
      throw error;
    }
  },

  // Delete a board
  async deleteBoard(boardId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user is the owner
      const board = await this.getBoard(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      if (board.owner_id !== user.id) {
        throw new Error('Only the board owner can delete this board');
      }

      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (error) {
        console.error('Error deleting board:', error);
        throw new Error(`Failed to delete board: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteBoard:', error);
      throw error;
    }
  },

  // Toggle star status
  async toggleStar(boardId: string): Promise<Board> {
    try {
      // First get current starred status
      const { data: board, error: fetchError } = await supabase
        .from('boards')
        .select('starred')
        .eq('id', boardId)
        .single();

      if (fetchError || !board) {
        throw new Error('Board not found');
      }

      return this.updateBoard(boardId, { starred: !board.starred });
    } catch (error) {
      console.error('Error in toggleStar:', error);
      throw error;
    }
  },

  // Get board elements
  async getBoardElements(boardId: string): Promise<BoardElement[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user has access to this board
      const board = await this.getBoard(boardId);
      if (!board) {
        throw new Error('Board not found or access denied');
      }

      const { data, error } = await supabase
        .from('board_elements')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching board elements:', error);
        throw new Error(`Failed to fetch board elements: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBoardElements:', error);
      throw error;
    }
  },

  // Create board element
  async createElement(element: Omit<BoardElement, 'id' | 'created_at' | 'updated_at'>): Promise<BoardElement> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user has access to this board
      const board = await this.getBoard(element.board_id);
      if (!board) {
        throw new Error('Board not found or access denied');
      }

      const { data, error } = await supabase
        .from('board_elements')
        .insert(element)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating element:', error);
        throw new Error(`Failed to create element: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createElement:', error);
      throw error;
    }
  },

  // Update board element
  async updateElement(elementId: string, updates: Partial<BoardElement>): Promise<BoardElement> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('board_elements')
        .update(updates)
        .eq('id', elementId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating element:', error);
        throw new Error(`Failed to update element: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateElement:', error);
      throw error;
    }
  },

  // Delete board element
  async deleteElement(elementId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('board_elements')
        .delete()
        .eq('id', elementId);

      if (error) {
        console.error('Error deleting element:', error);
        throw new Error(`Failed to delete element: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteElement:', error);
      throw error;
    }
  },

  // Get board collaborators
  async getCollaborators(boardId: string): Promise<BoardCollaborator[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user has access to this board
      const board = await this.getBoard(boardId);
      if (!board) {
        throw new Error('Board not found or access denied');
      }

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
        console.error('Error fetching collaborators:', error);
        throw new Error(`Failed to fetch collaborators: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCollaborators:', error);
      throw error;
    }
  },

  // Add collaborator
  async addCollaborator(boardId: string, userEmail: string, role: string = 'editor'): Promise<BoardCollaborator> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user is the board owner
      const board = await this.getBoard(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      if (board.owner_id !== user.id) {
        throw new Error('Only the board owner can add collaborators');
      }

      // First find the user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        throw new Error('User not found with that email address');
      }

      // Check if user is already a collaborator
      const { data: existingCollaborator } = await supabase
        .from('board_collaborators')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', profile.id)
        .single();

      if (existingCollaborator) {
        throw new Error('User is already a collaborator on this board');
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
        console.error('Error adding collaborator:', error);
        throw new Error(`Failed to add collaborator: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in addCollaborator:', error);
      throw error;
    }
  },

  // Remove collaborator
  async removeCollaborator(boardId: string, userId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user is the board owner
      const board = await this.getBoard(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      if (board.owner_id !== user.id) {
        throw new Error('Only the board owner can remove collaborators');
      }

      const { error } = await supabase
        .from('board_collaborators')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing collaborator:', error);
        throw new Error(`Failed to remove collaborator: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in removeCollaborator:', error);
      throw error;
    }
  },
};