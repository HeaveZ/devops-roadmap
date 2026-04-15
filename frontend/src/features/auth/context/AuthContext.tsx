import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiClient, setAuthToken, setUnauthorizedHandler } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { AuthTokenResponse, User } from '../types';

interface AuthSession {
  token: string;
  user: User;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (response: AuthTokenResponse) => void;
  logout: () => void;
  setAvatar: (avatarData: string | null) => void;
}

const STORAGE_KEY = 'devops_auth_session_v2';
const LEGACY_TOKEN = 'devops_token';
const LEGACY_USERNAME = 'devops_username';
const LEGACY_AVATAR = 'devops_avatar';

const AuthContext = createContext<AuthContextValue | null>(null);

function readPersistedSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthSession;
    const legacyToken = window.localStorage.getItem(LEGACY_TOKEN);
    if (legacyToken) {
      const email = window.localStorage.getItem(LEGACY_USERNAME) ?? '';
      const avatar = window.localStorage.getItem(LEGACY_AVATAR) ?? null;
      return { token: legacyToken, user: { email, avatarData: avatar } };
    }
    return null;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null): void {
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.localStorage.removeItem(LEGACY_TOKEN);
    window.localStorage.removeItem(LEGACY_USERNAME);
    window.localStorage.removeItem(LEGACY_AVATAR);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const persisted = readPersistedSession();
    if (persisted) setAuthToken(persisted.token);
    return persisted;
  });
  const [isInitializing, setIsInitializing] = useState<boolean>(() => !!session);

  const logout = useCallback(() => {
    setSession(null);
    persistSession(null);
    setAuthToken(null);
  }, []);

  const login = useCallback((response: AuthTokenResponse) => {
    const next: AuthSession = {
      token: response.token,
      user: {
        email: response.email,
        userId: response.userId,
        avatarData: response.avatarData ?? null,
      },
    };
    setAuthToken(next.token);
    persistSession(next);
    setSession(next);
  }, []);

  const setAvatar = useCallback((avatarData: string | null) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next: AuthSession = {
        ...prev,
        user: { ...prev.user, avatarData },
      };
      persistSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Token doğrulama: mount olduktan sonra /auth/verify — token hala geçerli mi?
  useEffect(() => {
    if (!session) {
      setIsInitializing(false);
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ userId?: number | string; email?: string; avatarData?: string | null }>(
        endpoints.auth.verify,
      )
      .then(({ data }) => {
        if (cancelled) return;
        if (!data?.userId) {
          logout();
          return;
        }
        setSession((prev) =>
          prev
            ? {
                ...prev,
                user: {
                  email: data.email ?? prev.user.email,
                  userId: data.userId,
                  avatarData: data.avatarData ?? prev.user.avatarData ?? null,
                },
              }
            : prev,
        );
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isInitializing,
      login,
      logout,
      setAvatar,
    }),
    [session, isInitializing, login, logout, setAvatar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
