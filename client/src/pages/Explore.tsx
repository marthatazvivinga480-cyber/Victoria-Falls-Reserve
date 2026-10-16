import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useResource, ResourceState, Notice, money } from '../components';
import { useAuth } from '../auth';
import { api, body } from '../api';
import type { Hotel, Booking } from '../types';
export const localToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Harare',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function SearchForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const query = new URLSearchParams();
    for (const [key, value] of values) {
      const cleaned = String(value).trim().replace(/\s+/g, ' ');
      if (cleaned) query.set(key, cleaned);
    }
    navigate(`/hotels?${query}`);
  }
  return (
    <form className={`search-form ${compact ? 'compact' : ''}`} onSubmit={search}>
      <label>
        Check-in
        <input
          name="checkIn"
          type="date"
          min={localToday()}
          defaultValue={params.get('checkIn') || ''}
        />
      </label>
      <label>
        Check-out
        <input
          name="checkOut"
          type="date"
          min={localToday()}
          defaultValue={params.get('checkOut') || ''}
        />
      </label>
      <label>
        Guests
        <select className="search-dropdown" name="guests" defaultValue={params.get('guests') || '2'}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      {compact && (
        <>
          <label>
            Hotel name
            <input name="q" placeholder="Any hotel" defaultValue={params.get('q') || ''} />
          </label>
          <label>
            Max price / night
            <input
              name="maxPrice"
              type="number"
              min="1"
              placeholder="Any budget"
              defaultValue={params.get('maxPrice') || ''}
            />
          </label>
          <label>
            Amenities
            <select className="search-dropdown" name="amenity" defaultValue={params.get('amenity') || ''}>
              <option value="">All amenities</option>
              {['Pool', 'Spa', 'Breakfast', 'River views', 'Wi-Fi'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <button type="submit">
        Find your stay <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
export function HotelCard({ hotel, query = '' }: { hotel: Hotel; query?: string }) {
  return (
    <article className="hotel-card">
      <Link to={`/hotels/${hotel._id}${query}`}>
        <div className="image-wrap">
          <img src={hotel.image} alt={`${hotel.name} illustrative property photo`} loading="lazy" />
          {hotel.featured && <span className="image-tag">RESERVE COLLECTION</span>}
        </div>
        <div className="card-copy">
          <p className="eyebrow">{hotel.location}</p>
          <h3>{hotel.name}</h3>
          <p className="muted">{hotel.amenities.slice(0, 3).join(' · ')}</p>
          <div className="card-bottom">
            <span>
              From <strong>{money(hotel.fromPrice || 120)}</strong> / night
            </span>
            <span aria-hidden="true">↗</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
export function Home() {
  const resource = useResource<Hotel[]>('/hotels');
  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src="/images/destinations/hero.jpg"
          alt="Victoria Falls waterfall"
        />
        <div className="hero-copy">
          <p className="eyebrow">VICTORIA FALLS, ZIMBABWE</p>
          <h1>
            Your visit starts
            <br />
            with a place to stay.
          </h1>
          <p>Find a room for your visit to Victoria Falls.</p>
          <Link className="button light" to="/hotels">
            Explore the collection ↗
          </Link>
        </div>
        <div className="hero-note">
          17°55′S 25°51′E <span>VICTORIA FALLS, ZIMBABWE</span>
        </div>
      </section>
      <div className="search-shell">
        <SearchForm />
      </div>
      <section className="section intro home-intro">
        <p className="eyebrow">STAYS FOR DIFFERENT PLANS</p>
        <h2>
          By the river. Near the Falls.
          <br />
          Somewhere to settle in.
        </h2>
        <p>
          From riverfront mornings to golden evenings above the gorge, discover six distinctive
          retreats in the heart of Victoria Falls. Find your place, take your time, and let the
          landscape do the rest.
        </p>
      </section>
      <section className="section home-collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE THE HOTELS</p>
            <h2>Our collection of stays</h2>
          </div>
          <Link to="/hotels">View all stays ↗</Link>
        </div>
        <ResourceState {...resource} retry={resource.reload} />
        <div className="hotel-grid">
          {resource.data?.slice(0, 3).map((h) => (
            <HotelCard key={h._id} hotel={h} />
          ))}
        </div>
      </section>
      <section className="destination-strip">
        <img src="/images/destinations/river-sunset.jpg" alt="Sunset over a river" />
        <div>
          <p className="eyebrow">BEYOND YOUR ROOM</p>
          <h2>
            Feel the mist.
            <br />
            Follow the river.
          </h2>
          <p>
            The Falls are only the beginning. Discover rainforest paths, quiet riverbanks, local
            craft, and evenings by the water.
          </p>
          <Link to="/hotels" className="button">
            Find your base ↗
          </Link>
        </div>
      </section>
      <section className="section promise-grid home-promises">
        {[
          [
            '01',
            'Six distinct retreats',
            'Compare six hotel listings, their rooms, and their amenities.',
          ],
          [
            '02',
            'Know the cost before you book',
            'See nightly rates, your total, and cancellation terms before checkout.',
          ],
          [
            '03',
            'Keep your plans together',
            'Save hotels and return to your reservations from your account.',
          ],
        ].map(([n, title, text]) => (
          <div key={n}>
            <span className="eyebrow">{n}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
export function Hotels() {
  const [params] = useSearchParams();
  const resource = useResource<Hotel[]>(`/hotels?${params}`);
  return (
    <section className="section">
      <p className="eyebrow">FIND YOUR PLACE</p>
      <h1>Find your stay.</h1>
      <p className="lead">Six distinctive addresses. One extraordinary destination.</p>
      <SearchForm key={params.toString()} compact />
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && !resource.loading && (
        <>
          <p className="results-count">{resource.data.length} stays found · Prices in USD</p>
          {resource.data.length === 0 ? (
            <Notice>
              No stays match your search. Check the hotel name or try fewer filters.{' '}
              <Link to="/hotels">Clear filters and show all stays</Link>
            </Notice>
          ) : (
            <div className="hotel-grid">
              {resource.data.map((h) => (
                <HotelCard key={h._id} hotel={h} query={`?${params}`} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
export function HotelDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const resource = useResource<Hotel>(`/hotels/${id}`);
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || localToday());
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || '');
  const [guests, setGuests] = useState(Number(params.get('guests') || 2));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [saved, setSaved] = useState('');
  async function reserve(room: string) {
    if (!user) {
      navigate(
        `/login?next=${encodeURIComponent(`/hotels/${id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)}`,
      );
      return;
    }
    setBusy(room);
    setError('');
    try {
      const booking = await api<Booking>('/bookings', {
        method: 'POST',
        body: body({ room, checkIn, checkOut, guests }),
      });
      navigate(`/bookings/${booking._id}/checkout`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function favorite() {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api(`/me/favorites/${id}`, {
        method: user.favorites.includes(id!) ? 'DELETE' : 'POST',
      });
      await reload();
      setSaved('Saved stays updated.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (resource.loading || resource.error)
    return (
      <section className="section">
        <ResourceState {...resource} retry={resource.reload} />
      </section>
    );
  const hotel = resource.data!;
  const budgetValue = params.get('maxPrice');
  const parsedBudget = budgetValue?.trim() ? Number(budgetValue) : NaN;
  const maxPrice = Number.isFinite(parsedBudget) && parsedBudget >= 0 ? parsedBudget : undefined;
  const rooms = hotel.rooms?.filter((room) => maxPrice === undefined || room.price <= maxPrice) ?? [];
  const allRoomsQuery = new URLSearchParams(params);
  allRoomsQuery.delete('maxPrice');
  allRoomsQuery.set('checkIn', checkIn);
  allRoomsQuery.set('checkOut', checkOut);
  allRoomsQuery.set('guests', String(guests));
  const changeBudgetQuery = new URLSearchParams(allRoomsQuery);
  changeBudgetQuery.set('q', hotel.name);
  if (maxPrice !== undefined) changeBudgetQuery.set('maxPrice', String(maxPrice));
  return (
    <>
      <section className="detail-cover">
        <img src={hotel.image} alt={`${hotel.name} illustrative property photo`} />
        <div>
          <p className="eyebrow">{hotel.location}</p>
          <h1>{hotel.name}</h1>
        </div>
      </section>
      <section className="section">
        <div className="detail-intro">
          <div>
            <p className="eyebrow">YOUR VICTORIA FALLS ESCAPE</p>
            <h2>A place to slow down.</h2>
            <p className="lead">{hotel.description}</p>
            <div className="chips">
              {hotel.amenities.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </div>
          </div>
          <aside className="panel">
            <h3>Before you book</h3>
            <p>Check-in from 14:00 · Check-out by 10:00</p>
            <p>1–30 nights · Same-day stays welcome</p>
            <p>
              Free cancellation until 48 hours before check-in. After that, the first night is
              charged. No-shows are non-refundable.
            </p>
            <button className="secondary" onClick={() => void favorite()}>
              {user?.favorites.includes(id!) ? 'Remove from saved' : 'Save this stay ♡'}
            </button>
            {saved && <Notice>{saved}</Notice>}
          </aside>
        </div>
        <div className="section-heading">
          <div>
            <p className="eyebrow">ROOM FOR YOUR KIND OF ESCAPE</p>
            <h2>Choose your room</h2>
          </div>
        </div>
        <div className="search-form">
          <label>
            Check-in
            <input
              type="date"
              min={localToday()}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              min={checkIn}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>
          <label>
            Guests
            <input
              type="number"
              min="1"
              max="12"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            />
          </label>
        </div>
        {error && <Notice error>{error}</Notice>}
        {maxPrice !== undefined && (
          <p className="results-count">
            Showing rooms up to {money(maxPrice)} per night.{' '}
            <Link to={`/hotels/${id}?${allRoomsQuery}`}>Show all room prices</Link>
          </p>
        )}
        {maxPrice !== undefined && rooms.length === 0 && (
                    <Notice>
            No rooms match your budget of {money(maxPrice!)} per night.{' '}
            <Link to={`/hotels?${changeBudgetQuery}`}>Change budget</Link>{' · '}
            <Link to={`/hotels/${id}?${allRoomsQuery}`}>Show all room prices</Link>
          </Notice>
        )}
        {(!checkIn || !checkOut) && <p role="status" className="room-date-hint">Choose your check-in and check-out dates to reserve a room.</p>}
        <div className="room-list">
          {rooms.map((room) => (
            <article className="room-card" key={room._id}>
              <img src={room.image} alt={`${room.name} illustrative room photo`} />
              <div>
                <h3>{room.name}</h3>
                <p>{room.description}</p>
                <p className="muted">
                  Up to {room.capacity} guests · {room.units} rooms in this category
                </p>
                <strong>
                  {money(room.price)} <span className="muted">/ night</span>
                </strong>
              </div>
              <button
                disabled={!!busy || guests > room.capacity || !checkOut}
                onClick={() => void reserve(room._id)}
              >
                {busy === room._id
                  ? 'Reserving…'
                  : guests > room.capacity
                    ? 'Capacity exceeded'
                    : 'Reserve room ↗'}
              </button>
            </article>
          ))}
        </div>
        <h2 className="mt">Guest reviews</h2>
        {!hotel.reviews?.length ? (
          <Notice>No reviews yet. Your completed stay could be the first.</Notice>
        ) : (
          <div className="review-grid">
            {hotel.reviews.map((review) => (
              <blockquote key={review._id}>
                <p>
                  {'★'.repeat(review.rating)} <span className="muted">{review.rating}/5</span>
                </p>
                <p>{review.comment}</p>
                <cite>{review.user?.name || 'Guest'}</cite>
              </blockquote>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
