import { useState, type FormEvent } from 'react';
import { NavLink, Routes, Route, Link } from 'react-router-dom';
import { api, body } from '../api';
import { useResource, ResourceState, Notice, money } from '../components';
import type { Hotel, Room, Booking, User, Review, Payment } from '../types';
export function Admin() {
  return (
    <section className="section admin">
      <p className="eyebrow">RESERVE MANAGEMENT</p>
      <h1>A thoughtful overview.</h1>
      <nav className="admin-nav" aria-label="Administration">
        {[
          ['', 'Overview'],
          ['hotels', 'Hotels'],
          ['rooms', 'Rooms'],
          ['bookings', 'Bookings'],
          ['customers', 'Customers'],
          ['reviews', 'Reviews'],
          ['payments', 'Payments'],
        ].map(([path, label]) => (
          <NavLink end key={path} to={`/admin${path ? `/${path}` : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="hotels" element={<HotelManager />} />
        <Route path="rooms" element={<RoomManager />} />
        <Route path="bookings" element={<BookingManager />} />
        <Route path="customers" element={<Customers />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="payments" element={<Payments />} />
        <Route path="*" element={<Notice>Admin page not found.</Notice>} />
      </Routes>
    </section>
  );
}
function Overview() {
  const resource = useResource<{
    customers: number;
    hotels: number;
    bookings: number;
    revenue: number;
    refunded: number;
    statuses: { _id: string; count: number }[];
  }>('/admin/analytics');
  return (
    <>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          <div className="stat-grid">
            {[
              ['Net simulated revenue', money(resource.data.revenue)],
              ['Reservations', resource.data.bookings],
              ['Customers', resource.data.customers],
              ['Properties', resource.data.hotels],
            ].map(([label, value]) => (
              <div className="panel" key={label}>
                <p className="eyebrow">{label}</p>
                <h2>{value}</h2>
              </div>
            ))}
          </div>
          <div className="panel mt">
            <h2>Reservation activity</h2>
            <div className="status-bars">
              {resource.data.statuses.map((s) => (
                <div className="row" key={s._id}>
                  <span>{s._id.replace('_', ' ')}</span>
                  <meter min="0" max={Math.max(1, resource.data!.bookings)} value={s.count} />
                  <strong>{s.count}</strong>
                </div>
              ))}
            </div>
            <p>Refunds recorded: {money(resource.data.refunded)}</p>
            <p className="muted">
              All revenue figures are simulated. Failed attempts are excluded.
            </p>
          </div>
        </>
      )}
    </>
  );
}
function useMutation(reload: () => void) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(path: string, method: string, data?: unknown) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(path, { method, ...(data !== undefined ? { body: body(data) } : {}) });
      reload();
      setMessage('Changes saved.');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { error, message, busy, run };
}
function Feedback({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
    </>
  );
}
function HotelManager() {
  const resource = useResource<Hotel[]>('/admin/hotels');
  const mutation = useMutation(resource.reload);
  const [editing, setEditing] = useState<Hotel | null | undefined>(undefined);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: f.get('name'),
      description: f.get('description'),
      location: f.get('location'),
      image: f.get('image'),
      amenities: String(f.get('amenities'))
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      featured: f.has('featured'),
      active: f.has('active'),
    };
    if (
      await mutation.run(
        editing ? `/admin/hotels/${editing._id}` : '/admin/hotels',
        editing ? 'PATCH' : 'POST',
        input,
      )
    )
      setEditing(undefined);
  }
  return (
    <>
      <div className="section-heading">
        <h2>Properties</h2>
        <button onClick={() => setEditing(null)}>Add hotel</button>
      </div>
      <Feedback {...mutation} />
      <ResourceState {...resource} retry={resource.reload} />
      {editing !== undefined && (
        <form
          key={editing?._id || 'new'}
          className="panel stack editor"
          onSubmit={(e) => void save(e)}
        >
          <h3>{editing ? 'Edit hotel' : 'New hotel'}</h3>
          <div className="two-cols">
            <label>
              Name
              <input name="name" required minLength={3} defaultValue={editing?.name} />
            </label>
            <label>
              Location
              <input
                name="location"
                required
                defaultValue={editing?.location || 'Victoria Falls'}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              name="description"
              required
              minLength={20}
              defaultValue={editing?.description}
            />
          </label>
          <label>
            Local image path
            <input
              name="image"
              required
              defaultValue={editing?.image || '/images/hotels/hotel-1.svg'}
            />
          </label>
          <label>
            Amenities (comma separated)
            <input
              name="amenities"
              defaultValue={editing?.amenities.join(', ') || 'Wi-Fi, Breakfast'}
            />
          </label>
          <div className="actions">
            <label className="check-label">
              <input name="featured" type="checkbox" defaultChecked={editing?.featured} />
              Featured
            </label>
            <label className="check-label">
              <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} />
              Active
            </label>
          </div>
          <div className="actions">
            <button disabled={mutation.busy}>Save hotel</button>
            <button type="button" className="secondary" onClick={() => setEditing(undefined)}>
              Close
            </button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hotel</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resource.data?.map((h) => (
              <tr key={h._id}>
                <td>{h.name}</td>
                <td>{h.location}</td>
                <td>{h.active ? 'Active' : 'Archived'}</td>
                <td>
                  <div className="actions">
                    <button className="secondary small" onClick={() => setEditing(h)}>
                      Edit
                    </button>
                    <button
                      className="secondary small"
                      disabled={mutation.busy || !h.active}
                      onClick={() => void mutation.run(`/admin/hotels/${h._id}`, 'DELETE')}
                    >
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resource.data?.length === 0 && <Notice>No hotels yet.</Notice>}
    </>
  );
}
function RoomManager() {
  const resource = useResource<Room[]>('/admin/rooms');
  const hotels = useResource<Hotel[]>('/admin/hotels');
  const mutation = useMutation(resource.reload);
  const [editing, setEditing] = useState<Room | null | undefined>(undefined);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      hotel: f.get('hotel'),
      name: f.get('name'),
      description: f.get('description'),
      image: f.get('image'),
      capacity: Number(f.get('capacity')),
      price: Number(f.get('price')),
      units: Number(f.get('units')),
      active: f.has('active'),
    };
    if (
      await mutation.run(
        editing ? `/admin/rooms/${editing._id}` : '/admin/rooms',
        editing ? 'PATCH' : 'POST',
        input,
      )
    )
      setEditing(undefined);
  }
  return (
    <>
      <div className="section-heading">
        <h2>Rooms & inventory</h2>
        <button onClick={() => setEditing(null)}>Add room</button>
      </div>
      <Feedback {...mutation} />
      <ResourceState {...resource} retry={resource.reload} />
      <ResourceState {...hotels} retry={hotels.reload} />
      {editing !== undefined && (
        <form
          key={editing?._id || 'new'}
          className="panel stack editor"
          onSubmit={(e) => void save(e)}
        >
          <h3>{editing ? 'Edit room' : 'New room'}</h3>
          <label>
            Hotel
            <select
              name="hotel"
              defaultValue={typeof editing?.hotel === 'object' ? editing.hotel._id : editing?.hotel}
            >
              {hotels.data?.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room name
            <input name="name" required minLength={3} defaultValue={editing?.name} />
          </label>
          <label>
            Description
            <textarea name="description" defaultValue={editing?.description} />
          </label>
          <label>
            Local image path
            <input
              name="image"
              required
              defaultValue={editing?.image || '/images/rooms/room-1.svg'}
            />
          </label>
          <div className="three-cols">
            <label>
              Capacity
              <input
                name="capacity"
                type="number"
                min="1"
                max="12"
                required
                defaultValue={editing?.capacity || 2}
              />
            </label>
            <label>
              USD / night
              <input
                name="price"
                type="number"
                min="1"
                step="0.01"
                required
                defaultValue={editing?.price || 120}
              />
            </label>
            <label>
              Room units
              <input
                name="units"
                type="number"
                min="1"
                max="50"
                required
                defaultValue={editing?.units || 3}
              />
            </label>
          </div>
          <label className="check-label">
            <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} />
            Active
          </label>
          <div className="actions">
            <button disabled={mutation.busy}>Save room</button>
            <button type="button" className="secondary" onClick={() => setEditing(undefined)}>
              Close
            </button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Room / Hotel</th>
              <th>Capacity</th>
              <th>Rate</th>
              <th>Units</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resource.data?.map((r) => (
              <tr key={r._id}>
                <td>
                  {r.name}
                  <small>
                    {typeof r.hotel === 'object' ? r.hotel.name : ''} ·{' '}
                    {r.active ? 'Active' : 'Archived'}
                  </small>
                </td>
                <td>{r.capacity}</td>
                <td>{money(r.price)}</td>
                <td>{r.units}</td>
                <td>
                  <div className="actions">
                    <button className="secondary small" onClick={() => setEditing(r)}>
                      Edit
                    </button>
                    <button
                      className="secondary small"
                      disabled={mutation.busy || !r.active}
                      onClick={() => void mutation.run(`/admin/rooms/${r._id}`, 'DELETE')}
                    >
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resource.data?.length === 0 && <Notice>No rooms yet.</Notice>}
    </>
  );
}
function BookingManager() {
  const resource = useResource<Booking[]>('/admin/bookings');
  const mutation = useMutation(resource.reload);
  return (
    <>
      <h2>Reservations</h2>
      <Feedback {...mutation} />
      <ResourceState {...resource} retry={resource.reload} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest / Property</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Total</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            {resource.data?.map((b) => (
              <tr key={b._id}>
                <td>
                  {b.user?.name}
                  <small>
                    {b.hotel?.name} · {b.room?.name}
                  </small>
                </td>
                <td>
                  {b.checkIn}
                  <small>{b.checkOut}</small>
                </td>
                <td>
                  {b.status}
                  <small>{b.paymentStatus}</small>
                </td>
                <td>{money(b.total)}</td>
                <td>
                  <div className="actions">
                    <Link to={`/bookings/${b._id}`}>Details</Link>
                    {b.status === 'confirmed' && (
                      <button
                        className="small"
                        disabled={mutation.busy}
                        onClick={() =>
                          void mutation.run(`/admin/bookings/${b._id}`, 'PATCH', {
                            action: 'check_in',
                          })
                        }
                      >
                        Check in
                      </button>
                    )}
                    {b.status === 'checked_in' && (
                      <button
                        className="small"
                        disabled={mutation.busy}
                        onClick={() =>
                          void mutation.run(`/admin/bookings/${b._id}`, 'PATCH', {
                            action: 'check_out',
                          })
                        }
                      >
                        Check out
                      </button>
                    )}
                    {['pending', 'confirmed'].includes(b.status) && (
                      <>
                        <button
                          className="secondary small"
                          disabled={mutation.busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Cancel this booking? The cancellation policy will apply.',
                              )
                            )
                              void mutation.run(`/admin/bookings/${b._id}`, 'PATCH', {
                                action: 'cancel',
                              });
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="secondary small"
                          disabled={mutation.busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Record a no-show? The full paid amount is non-refundable.',
                              )
                            )
                              void mutation.run(`/admin/bookings/${b._id}`, 'PATCH', {
                                action: 'no_show',
                              });
                          }}
                        >
                          No-show
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resource.data?.length === 0 && <Notice>No reservations yet.</Notice>}
    </>
  );
}
function Customers() {
  const resource = useResource<User[]>('/admin/customers');
  const [q, setQ] = useState('');
  return (
    <>
      <h2>Customers</h2>
      <label className="filter">
        Search customers
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" />
      </label>
      <ResourceState {...resource} retry={resource.reload} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Customer ID</th>
            </tr>
          </thead>
          <tbody>
            {resource.data
              ?.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
              .map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u._id.slice(-8)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {resource.data?.length === 0 && <Notice>No customers yet.</Notice>}
    </>
  );
}
function Reviews() {
  const resource = useResource<Review[]>('/admin/reviews');
  const mutation = useMutation(resource.reload);
  return (
    <>
      <h2>Guest reviews</h2>
      <Feedback {...mutation} />
      <ResourceState {...resource} retry={resource.reload} />
      <div className="review-grid">
        {resource.data?.map((r) => (
          <article className="panel" key={r._id}>
            <p>
              {r.rating}/5 · {r.hotel?.name}
            </p>
            <h3>{r.user?.name}</h3>
            <p>{r.comment}</p>
            <button
              className="secondary small"
              disabled={mutation.busy}
              onClick={() => {
                if (window.confirm('Delete this review?'))
                  void mutation.run(`/admin/reviews/${r._id}`, 'DELETE');
              }}
            >
              Remove review
            </button>
          </article>
        ))}
      </div>
      {resource.data?.length === 0 && <Notice>No reviews to moderate yet.</Notice>}
    </>
  );
}
function Payments() {
  const resource = useResource<Payment[]>('/admin/payments');
  return (
    <>
      <h2>Simulated payment ledger</h2>
      <Notice>Demo transactions only. No card information is stored.</Notice>
      <ResourceState {...resource} retry={resource.reload} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Booking</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {resource.data?.map((p) => (
              <tr key={p._id}>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>{p.user?.name}</td>
                <td>
                  <Link to={`/bookings/${p.booking}`}>{p.booking.slice(-8)}</Link>
                </td>
                <td>{p.kind}</td>
                <td>{p.status}</td>
                <td>{money(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resource.data?.length === 0 && <Notice>No simulated payments yet.</Notice>}
    </>
  );
}
