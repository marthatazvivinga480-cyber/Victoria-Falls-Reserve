import mongoose from 'mongoose';
import { Booking, Hotel, Payment, Room } from '../models.js';
import { AppError } from '../errors.js';
export const blockingStatuses = ['pending', 'confirmed', 'checked_in'];
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Harare',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function nightsBetween(checkIn: string, checkOut: string) {
  return (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
}
export function validateStay(checkIn: string, checkOut: string, now = today()) {
  const nights = nightsBetween(checkIn, checkOut);
  if (checkIn < now || !Number.isInteger(nights) || nights < 1 || nights > 30)
    throw new AppError(400, 'Choose a stay of 1–30 nights, starting today or later.');
  return nights;
}
export function overlaps(a: string, b: string, c: string, d: string) {
  return a < d && b > c;
}
export function cancellationPolicy(
  checkIn: string,
  total: number,
  nightlyRate: number,
  now = Date.now(),
  noShow = false,
) {
  const free = now <= Date.parse(`${checkIn}T14:00:00+02:00`) - 48 * 3600000;
  const charge = noShow ? total : free ? 0 : nightlyRate;
  return { charge, refund: Math.max(0, total - charge) };
}
export async function availability(room: string, checkIn: string, checkOut: string) {
  const item = await Room.findById(room);
  if (!item || !item.active) throw new AppError(404, 'Room unavailable');
  const booked = await Booking.find({
    room,
    status: { $in: blockingStatuses },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  }).select('unit');
  const used = new Set(booked.map((b) => b.unit));
  return { available: Math.max(0, (item.units ?? 0) - used.size), units: used };
}
export async function createBooking(
  user: string,
  input: { room: string; checkIn: string; checkOut: string; guests: number },
) {
  const nights = validateStay(input.checkIn, input.checkOut);
  let result;
  await mongoose.connection.transaction(async (session) => {
    // Every inventory-changing transaction writes the room first, serializing concurrent reservations.
    const room = await Room.findOneAndUpdate(
      { _id: input.room, active: true },
      { $inc: { version: 1 } },
      { new: true, session },
    );
    if (!room || !(await Hotel.exists({ _id: room.hotel, active: true }).session(session)))
      throw new AppError(404, 'Room unavailable');
    if (input.guests > room.capacity!) throw new AppError(400, 'Guest count exceeds room capacity');
    const booked = await Booking.find({
      room: room._id,
      status: { $in: blockingStatuses },
      checkIn: { $lt: input.checkOut },
      checkOut: { $gt: input.checkIn },
    }).session(session);
    const occupied = new Set(booked.map((b) => b.unit));
    const unit = Array.from({ length: room.units! }, (_, i) => i).find((i) => !occupied.has(i));
    if (unit === undefined)
      throw new AppError(409, 'This room is no longer available for those dates');
    [result] = await Booking.create(
      [
        {
          ...input,
          user,
          hotel: room.hotel,
          unit,
          nights,
          nightlyRate: room.price,
          total: Number((nights * room.price!).toFixed(2)),
        },
      ],
      { session },
    );
  });
  return result;
}
export async function cancelBooking(id: string, user: string, admin = false, noShow = false) {
  let result;
  await mongoose.connection.transaction(async (session) => {
    const booking = await Booking.findOne({ _id: id, ...(!admin ? { user } : {}) }).session(
      session,
    );
    if (!booking) throw new AppError(404, 'Booking not found');
    await Room.updateOne({ _id: booking.room }, { $inc: { version: 1 } }, { session });
    if (!['pending', 'confirmed'].includes(booking.status!))
      throw new AppError(409, 'Only pending or confirmed bookings can be cancelled');
    if (noShow && Date.now() < Date.parse(`${booking.checkIn}T14:00:00+02:00`))
      throw new AppError(400, 'No-show can only be recorded after check-in time');
    const policy = cancellationPolicy(
      booking.checkIn!,
      booking.total!,
      booking.nightlyRate!,
      Date.now(),
      noShow,
    );
    booking.status = 'cancelled';
    booking.noShow = noShow;
    booking.cancellationCharge = booking.paymentStatus === 'paid' ? policy.charge : 0;
    if (booking.paymentStatus === 'paid' && policy.refund > 0) {
      booking.refunded = policy.refund;
      booking.paymentStatus = 'refunded';
      await Payment.create(
        [
          {
            booking: id,
            user: booking.user,
            amount: policy.refund,
            status: 'refunded',
            kind: 'refund',
          },
        ],
        { session },
      );
    }
    result = await booking.save({ session });
  });
  return result;
}
export async function payBooking(id: string, user: string, outcome: 'success' | 'failure') {
  let result;
  await mongoose.connection.transaction(async (session) => {
    const booking = await Booking.findOne({ _id: id, user }).session(session);
    if (!booking) throw new AppError(404, 'Booking not found');
    await Room.updateOne({ _id: booking.room }, { $inc: { version: 1 } }, { session });
    if (booking.status !== 'pending')
      throw new AppError(409, 'Booking is no longer awaiting payment');
    booking.paymentStatus = outcome === 'success' ? 'paid' : 'failed';
    if (outcome === 'success') booking.status = 'confirmed';
    await Payment.create(
      [
        {
          booking: id,
          user,
          amount: booking.total,
          status: booking.paymentStatus,
          kind: 'checkout',
        },
      ],
      { session },
    );
    result = await booking.save({ session });
  });
  return result;
}
