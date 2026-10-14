import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ['Customer', 'Admin'], default: 'Customer' },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Hotel' }],
  },
  { timestamps: true },
);
const hotelSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, default: 'Victoria Falls' },
    image: { type: String, required: true },
    amenities: [String],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
hotelSchema.index({ active: 1, featured: 1 });
const roomSchema = new Schema(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    image: { type: String, required: true },
    capacity: { type: Number, required: true },
    price: { type: Number, required: true },
    units: { type: Number, required: true },
    active: { type: Boolean, default: true },
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);
roomSchema.index({ hotel: 1, active: 1, capacity: 1, price: 1 });
const bookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    unit: { type: Number, required: true },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    guests: { type: Number, required: true },
    nights: { type: Number, required: true },
    nightlyRate: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    refunded: { type: Number, default: 0 },
    cancellationCharge: { type: Number, default: 0 },
    noShow: { type: Boolean, default: false },
  },
  { timestamps: true },
);
bookingSchema.index({ room: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
const refreshSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hash: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
  },
  { timestamps: true },
);
refreshSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true },
);
const paymentSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['paid', 'failed', 'refunded'], required: true },
    kind: { type: String, enum: ['checkout', 'refund'], required: true },
  },
  { timestamps: true },
);
export const User = mongoose.model('User', userSchema);
export const Hotel = mongoose.model('Hotel', hotelSchema);
export const Room = mongoose.model('Room', roomSchema);
export const Booking = mongoose.model('Booking', bookingSchema);
export const Refresh = mongoose.model('Refresh', refreshSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
