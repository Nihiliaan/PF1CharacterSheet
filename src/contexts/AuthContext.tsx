import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { loginWithProvider, logout as authLogout, linkAccount, unlinkProvider } from '../services/authService';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  handleLogin: (provider: any) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleLinkAccount: (provider: any) => Promise<void>;
  handleUnlinkProvider: (providerId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (provider: any) => {
    try {
      await loginWithProvider(provider);
    } catch (e: any) {
      throw e;
    }
  };

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (e: any) {
      throw e;
    }
  };

  const handleLinkAccount = async (provider: any) => {
    try {
      await linkAccount(provider);
    } catch (e: any) {
      throw e;
    }
  };

  const handleUnlinkProvider = async (providerId: string) => {
    try {
      await unlinkProvider(providerId);
    } catch (e: any) {
      throw e;
    }
  };

  const value = {
    user,
    loading,
    handleLogin,
    handleLogout,
    handleLinkAccount,
    handleUnlinkProvider
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
