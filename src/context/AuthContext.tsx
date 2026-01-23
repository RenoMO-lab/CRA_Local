import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key must match AdminSettingsContext
const ADMIN_SETTINGS_STORAGE_KEY = 'monroc_admin_settings_v5';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

const DEFAULT_USERS: StoredUser[] = [
  { id: '1', name: 'Renaud', email: 'r.molinier@sonasia.monroc.com', role: 'admin', password: '4689' },
  { id: '2', name: 'Leo', email: 'leo@sonasia.monroc.com', role: 'sales', password: 'K987' },
  { id: '3', name: 'Kevin', email: 'kevin@sonasia.monroc.com', role: 'sales', password: 'K123' },
  { id: '4', name: 'Phoebe', email: 'phoebe@sonasia.monroc.com', role: 'design', password: 'P123' },
  { id: '5', name: 'Bai', email: 'bairumei@sonasia.monroc.com', role: 'costing', password: 'B345' },
  { id: '6', name: 'ZhaoHe', email: 'zhaohe@sonasia.monroc.com', role: 'design', password: 'Z678' },
];

const getUsersFromStorage = (): StoredUser[] => {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_USERS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.users) || parsed.users.length === 0) return DEFAULT_USERS;

    const requiredEmails = new Set(DEFAULT_USERS.map((u) => u.email.trim().toLowerCase()));
    const actualEmails = new Set(
      parsed.users.map((u: any) => String(u?.email ?? '').trim().toLowerCase())
    );

    // If storage still contains old demo users, force the hardcoded list.
    for (const e of requiredEmails) {
      if (!actualEmails.has(e)) return DEFAULT_USERS;
    }

    return parsed.users;
  } catch {
    return DEFAULT_USERS;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Get users from AdminSettings storage
    const users = getUsersFromStorage();
    const normalizedEmailLower = normalizedEmail.toLowerCase();

    const foundUser = users.find((u) => {
      const storedEmail = (u.email ?? '').trim().toLowerCase();
      const storedPassword = String((u as any).password ?? '').trim();
      return storedEmail === normalizedEmailLower && storedPassword === normalizedPassword;
    });

    if (foundUser) {
      const authUser: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        createdAt: new Date(),
      };
      setUser(authUser);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_user');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};