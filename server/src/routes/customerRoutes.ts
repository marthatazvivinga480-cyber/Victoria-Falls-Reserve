import { Router } from 'express';
import { z } from 'zod';
import { User, Hotel, Room, Booking, Review } from '../models.js';
import { AppError, asyncRoute as route } from '../errors.js';
import { authenticate, publicUser } from '../auth.js';
import { bookingInput, idSchema } from '../validation.js';
import {
  availability,
  validateStay,
  createBooking,
  cancelBooking,
  payBooking,
  blockingStatuses,
} from '../services/booking.js';
export const customerRoutes = Router();
customerRoutes.get(
  '/me',
  authenticate,
  route(async (req, res) => {
    const user = await User.findById(req.auth!.id);
    res.json(publicUser(user!));
  }),
);
customerRoutes.patch(
  '/me',
  authenticate,
  route(async (req, res) => {
    const input = z.object({ name: z.string().trim().min(2).max(80) }).parse(req.body);
    res.json(publicUser((await User.findByIdAndUpdate(req.auth!.id, input, { new: true }))!));
  }),
);
customerRoutes.post(
  '/me/favorites/:id',
  authenticate,
  route(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    if (!(await Hotel.exists({ _id: id, active: true })))
      throw new AppError(404, 'Hotel not found');
    await User.updateOne({ _id: req.auth!.id }, { $addToSet: { favorites: id } });
    res.status(204).end();
  }),
);
customerRoutes.delete(
  '/me/favorites/:id',
  authenticate,
  route(async (req, res) => {
    await User.updateOne(
      { _id: req.auth!.id },
      { $pull: { favorites: idSchema.parse(req.params.id) } },
    );
    res.status(204).end();
  }),
);
customerRoutes.get(
  '/hotels',
  route(async (req, res) => {
    const query = z
      .object({
        q: z.string().max(80).optional(),
        amenity: z.string().max(50).optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        guests: z.coerce.number().int().min(1).max(12).optional(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
      })
      .parse(req.query);
    if (!!query.checkIn !== !!query.checkOut) throw new AppError(400, 'Both dates are required');
    if (query.checkIn && query.checkOut)
      bookingInput.pick({ checkIn: true, checkOut: true }).parse(query);
    if (query.checkIn && query.checkOut) validateStay(query.checkIn, query.checkOut);
    const hotels = await Hotel.find({
      active: true,
      ...(query.q
        ? { name: { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
        : {}),
      ...(query.amenity ? { amenities: query.amenity } : {}),
    })
      .sort({ featured: -1, name: 1 })
      .lean();
    const rooms = await Room.find({
      hotel: { $in: hotels.map((h) => h._id) },
      active: true,
      ...(query.guests ? { capacity: { $gte: query.guests } } : {}),
      price: { $gte: query.minPrice ?? 0, $lte: query.maxPrice ?? 10000 },
    }).lean();
    const occupied = new Map<string, Set<number>>();
    if (query.checkIn && query.checkOut) {
      const bookings = await Booking.find({
        room: { $in: rooms.map((r) => r._id) },
        status: { $in: blockingStatuses },
        checkIn: { $lt: query.checkOut },
        checkOut: { $gt: query.checkIn },
      })
        .select('room unit')
        .lean();
      for (const booking of bookings) {
        const key = String(booking.room);
        const units = occupied.get(key) ?? new Set<number>();
        units.add(booking.unit!);
        occupied.set(key, units);
      }
    }
    const prices = new Map<string, number[]>();
    for (const room of rooms) {
      if ((occupied.get(String(room._id))?.size ?? 0) < room.units!) {
        const key = String(room.hotel);
        const values = prices.get(key) ?? [];
        values.push(room.price!);
        prices.set(key, values);
      }
    }
    const results = hotels
      .filter((h) => prices.has(String(h._id)))
      .map((h) => ({ ...h, fromPrice: Math.min(...prices.get(String(h._id))!) }));
    res.json(results);
  }),
);
customerRoutes.get(
  '/hotels/:id',
  route(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const hotel = await Hotel.findOne({ _id: id, active: true }).lean();
    if (!hotel) throw new AppError(404, 'Hotel not found');
    const rooms = await Room.find({ hotel: id, active: true }).lean();
    const reviews = await Review.find({ hotel: id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ ...hotel, rooms, reviews });
  }),
);
customerRoutes.get(
  '/rooms/:id/availability',
  route(async (req, res) => {
    const input = bookingInput.omit({ guests: true }).parse({ ...req.query, room: req.params.id });
    validateStay(input.checkIn, input.checkOut);
    res.json({
      available: (await availability(input.room, input.checkIn, input.checkOut)).available,
    });
  }),
);
customerRoutes.post(
  '/bookings',
  authenticate,
  route(async (req, res) => {
    res.status(201).json(await createBooking(req.auth!.id, bookingInput.parse(req.body)));
  }),
);
customerRoutes.get(
  '/bookings',
  authenticate,
  route(async (req, res) =>
    res.json(
      await Booking.find({ user: req.auth!.id })
        .populate('hotel', 'name image')
        .populate('room', 'name')
        .sort({ createdAt: -1 })
        .limit(200),
    ),
  ),
);
customerRoutes.get(
  '/bookings/:id',
  authenticate,
  route(async (req, res) => {
    const booking = await Booking.findOne({
      _id: idSchema.parse(req.params.id),
      ...(req.auth!.role === 'Admin' ? {} : { user: req.auth!.id }),
    })
      .populate('hotel', 'name image location')
      .populate('room', 'name capacity');
    if (!booking) throw new AppError(404, 'Booking not found');
    res.json(booking);
  }),
);
customerRoutes.post(
  '/bookings/:id/cancel',
  authenticate,
  route(async (req, res) =>
    res.json(await cancelBooking(idSchema.parse(req.params.id), req.auth!.id)),
  ),
);
customerRoutes.post(
  '/bookings/:id/pay',
  authenticate,
  route(async (req, res) => {
    const { outcome } = z
      .object({ outcome: z.enum(['success', 'failure']) })
      .strict()
      .parse(req.body);
    res.json(await payBooking(idSchema.parse(req.params.id), req.auth!.id, outcome));
  }),
);
customerRoutes.post(
  '/reviews',
  authenticate,
  route(async (req, res) => {
    const input = z
      .object({
        booking: idSchema,
        rating: z.coerce.number().int().min(1).max(5),
        comment: z.string().trim().min(10).max(1000),
      })
      .parse(req.body);
    const booking = await Booking.findOne({
      _id: input.booking,
      user: req.auth!.id,
      status: 'checked_out',
      noShow: false,
    });
    if (!booking) throw new AppError(403, 'Reviews require a completed stay');
    res
      .status(201)
      .json(await Review.create({ ...input, user: req.auth!.id, hotel: booking.hotel }));
  }),
);
