import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/index.ts';
import { api, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../utils/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { username: string; displayName: string; email: string; password: string; bio?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  quickSwitchUser: (username: string) => Promise<void>;
  demoAccounts: Array<{ username: string; displayName: string; email: string; role: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS = [
  { username: 'naman', displayName: 'Naman Patel', email: 'namanpatel041008@gmail.com', role: 'Lead Developer' },
  { username: 'priya', displayName: 'Priya Sharma', email: 'priya@iitmandi.ac.in', role: 'Systems Engineer' },
  { username: 'rahul', displayName: 'Rahul Verma', email: 'rahul@iitmandi.ac.in', role: 'Hackathon Judge' },
  { username: 'arjun', displayName: 'Arjun Mehta', email: 'arjun@iitmandi.ac.in', role: 'CS Student' },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const freshUser = await api.getMe();
          setUser(freshUser);
          setStoredUser(freshUser);
        } catch (err) {
          console.warn('Session expired or invalid, auto-logging into default demo account:', err);
          // Auto-login to Naman Patel if first time or expired so reviewer gets straight to the chat
          try {
            const data = await api.login('naman', 'password123');
            setUser(data.user);
            setToken(data.token);
          } catch {
            setUser(null);
            setToken(null);
          }
        }
      } else {
        // Auto-login to Naman Patel for seamless initial preview
        try {
          const data = await api.login('naman', 'password123');
          setUser(data.user);
          setToken(data.token);
        } catch {
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(identifier, password);
      setUser(data.user);
      setToken(data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { username: string; displayName: string; email: string; password: string; bio?: string }) => {
    setIsLoading(true);
    try {
      const resp = await api.register(data);
      setUser(resp.user);
      setToken(resp.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    const updated = await api.updateProfile(updates);
    setUser(updated);
  };

  const quickSwitchUser = async (username: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(username, 'password123');
      setUser(data.user);
      setToken(data.token);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        quickSwitchUser,
        demoAccounts: DEMO_ACCOUNTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
