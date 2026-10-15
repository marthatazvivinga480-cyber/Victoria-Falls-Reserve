import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth';
import { api, body } from '../api';
import { Notice, useResource, ResourceState } from '../components';
import { HotelCard } from './Explore';
import type { Hotel } from '../types';
export function Login({ register = false }: { register?: boolean }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const email = z.string().email().parse(data.get('email'));
      const password = z
        .string()
        .min(register ? 8 : 1)
        .max(72)
        .parse(data.get('password'));
      await signIn(email, password, register ? String(data.get('name')) : undefined);
      const next = params.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/bookings');
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? 'Enter a valid email and password (8–72 characters for registration).'
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-picture">
        <img
          src="/images/destinations/victoria-falls-rainbow.jpg"
          alt="Victoria Falls with a rainbow"
        />
        <h2>
          Your plans,
          <br />
          all in one place.
        </h2>
      </div>
      <div className="auth-form">
        <p className="eyebrow">WELCOME TO THE RESERVE</p>
        <h1>{register ? 'Create your account.' : 'Welcome back.'}</h1>
        <p>
          {register
            ? 'Save hotels, book a room, and manage your reservations.'
            : 'Sign in to manage your stays and saved places.'}
        </p>
        <form onSubmit={(e) => void submit(e)}>
          {register && (
            <label>
              Your name
              <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={register ? 8 : 1}
              maxLength={72}
            />
          </label>
          {error && <Notice error>{error}</Notice>}
          <button disabled={busy}>
            {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p>
          {register ? 'Already have an account?' : 'New to the Reserve?'}{' '}
          <Link to={`${register ? '/login' : '/register'}?${params}`}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <p className="muted">Demo: customer@vfr.example / ReserveDemo123!</p>
      </div>
    </section>
  );
}
export function Profile() {
  const { user, reload } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/me', {
        method: 'PATCH',
        body: body({ name: new FormData(e.currentTarget).get('name') }),
      });
      await reload();
      setMessage('Your profile has been updated.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section narrow">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>A little about you.</h1>
      <form className="panel stack" onSubmit={(e) => void save(e)}>
        <label>
          Full name
          <input name="name" defaultValue={user?.name} required minLength={2} maxLength={80} />
        </label>
        <label>
          Email
          <input value={user?.email || ''} disabled />
        </label>
        <p className="muted">Account role: {user?.role}</p>
        <button disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        {message && <Notice>{message}</Notice>}
        {error && <Notice error>{error}</Notice>}
      </form>
    </section>
  );
}
export function Favorites() {
  const { user } = useAuth();
  const resource = useResource<Hotel[]>('/hotels');
  const hotels = resource.data?.filter((h) => user?.favorites.includes(h._id));
  return (
    <section className="section">
      <p className="eyebrow">PLACES TO COME BACK TO</p>
      <h1>Your saved stays.</h1>
      <ResourceState {...resource} retry={resource.reload} />
      {hotels?.length ? (
        <div className="hotel-grid">
          {hotels.map((h) => (
            <HotelCard key={h._id} hotel={h} />
          ))}
        </div>
      ) : (
        !resource.loading && (
          <Notice>
            You haven’t saved a stay yet. <Link to="/hotels">Explore the collection</Link>.
          </Notice>
        )
      )}
    </section>
  );
}
