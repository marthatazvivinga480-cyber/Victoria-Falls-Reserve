import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
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
  if (loading) return <Notice>Loading your stays…</Notice>;
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
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setAccountOpen(false), [location.pathname]);
  const [error, setError] = useState('');
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link to="/" className="brand brand-image" aria-label="Victoria Falls Reserve home">
          <img src="/images/victoria-falls-reserve-logo.png" alt="Victoria Falls Reserve" />
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/hotels">Find a stay</NavLink>
          {user ? (
            <div
              className="account-menu"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setAccountOpen(false);
                  event.currentTarget.querySelector('button')?.focus();
                }
              }}
            >
              <button
                className="account-toggle"
                aria-expanded={accountOpen}
                aria-controls="account-links"
                onClick={() => setAccountOpen(!accountOpen)}
              >
                My account <span aria-hidden="true">⌄</span>
              </button>
              {accountOpen && (
                <div id="account-links" className="account-links">
                  <span className="account-name">{user.name}</span>
                  <NavLink to="/bookings">My bookings</NavLink>
                  <NavLink to="/favorites">Saved stays</NavLink>
                  <NavLink to="/profile">Profile</NavLink>
                  {user.role === 'Admin' && <NavLink to="/admin">Admin dashboard</NavLink>}
                  <button
                    className="text-button"
                    onClick={() => {
                      setAccountOpen(false);
                      void signOut().catch((e) => setError(e.message));
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
            <h2>Find a stay. Make it yours.</h2>
          </div>
          <div>
            <h3 className="footer-heading">Quick links</h3>
            <nav aria-label="Footer navigation" className="footer-nav">
              <Link to="/about">About</Link>
              <Link to="/hotels">Find a stay</Link>
              {user && <Link to="/bookings">My bookings</Link>}
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <div>
            <span>© {new Date().getFullYear()} Victoria Falls Reserve</span>
            <p className="footer-disclosure">
              Student portfolio · Demo hotel listings · Simulated payments
            </p>
          </div>
          <span>Victoria Falls, Zimbabwe · USD pricing</span>
        </div>
      </footer>
    </>
  );
}
