import { supabase } from './supabase';
import type { Profile } from './supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  team: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Convert Supabase profile to User
const profileToUser = (profile: Profile): User => ({
  id: profile.id,
  email: profile.email,
  name: profile.name,
  avatar_url: profile.avatar_url,
  team: profile.team,
});

export const signUp = async (email: string, password: string, name: string): Promise<User> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Failed to create user');
  }

  // Get the profile that was created by the trigger
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Failed to create user profile');
  }

  return profileToUser(profile);
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Failed to sign in');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Failed to get user profile');
  }

  return profileToUser(profile);
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Get user profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return profileToUser(profile);
};

export const updateProfile = async (updates: Partial<Omit<User, 'id'>>): Promise<User> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error || !profile) {
    throw new Error('Failed to update profile');
  }

  return profileToUser(profile);
};

// Legacy functions for compatibility
export const login = signIn;
export const logout = signOut;