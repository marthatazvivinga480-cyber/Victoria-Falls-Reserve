import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout, Protected, Notice } from './components';
import { Home, Hotels, HotelDetails } from './pages/Explore';
import { Login, Profile, Favorites } from './pages/Account';
import { BookingList, BookingDetails, Checkout } from './pages/Bookings';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
export function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/hotels/:id" element={<HotelDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login register />} />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="/favorites"
          element={
            <Protected>
              <Favorites />
            </Protected>
          }
        />
        <Route
          path="/bookings"
          element={
            <Protected>
              <BookingList />
            </Protected>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <Protected>
              <BookingDetails />
            </Protected>
          }
        />
        <Route
          path="/bookings/:id/checkout"
          element={
            <Protected>
              <Checkout />
            </Protected>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Protected admin>
              <Admin />
            </Protected>
          }
        />
        <Route
          path="*"
          element={
            <section className="section">
              <h1>A path less travelled.</h1>
              <Notice>This page could not be found.</Notice>
            </section>
          }
        />
      </Routes>
    </Layout>
  );
}
