import { z } from 'zod';
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Invalid date',
  );
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(72),
});
export const bookingInput = z.object({
  room: idSchema,
  checkIn: dateSchema,
  checkOut: dateSchema,
  guests: z.coerce.number().int().min(1).max(12),
});
export const hotelInput = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().min(20).max(3000),
  location: z.string().min(3).max(100),
  image: z.string().regex(/^\/images\/[a-zA-Z0-9/_.-]+$/),
  amenities: z.array(z.string().min(1).max(50)).max(20),
  featured: z.boolean(),
  active: z.boolean(),
});
export const roomInput = z.object({
  hotel: idSchema,
  name: z.string().min(3).max(100),
  description: z.string().max(1000),
  image: z.string().regex(/^\/images\/[a-zA-Z0-9/_.-]+$/),
  capacity: z.coerce.number().int().min(1).max(12),
  price: z.coerce.number().min(1).max(10000),
  units: z.coerce.number().int().min(1).max(50),
  active: z.boolean(),
});
