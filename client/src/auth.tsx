import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, body, refresh, setToken } from './api';
import type { User } from './types';
interface Auth {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    refresh()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  async function signIn(email: string, password: string, name?: string) {
    const data = await api<{ user: User; accessToken: string }>(
      name ? '/auth/register' : '/auth/login',
      { method: 'POST', body: body({ email, password, ...(name ? { name } : {}) }) },
    );
    setToken(data.accessToken);
    setUser(data.user);
  }
  async function signOut() {
    await api('/auth/logout', { method: 'POST' });
    setToken();
    setUser(null);
  }
  async function reload() {
    setUser(await api<User>('/me'));
  }
  return (
    <Context.Provider value={{ user, loading, signIn, signOut, reload }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error('Missing AuthProvider');
  return context;
}
