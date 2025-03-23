import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { useEffect } from 'react';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  
  initializeAuth: async () => {
    try {
      set({ loading: true });
      
      // Get session from Supabase (automatically checks cookies/localStorage)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ 
          user: { 
            id: session.user.id, 
            email: session.user.email! 
          },
          loading: false
        });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ user: null, loading: false });
    }
  },
  
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Provide more user-friendly error messages
        let errorMessage = 'An error occurred during sign in';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in';
        }
        throw new Error(errorMessage);
      }

      if (data.user) {
        set({ 
          user: { 
            id: data.user.id, 
            email: data.user.email! 
          },
          error: null 
        });
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  signUp: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        // Provide more user-friendly error messages
        let errorMessage = 'An error occurred during sign up';
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered';
        } else if (error.message.includes('valid email')) {
          errorMessage = 'Please enter a valid email address';
        } else if (error.message.includes('stronger password')) {
          errorMessage = 'Please use a stronger password';
        }
        throw new Error(errorMessage);
      }

      if (data.user) {
        set({ 
          user: { 
            id: data.user.id, 
            email: data.user.email! 
          },
          error: null 
        });
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updatePassword: async (password) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  clearError: () => set({ error: null })
}));

// Set up auth state listener
export const initializeAuthListener = () => {
  const { initializeAuth } = useAuthStore.getState();
  
  // Initialize auth state on first load
  initializeAuth();
  
  // Set up a listener for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (session?.user) {
        useAuthStore.setState({ 
          user: { 
            id: session.user.id, 
            email: session.user.email! 
          },
          loading: false
        });
      } else {
        useAuthStore.setState({ user: null, loading: false });
      }
    }
  );
  
  // Return the unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};