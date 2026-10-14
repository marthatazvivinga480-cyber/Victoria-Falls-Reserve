import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, body } from '../api';
import { useResource, ResourceState, Notice, money } from '../components';
import type { Booking } from '../types';
import { localToday } from './Explore';
export function BookingList() {
  const resource = useResource<Booking[]>('/bookings');
  const [tab, setTab] = useState('upcoming');
  const items = resource.data?.filter((b) =>
    tab === 'cancelled'
      ? b.status === 'cancelled'
      : tab === 'past'
        ? b.status === 'checked_out' || (b.checkOut <= localToday() && b.status !== 'cancelled')
        : !['cancelled', 'checked_out'].includes(b.status) && b.checkOut > localToday(),
  );
  return (
    <section className="section">
      <p className="eyebrow">YOUR RESERVE JOURNEY</p>
      <div className="section-heading">
        <h1>Your stays.</h1>
        <Link to="/hotels">Plan another escape ↗</Link>
      </div>
      <div className="tabs" role="tablist" aria-label="Booking category">
        {['upcoming', 'past', 'cancelled'].map((t) => (
          <button
            role="tab"
            aria-selected={t === tab}
            className={t === tab ? 'selected' : 'secondary'}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <ResourceState {...resource} retry={resource.reload} />
      {items?.length ? (
        <div className="booking-list">
          {items.map((b) => (
            <Link className="booking-card" key={b._id} to={`/bookings/${b._id}`}>
              <img src={b.hotel?.image} alt="" />
              <div>
                <span className="badge">{b.status.replace('_', ' ')}</span>
                <h3>{b.hotel?.name}</h3>
                <p>
                  {b.room?.name} · {b.checkIn} → {b.checkOut}
                </p>
                <p>
                  {b.guests} guests · {b.nights} nights
                </p>
              </div>
              <div>
                <strong>{money(b.total)}</strong>
                <p>{b.paymentStatus}</p>
                <span>View stay ↗</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !resource.loading && (
          <Notice>
            No {tab} stays yet. <Link to="/hotels">Find your next escape</Link>.
          </Notice>
        )
      )}
    </section>
  );
}
export function Checkout() {
  const { id } = useParams();
  const resource = useResource<Booking>(`/bookings/${id}`);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const outcome = String(form.get('outcome'));
      await api(`/bookings/${id}/pay`, { method: 'POST', body: body({ outcome }) });
      if (outcome === 'failure') {
        setError(
          'Simulated payment declined. Your room remains reserved as pending. Retry or cancel the booking.',
        );
      } else navigate(`/bookings/${id}?confirmed=1`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (resource.loading || resource.error)
    return (
      <section className="section">
        <ResourceState {...resource} retry={resource.reload} />
      </section>
    );
  const booking = resource.data!;
  return (
    <section className="section">
      <p className="eyebrow">ONE STEP CLOSER</p>
      <h1>Complete your reservation.</h1>
      <div className="checkout-grid">
        <form className="panel stack" onSubmit={(e) => void submit(e)}>
          <h2>Simulated card checkout</h2>
          <Notice>
            No real money moves. Do not enter actual card details. This form uses a fictional demo
            card.
          </Notice>
          <label>
            Cardholder name
            <input required minLength={2} defaultValue="Alex Traveller" maxLength={80} />
          </label>
          <label>
            Demo card number
            <input readOnly value="4242 4242 4242 4242" />
          </label>
          <div className="two-cols">
            <label>
              Expiry
              <input readOnly value="12/30" />
            </label>
            <label>
              Security code
              <input readOnly value="123" />
            </label>
          </div>
          <label>
            Simulation outcome
            <select name="outcome">
              <option value="success">Successful payment</option>
              <option value="failure">Declined payment</option>
            </select>
          </label>
          <label className="check-label">
            <input type="checkbox" required />I understand the cancellation policy and simulated
            payment.
          </label>
          {error && <Notice error>{error}</Notice>}
          {booking.status === 'pending' ? (
            <button disabled={busy}>
              {busy ? 'Processing…' : `Simulate payment · ${money(booking.total)}`}
            </button>
          ) : (
            <Notice>
              This booking is {booking.status}. <Link to={`/bookings/${id}`}>View booking</Link>
            </Notice>
          )}
        </form>
        <aside className="panel">
          <img className="summary-image" src={booking.hotel?.image} alt="" />
          <h3>{booking.hotel?.name}</h3>
          <p>{booking.room?.name}</p>
          <p>
            {booking.checkIn} → {booking.checkOut}
          </p>
          <p>
            {booking.guests} guests · {booking.nights} nights
          </p>
          <hr />
          <div className="row">
            <span>
              {money(booking.nightlyRate)} × {booking.nights} nights
            </span>
            <strong>{money(booking.total)}</strong>
          </div>
          <p>No additional booking fees.</p>
          <p className="muted">
            Free cancellation until 48 hours before arrival at 14:00 Zimbabwe time. Late
            cancellation costs one night; no-show costs the full stay.
          </p>
          <Link to={`/bookings/${id}`}>Return to booking</Link>
        </aside>
      </div>
    </section>
  );
}
export function BookingDetails() {
  const { id } = useParams();
  const resource = useResource<Booking>(`/bookings/${id}`);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await api(`/bookings/${id}/cancel`, { method: 'POST' });
      setCancelOpen(false);
      setMessage('Booking cancelled. Any applicable simulated refund has been recorded.');
      resource.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function review(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      await api('/reviews', {
        method: 'POST',
        body: body({
          booking: id,
          rating: Number(form.get('rating')),
          comment: form.get('comment'),
        }),
      });
      setMessage('Thank you. Your review has been published.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download(booking: Booking) {
    const content = `VICTORIA FALLS RESERVE\nDiscover Victoria Falls. Stay Exceptionally.\n\nReservation: ${booking._id}\nHotel: ${booking.hotel?.name}\nRoom: ${booking.room?.name}\nCheck-in: ${booking.checkIn}, 14:00 (Zimbabwe UTC+02:00)\nCheck-out: ${booking.checkOut}, 10:00\nGuests: ${booking.guests}\nNights: ${booking.nights}\nTotal: ${money(booking.total)}\nStatus: ${booking.status}\nPayment: ${booking.paymentStatus} (SIMULATED - no real money)\nRefund: ${money(booking.refunded)}\nFree cancellation until 48 hours before check-in; otherwise first night. No-show non-refundable.\nFictional hotels - student portfolio demo.`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `VFR-${booking._id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  if (resource.loading || resource.error)
    return (
      <section className="section">
        <ResourceState {...resource} retry={resource.reload} />
      </section>
    );
  const booking = resource.data!;
  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const late = Date.now() > Date.parse(`${booking.checkIn}T14:00:00+02:00`) - 48 * 3600000;
  return (
    <section className="section narrow confirmation">
      <p className="eyebrow">
        {booking.status === 'confirmed' ? 'YOUR ESCAPE IS RESERVED' : 'YOUR RESERVATION'}
      </p>
      <h1>
        {booking.status === 'confirmed' ? 'We’ll see you at the Falls.' : 'Your stay, at a glance.'}
      </h1>
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <div className="panel">
        <div className="row">
          <span className="badge">{booking.status.replace('_', ' ')}</span>
          <span className="muted">Ref {id?.slice(-8).toUpperCase()}</span>
        </div>
        <h2>{booking.hotel?.name}</h2>
        <p>
          {booking.room?.name} · {booking.hotel?.location}
        </p>
        <div className="confirmation-grid">
          <div>
            <p className="eyebrow">CHECK-IN</p>
            <h3>{booking.checkIn}</h3>
            <p>From 14:00</p>
          </div>
          <div>
            <p className="eyebrow">CHECK-OUT</p>
            <h3>{booking.checkOut}</h3>
            <p>By 10:00</p>
          </div>
          <div>
            <p className="eyebrow">YOUR STAY</p>
            <h3>{booking.nights} nights</h3>
            <p>{booking.guests} guests</p>
          </div>
        </div>
        <hr />
        <div className="row">
          <span>Total · {booking.paymentStatus}</span>
          <strong>{money(booking.total)}</strong>
        </div>
        {booking.status === 'cancelled' && (
          <>
            <p>Simulated refund: {money(booking.refunded)}</p>
            <p>
              Cancellation charge: {money(booking.cancellationCharge)}
              {booking.noShow ? ' · No-show' : ''}
            </p>
          </>
        )}
        <p className="muted">All times are Zimbabwe time (UTC+02:00). Payments are simulated.</p>
        <div className="actions no-print">
          {booking.status === 'pending' && (
            <Link className="button" to={`/bookings/${id}/checkout`}>
              Complete payment
            </Link>
          )}
          <button className="secondary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button className="secondary" onClick={() => download(booking)}>
            Download confirmation
          </button>
          {canCancel && (
            <button className="text-button danger" onClick={() => setCancelOpen(true)}>
              Cancel booking
            </button>
          )}
        </div>
        {cancelOpen && (
          <div className="notice no-print" role="dialog" aria-label="Confirm cancellation">
            <h3>Cancel this stay?</h3>
            <p>
              {booking.paymentStatus === 'paid'
                ? late
                  ? `This is within 48 hours of arrival. The first night (${money(booking.nightlyRate)}) is charged; the remainder is refunded.`
                  : 'You qualify for a full simulated refund.'
                : 'No paid amount needs refunding.'}{' '}
              Inventory will be released.
            </p>
            <div className="actions">
              <button disabled={busy} onClick={() => void cancel()}>
                {busy ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
              <button className="secondary" onClick={() => setCancelOpen(false)}>
                Keep booking
              </button>
            </div>
          </div>
        )}
      </div>
      {booking.status === 'checked_out' && !booking.noShow && (
        <form className="panel stack mt no-print" onSubmit={(e) => void review(e)}>
          <h2>Share your experience.</h2>
          <label>
            Rating
            <select name="rating">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} stars
                </option>
              ))}
            </select>
          </label>
          <label>
            Your review
            <textarea name="comment" required minLength={10} maxLength={1000} />
          </label>
          <button disabled={busy}>Publish review</button>
          <p className="muted">One review per completed stay.</p>
        </form>
      )}
    </section>
  );
}
