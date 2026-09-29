import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPreferences, ActiveVersionInfo } from '../types.ts';

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences;
  activeCurriculum: ActiveVersionInfo | null;
  activeSchedule: ActiveVersionInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (payload: { credential?: string; email?: string; name?: string }) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  sendRegistrationOtp: (email: string, pass: string, name: string) => Promise<{ message: string; devNotice?: string; devOtp?: string }>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<void>;
  sendForgotPassword: (email: string) => Promise<{ message: string; devNotice?: string; devResetLink?: string; devResetToken?: string }>;
  verifyResetToken: (token: string) => Promise<{ valid: boolean; email?: string }>;
  resetPassword: (token: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [activeCurriculum, setActiveCurriculum] = useState<ActiveVersionInfo | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<ActiveVersionInfo | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mastery_token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const storedToken = localStorage.getItem('mastery_token');
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/auth/me', { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPreferences(data.preferences || {});
        setActiveCurriculum(data.activeCurriculum);
        setActiveSchedule(data.activeSchedule);
      } else {
        setUser(null);
        localStorage.removeItem('mastery_token');
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to authenticate session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setUser(data.user);
    if (data.token) {
      localStorage.setItem('mastery_token', data.token);
      setToken(data.token);
    }
    await fetchCurrentUser();
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, full_name: name }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    setUser(data.user);
    if (data.token) {
      localStorage.setItem('mastery_token', data.token);
      setToken(data.token);
    }
    await fetchCurrentUser();
  };

  const sendRegistrationOtp = async (email: string, pass: string, name: string) => {
    const res = await fetch('/api/auth/register/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, full_name: name }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to dispatch verification code');
    }

    return {
      message: data.message,
      devNotice: data.devNotice,
      devOtp: data.devOtp,
    };
  };

  const verifyRegistrationOtp = async (email: string, otp: string) => {
    const res = await fetch('/api/auth/register/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification code failed');
    }

    setUser(data.user);
    if (data.token) {
      localStorage.setItem('mastery_token', data.token);
      setToken(data.token);
    }
    await fetchCurrentUser();
  };

  const sendForgotPassword = async (email: string) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send reset link');
    }

    return {
      message: data.message,
      devNotice: data.devNotice,
      devResetLink: data.devResetLink,
      devResetToken: data.devResetToken,
    };
  };

  const verifyResetToken = async (tokenToCheck: string) => {
    const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(tokenToCheck)}`);
    const data = await res.json();
    if (!res.ok || !data.valid) {
      throw new Error(data.error || 'Invalid or expired reset token');
    }
    return { valid: true, email: data.email };
  };

  const resetPassword = async (tokenToUse: string, newPassword: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenToUse, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
  };

  const loginWithGoogle = async (payload: { credential?: string; email?: string; name?: string }) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Google sign-in failed');
    }

    setUser(data.user);
    if (data.token) {
      localStorage.setItem('mastery_token', data.token);
      setToken(data.token);
    }
    await fetchCurrentUser();
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('mastery_token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('mastery_token');
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const storedToken = localStorage.getItem('mastery_token');
    const res = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(newPrefs),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update preferences');
    }

    setPreferences((prev) => ({ ...prev, ...newPrefs }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        activeCurriculum,
        activeSchedule,
        token,
        isLoading,
        login,
        loginWithGoogle,
        register,
        sendRegistrationOtp,
        verifyRegistrationOtp,
        sendForgotPassword,
        verifyResetToken,
        resetPassword,
        logout,
        refreshUser: fetchCurrentUser,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
