// Authentication service for AX Pro Platform
// Handles demo-only login verification and session management

import React from 'react';
import { authenticateUser } from './authService';
import { getGroupById } from './groupService';

export type Role = "user" | "admin";

export interface Session {
  email: string;
  userId: string;
  role: Role;
  createdAt: number;
  isSuperAdmin?: boolean;
}

// Demo credentials
const DEMO_CREDENTIALS = {
  'chatbot-admin@tecace.com': {
    password: 'admin1234',
    role: 'admin' as const,
    userId: '409esj1923'
  },
  'chatbot-user@tecace.com': {
    password: 'user1234',
    role: 'user' as const,
    userId: 'user123456'
  }
};

const SESSION_KEY = 'axpro_session';

/**
 * Attempts to log in a user with the provided credentials
 * Checks database users only (no demo credentials)
 * @param email - User's email address
 * @param password - User's password
 * @returns Session | null - Session data if successful, null if failed
 */
export const login = async (email: string, password: string): Promise<Session | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    const dbUser = await authenticateUser(normalizedEmail, password);
    
    if (dbUser) {
      // Check if user is super admin
      const isSuperAdmin = dbUser['s-admin'] === true;
      
      // Create session data for database user
      const session: Session = {
        email: normalizedEmail,
        userId: dbUser.user_id,
        role: 'user' as const, // All database users get 'user' role
        createdAt: Date.now(),
        isSuperAdmin: isSuperAdmin
      };
      
      // Store session in localStorage for cross-window persistence
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        console.log('✅ Database user logged in:', session);
        return session;
      } catch (error) {
        console.error('Failed to store session:', error);
        return null;
      }
    }
    
    console.log('❌ Invalid credentials');
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

/**
 * Logs out the current user by clearing the session
 */
export const logout = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

/**
 * Retrieves the current user session
 * @returns Session | null - Current session or null if not logged in
 */
export const getSession = (): Session | null => {
  try {
    // Check localStorage first
    let sessionData = localStorage.getItem(SESSION_KEY);
    
    // If not in localStorage, check sessionStorage (migration from old version)
    if (!sessionData) {
      const oldSessionData = sessionStorage.getItem(SESSION_KEY);
      if (oldSessionData) {
        // Migrate from sessionStorage to localStorage
        try {
          localStorage.setItem(SESSION_KEY, oldSessionData);
          sessionStorage.removeItem(SESSION_KEY);
          sessionData = oldSessionData;
          console.log('✅ Migrated session from sessionStorage to localStorage');
        } catch (error) {
          console.error('Failed to migrate session:', error);
        }
      }
    }

    if (!sessionData) {
      return null;
    }

    const session: Session = JSON.parse(sessionData);
    
    // Validate session structure
    if (!session.email || !session.userId || !session.role || !session.createdAt) {
      logout(); // Clear invalid session
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    logout(); // Clear corrupted session
    return null;
  }
};

/**
 * Get user's role for a specific group based on group data from Supabase
 * @param groupId - The group ID to check
 * @returns Promise<'admin' | 'user' | null> - User's role in the group, or null if not a member
 */
export const getUserRoleForGroup = async (groupId: string): Promise<'admin' | 'user' | null> => {
  const session = getSession();
  if (!session) {
    return null;
  }

  try {
    const group = await getGroupById(groupId);
    if (!group) {
      return null;
    }

    // Check if user is the administrator
    if (group.administrator === session.userId) {
      return 'admin';
    }

    // Check if user is in the users array
    if (group.users && Array.isArray(group.users) && group.users.includes(session.userId)) {
      return 'user';
    }

    return null; // User is not a member of this group
  } catch (error) {
    console.error('Failed to get user role for group:', error);
    return null;
  }
};

/**
 * Checks if the current user is authenticated for a specific role
 * If groupId is provided, checks role based on group membership
 * Otherwise, falls back to session role
 * @param role - The role required for access
 * @param groupId - Optional group ID to check group-based role
 * @returns Promise<boolean> - True if user has the required role or higher
 */
export const isAuthedFor = async (role: Role, groupId?: string): Promise<boolean> => {
  const session = getSession();
  if (!session) {
    return false;
  }

  // If groupId is provided, check group-based role
  if (groupId) {
    const groupRole = await getUserRoleForGroup(groupId);
    if (!groupRole) {
      return false; // User is not a member of the group
    }

    // Admin has access to everything, user only has user access
    if (role === 'admin') {
      return groupRole === 'admin';
    }

    return true; // Both user and admin have user-level access
  }

  // Fall back to session role if no groupId provided
  if (role === 'admin') {
    return session.role === 'admin';
  }

  return true; // Both user and admin have user-level access
};

/**
 * Synchronous version of isAuthedFor for use in components that can't be async
 * Uses session role only (doesn't check group membership)
 * @param role - The role required for access
 * @returns boolean - True if user has the required role or higher
 */
export const isAuthedForSync = (role: Role): boolean => {
  const session = getSession();
  if (!session) {
    return false;
  }

  // Admin has access to everything, user only has user access
  if (role === 'admin') {
    return session.role === 'admin';
  }

  return true; // Both user and admin have user-level access
};

/**
 * React hook for authentication state
 * @returns Object with session, login, logout, and isAuthedFor functions
 */
export const useAuth = () => {
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    setSession(getSession());
  }, []);

  const loginUser = async (email: string, password: string) => {
    const result = await login(email, password);
    setSession(result);
    return result;
  };

  const logoutUser = () => {
    logout();
    setSession(null);
  };

  const checkAuth = (role: Role) => {
    return isAuthedFor(role);
  };

  return {
    session,
    login: loginUser,
    logout: logoutUser,
    isAuthedFor: checkAuth
  };
};
