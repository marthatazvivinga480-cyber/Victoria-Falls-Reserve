import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User, Hotel, Room, Booking, Review, Payment } from '../models.js';
import { AppError, asyncRoute as route } from '../errors.js';
import { authenticate, admin } from '../auth.js';
import { idSchema, hotelInput, roomInput } from '../validation.js';
import { cancelBooking } from '../services/booking.js';
export const adminRoutes = Router();
adminRoutes.use(authenticate, admin);
adminRoutes.get(
  '/analytics',
  route(async (_req, res) => {
    const [customers, hotels, bookings, payments, statuses] = await Promise.all([
      User.countDocuments({ role: 'Customer' }),
      Hotel.countDocuments(),
      Booking.countDocuments(),
      Payment.aggregate([
        {
          $group: {
            _id: '$kind',
            total: { $sum: { $cond: [{ $in: ['$status', ['paid', 'refunded']] }, '$amount', 0] } },
          },
        },
      ]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const paid = payments.find((p) => p._id === 'checkout')?.total ?? 0;
    const refunded = payments.find((p) => p._id === 'refund')?.total ?? 0;
    res.json({ customers, hotels, bookings, revenue: paid - refunded, refunded, statuses });
  }),
);
adminRoutes.get(
  '/hotels',
  route(async (_req, res) => res.json(await Hotel.find().sort({ name: 1 }))),
);
adminRoutes.post(
  '/hotels',
  route(async (req, res) => res.status(201).json(await Hotel.create(hotelInput.parse(req.body)))),
);
adminRoutes.patch(
  '/hotels/:id',
  route(async (req, res) => {
    const hotel = await Hotel.findByIdAndUpdate(
      idSchema.parse(req.params.id),
      hotelInput.parse(req.body),
      { new: true, runValidators: true },
    );
    if (!hotel) throw new AppError(404, 'Hotel not found');
    res.json(hotel);
  }),
);
// Soft deletion preserves booking history. Rooms cannot reserve an archived hotel.
adminRoutes.delete(
  '/hotels/:id',
  route(async (req, res) => {
    if (!(await Hotel.findByIdAndUpdate(idSchema.parse(req.params.id), { active: false })))
      throw new AppError(404, 'Hotel not found');
    res.status(204).end();
  }),
);
adminRoutes.get(
  '/rooms',
  route(async (_req, res) =>
    res.json(await Room.find().populate('hotel', 'name').sort({ name: 1 })),
  ),
);
adminRoutes.post(
  '/rooms',
  route(async (req, res) => {
    const input = roomInput.parse(req.body);
    if (!(await Hotel.exists({ _id: input.hotel }))) throw new AppError(404, 'Hotel not found');
    res.status(201).json(await Room.create(input));
  }),
);
adminRoutes.patch(
  '/rooms/:id',
  route(async (req, res) => {
    const input = roomInput.parse(req.body);
    let result;
    await mongoose.connection.transaction(async (session) => {
      const room = await Room.findByIdAndUpdate(
        idSchema.parse(req.params.id),
        { $inc: { version: 1 } },
        { new: true, session },
      );
      if (!room) throw new AppError(404, 'Room not found');
      if (String(room.hotel) !== input.hotel)
        throw new AppError(400, 'A room cannot be moved to another hotel');
      if (
        input.units < room.units! &&
        (await Booking.exists({
          room: room.id,
          status: { $in: ['pending', 'confirmed', 'checked_in'] },
          unit: { $gte: input.units },
        }).session(session))
      )
        throw new AppError(409, 'Inventory reduction conflicts with active bookings');
      Object.assign(room, input);
      result = await room.save({ session });
    });
    res.json(result);
  }),
);
adminRoutes.delete(
  '/rooms/:id',
  route(async (req, res) => {
    if (
      !(await Room.findByIdAndUpdate(idSchema.parse(req.params.id), {
        active: false,
        $inc: { version: 1 },
      }))
    )
      throw new AppError(404, 'Room not found');
    res.status(204).end();
  }),
);
adminRoutes.get(
  '/bookings',
  route(async (_req, res) =>
    res.json(
      await Booking.find()
        .populate('user', 'name email')
        .populate('hotel', 'name')
        .populate('room', 'name')
        .sort({ createdAt: -1 })
        .limit(500),
    ),
  ),
);
adminRoutes.patch(
  '/bookings/:id',
  route(async (req, res) => {
    const { action } = z
      .object({ action: z.enum(['check_in', 'check_out', 'cancel', 'no_show']) })
      .parse(req.body);
    const id = idSchema.parse(req.params.id);
    if (action === 'cancel' || action === 'no_show') {
      res.json(await cancelBooking(id, req.auth!.id, true, action === 'no_show'));
      return;
    }
    const expected = action === 'check_in' ? 'confirmed' : 'checked_in';
    const status = action === 'check_in' ? 'checked_in' : 'checked_out';
    let result;
    await mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findById(id).session(session);
      if (!booking) throw new AppError(404, 'Booking not found');
      await Room.updateOne({ _id: booking.room }, { $inc: { version: 1 } }, { session });
      if (booking.status !== expected) throw new AppError(409, 'Invalid booking status transition');
      if (action === 'check_in' && Date.now() < Date.parse(`${booking.checkIn}T14:00:00+02:00`))
        throw new AppError(400, 'Check-in starts at 14:00 on arrival day');
      if (action === 'check_out' && Date.now() < Date.parse(`${booking.checkOut}T10:00:00+02:00`))
        throw new AppError(400, 'Check-out can be recorded from 10:00 on departure day');
      booking.status = status;
      result = await booking.save({ session });
    });
    res.json(result);
  }),
);
adminRoutes.get(
  '/customers',
  route(async (_req, res) =>
    res.json(
      await User.find({ role: 'Customer' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(500),
    ),
  ),
);
adminRoutes.get(
  '/reviews',
  route(async (_req, res) =>
    res.json(
      await Review.find()
        .populate('hotel', 'name')
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(500),
    ),
  ),
);
adminRoutes.delete(
  '/reviews/:id',
  route(async (req, res) => {
    if (!(await Review.findByIdAndDelete(idSchema.parse(req.params.id))))
      throw new AppError(404, 'Review not found');
    res.status(204).end();
  }),
);
adminRoutes.get(
  '/payments',
  route(async (_req, res) =>
    res.json(
      await Payment.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(500),
    ),
  ),
);
