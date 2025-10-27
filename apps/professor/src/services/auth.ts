// Authentication service for AX Pro Platform
// Handles demo-only login verification and session management

import React from 'react';

export type Role = "user" | "admin";

export interface Session {
  email: string;
  userId: string;
  role: Role;
  createdAt: number;
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
  },
  'hana@tecace.com': {
    password: 'tsl1234',
    role: 'admin' as const,
    userId: 'seokhoon_kang_001'
  }
};

const SESSION_KEY = 'axpro_session';

/**
 * Attempts to log in a user with the provided credentials
 * @param email - User's email address
 * @param password - User's password
 * @returns Session | null - Session data if successful, null if failed
 */
export const login = (email: string, password: string): Session | null => {
  const normalizedEmail = email.toLowerCase().trim();
  const credentials = DEMO_CREDENTIALS[normalizedEmail as keyof typeof DEMO_CREDENTIALS];

  if (!credentials || credentials.password !== password) {
    return null;
  }

  // Create session data
  const session: Session = {
    email: normalizedEmail,
    userId: credentials.userId,
    role: credentials.role,
    createdAt: Date.now()
  };

  // Store session in sessionStorage
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Failed to store session:', error);
    return null;
  }
};

/**
 * Logs out the current user by clearing the session
 */
export const logout = (): void => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
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
    const sessionData = sessionStorage.getItem(SESSION_KEY);
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
 * Checks if the current user is authenticated for a specific role
 * @param role - The role required for access
 * @returns boolean - True if user has the required role or higher
 */
export const isAuthedFor = (role: Role): boolean => {
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

  const loginUser = (email: string, password: string) => {
    const result = login(email, password);
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
