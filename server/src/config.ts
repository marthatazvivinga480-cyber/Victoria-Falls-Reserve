import 'dotenv/config';
import dns from 'node:dns';
import { isIP } from 'node:net';
import { z } from 'zod';
const schema = z.object({
  PORT: z.coerce.number().default(4000),
  SEED_ADMIN_PASSWORD: z.string().min(16).max(72).optional(),
  MONGODB_URI: z.string().min(1),
  MONGODB_DNS_SERVERS: z
    .string()
    .transform((value) => value.split(',').map((server) => server.trim()))
    .refine(
      (servers) => servers.length > 0 && servers.every((server) => isIP(server) > 0),
      'Use comma-separated DNS server IP addresses',
    )
    .optional(),
  CLIENT_ORIGIN: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
});
export const env = schema.parse(process.env);
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
  throw new Error('JWT secrets must be different');

// This affects only this Node process; the operating system DNS configuration is unchanged.
if (env.MONGODB_DNS_SERVERS) dns.setServers(env.MONGODB_DNS_SERVERS);
