export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Customer' | 'Admin';
  favorites: string[];
}
export interface Hotel {
  _id: string;
  name: string;
  description: string;
  location: string;
  image: string;
  amenities: string[];
  featured: boolean;
  active: boolean;
  fromPrice?: number;
  rooms?: Room[];
  reviews?: Review[];
}
export interface Room {
  _id: string;
  hotel: string | Hotel;
  name: string;
  description: string;
  image: string;
  capacity: number;
  price: number;
  units: number;
  active: boolean;
}
export interface Booking {
  _id: string;
  hotel: Hotel;
  room: Room;
  user?: User;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  nightlyRate: number;
  total: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  refunded: number;
  cancellationCharge: number;
  noShow: boolean;
  createdAt: string;
}
export interface Review {
  _id: string;
  user: User;
  hotel: Hotel;
  rating: number;
  comment: string;
  createdAt: string;
}
export interface Payment {
  _id: string;
  booking: string;
  user: User;
  amount: number;
  status: string;
  kind: string;
  createdAt: string;
}
