import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User,
  getToken,
  setToken,
  clearToken,
  getMe,
  getDemo,
  isOfflineError,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOutRequest,
} from '@/lib/api';
import { isMockToken, mockDemo, mockMe, mockSignIn, mockSignOut, mockSignUp } from '@/lib/mockAuth';

interface AuthContextValue {
  user: User | null;
  isDemo: boolean;
  /** True when the backend is unreachable and auth runs against the local mock store. */
  offline: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Run the live API call; fall back to the mock when the backend is down. */
async function withFallback<T>(live: () => Promise<T>, mock: () => Promise<T> | T): Promise<{ value: T; offline: boolean }> {
  try {
    return { value: await live(), offline: false };
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    return { value: await mock(), offline: true };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  const startDemo = async () => {
    const { value, offline: off } = await withFallback(getDemo, mockDemo);
    setToken(value.token);
    setUser(value.user);
    setOffline(off);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = getToken();
      if (token && isMockToken(token)) {
        const me = mockMe(token);
        if (me) {
          if (cancelled) return;
          setUser(me);
          setOffline(true);
          setLoading(false);
          return;
        }
        clearToken();
      } else if (token) {
        try {
          const me = await getMe(token);
          if (cancelled) return;
          if (me.authenticated && me.user) {
            setUser(me.user);
            setLoading(false);
            return;
          }
          clearToken();
        } catch (err) {
          if (!isOfflineError(err)) {
            clearToken();
          } else {
            // Backend down: browse as the demo user but keep the real token so the
            // session resumes once the service is back
            if (cancelled) return;
            setUser(mockDemo().user);
            setOffline(true);
            setLoading(false);
            return;
          }
        }
      }

      try {
        if (!cancelled) await startDemo();
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setLoading(false);
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { value, offline: off } = await withFallback(
      () => apiSignIn(email, password),
      () => mockSignIn(email, password)
    );
    setToken(value.token);
    setUser(value.user);
    setOffline(off);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { value, offline: off } = await withFallback(
      () => apiSignUp(name, email, password),
      () => mockSignUp(name, email, password)
    );
    setToken(value.token);
    setUser(value.user);
    setOffline(off);
  };

  const signOut = async () => {
    const token = getToken();
    if (token && isMockToken(token)) {
      mockSignOut(token);
    } else if (token) {
      await signOutRequest(token).catch(() => undefined);
    }
    clearToken();
    try {
      await startDemo();
    } catch {
      setUser(null);
    }
  };

  const isDemo = !!user?.is_demo;

  return (
    <AuthContext.Provider value={{ user, isDemo, offline, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
