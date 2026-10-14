import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
export const money = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div role={error ? 'alert' : 'status'} className={`notice ${error ? 'error' : ''}`}>
      {children}
    </div>
  );
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    api<T>(path)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path, revision]);
  return { data, error, loading, reload: () => setRevision((v) => v + 1) };
}
export function ResourceState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading) return <Notice>Preparing your escape…</Notice>;
  if (error)
    return (
      <Notice error>
        {error} <button onClick={retry}>Try again</button>
      </Notice>
    );
  return null;
}
export function Protected({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Notice>Checking your session…</Notice>;
  if (!user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (admin && user.role !== 'Admin') return <Notice error>Administrator access required.</Notice>;
  return children;
}
export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [error, setError] = useState('');
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link to="/" className="brand">
          <img src="/images/branding/logo.svg" alt="" />
          <span>
            VICTORIA FALLS<small>RESERVE</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/hotels">Find a stay</Link>
          {user ? (
            <>
              <Link to="/bookings">My bookings</Link>
              <Link to="/favorites">Saved</Link>
              <Link to="/profile">{user.name.split(' ')[0]}</Link>
              {user.role === 'Admin' && <Link to="/admin">Admin</Link>}
              <button
                className="text-button"
                onClick={() => {
                  void signOut().catch((e) => setError(e.message));
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="button small">
              Sign in
            </Link>
          )}
        </nav>
      </header>
      {error && <Notice error>{error}</Notice>}
      <main id="main">{children}</main>
      <footer>
        <div className="footer-grid">
          <div>
            <h2>
              Stay close to
              <br />
              something extraordinary.
            </h2>
            <p>Discover Victoria Falls. Stay Exceptionally.</p>
          </div>
          <div>
            <p>Thoughtfully chosen. Warmly welcomed.</p>
            <Link to="/hotels">Explore our collection →</Link>
            <p>Student portfolio • Fictional hotels • Simulated payments</p>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} Victoria Falls Reserve{' '}
          <span>Victoria Falls, Zimbabwe · USD pricing</span>
        </div>
      </footer>
    </>
  );
}
