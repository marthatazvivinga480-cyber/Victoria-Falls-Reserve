import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Login, Favorites } from './pages/Account';
import { Hotels, HotelDetails } from './pages/Explore';
import { Checkout, BookingDetails } from './pages/Bookings';
import { Protected } from './components';
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  signIn: vi.fn(),
  reload: vi.fn(),
  user: { _id: 'u', name: 'Alex', email: 'a@example.com', role: 'Customer', favorites: ['h'] },
}));
vi.mock('./api', () => ({ api: mocks.api, body: JSON.stringify }));
vi.mock('./auth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, signIn: mocks.signIn, reload: mocks.reload }),
}));
const hotel = {
  _id: 'h',
  name: 'Zambezi Crest Hotel',
  description: 'A peaceful retreat.',
  location: 'Riverfront',
  image: '/images/hotels/hotel-1.svg',
  amenities: ['Pool'],
  fromPrice: 120,
  rooms: [
    {
      _id: 'r',
      name: 'Garden King',
      price: 120,
      capacity: 2,
      units: 3,
      description: 'Quiet room',
      image: '/images/rooms/room-1.svg',
    },
  ],
  reviews: [],
};
const booking = {
  _id: 'b',
  hotel,
  room: hotel.rooms[0],
  checkIn: '2030-01-10',
  checkOut: '2030-01-12',
  guests: 2,
  nights: 2,
  nightlyRate: 120,
  total: 240,
  status: 'pending',
  paymentStatus: 'pending',
  refunded: 0,
  cancellationCharge: 0,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.mockImplementation((path: string) =>
    Promise.resolve(
      path.startsWith('/hotels/') ? hotel : path.startsWith('/bookings/') ? booking : [hotel],
    ),
  );
});
describe('Major frontend flows', () => {
  it('signs in and navigates to the account', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/bookings" element={<p>Booking account</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Email address'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(mocks.signIn).toHaveBeenCalledWith('a@example.com', 'password', undefined);
    expect(await screen.findByText('Booking account')).toBeInTheDocument();
  });
  it('renders hotel search results and handles errors', async () => {
    mocks.api.mockRejectedValueOnce(new Error('Network unavailable'));
    render(
      <MemoryRouter>
        <Hotels />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Network unavailable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Zambezi Crest Hotel')).toBeInTheDocument();
  });
  it('reserves a selected room and navigates to checkout', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/hotels/h?checkIn=2030-01-10&checkOut=2030-01-12']}>
        <Routes>
          <Route path="/hotels/:id" element={<HotelDetails />} />
          <Route path="/bookings/b/checkout" element={<p>Checkout route</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Garden King');
    mocks.api.mockResolvedValueOnce({ _id: 'b' });
    await user.click(screen.getByRole('button', { name: 'Reserve room ↗' }));
    expect(mocks.api).toHaveBeenCalledWith(
      '/bookings',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await screen.findByText('Checkout route')).toBeInTheDocument();
  });
  it('shows saved stays', async () => {
    render(
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Zambezi Crest Hotel')).toBeInTheDocument();
  });
  it('shows simulated decline and allows retry', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/bookings/b/checkout']}>
        <Routes>
          <Route path="/bookings/:id/checkout" element={<Checkout />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Simulated card checkout');
    await user.selectOptions(screen.getByLabelText('Simulation outcome'), 'failure');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Simulate payment/ }));
    expect(await screen.findByText(/Simulated payment declined/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(mocks.api).toHaveBeenCalledWith(
      '/bookings/b/pay',
      expect.objectContaining({ body: '{"outcome":"failure"}' }),
    );
  });
  it('confirms cancellation before sending the mutation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/bookings/b']}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingDetails />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Your booking details.');
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith('/bookings/b/cancel', { method: 'POST' }),
    );
  });
  it('completes a successful simulated payment', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/bookings/b/checkout']}>
        <Routes>
          <Route path="/bookings/:id/checkout" element={<Checkout />} />
          <Route path="/bookings/b" element={<p>Confirmed reservation</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Simulated card checkout');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Simulate payment/ }));
    expect(await screen.findByText('Confirmed reservation')).toBeInTheDocument();
  });
  it('publishes a review after a completed stay', async () => {
    mocks.api.mockResolvedValueOnce({ ...booking, status: 'checked_out' });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/bookings/b']}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingDetails />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Share your experience.');
    await user.type(screen.getByLabelText('Your review'), 'A wonderful stay by the river.');
    await user.click(screen.getByRole('button', { name: 'Publish review' }));
    expect(
      await screen.findByText('Thank you. Your review has been published.'),
    ).toBeInTheDocument();
  });
  it('blocks customer admin pages', () => {
    render(
      <MemoryRouter>
        <Protected admin>
          <p>Admin secret</p>
        </Protected>
      </MemoryRouter>,
    );
    expect(screen.getByText('Administrator access required.')).toBeInTheDocument();
    expect(screen.queryByText('Admin secret')).not.toBeInTheDocument();
  });
});
