import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { RequestHandler, Response } from 'express';
import { env } from './config.js';
import { Refresh, User } from './models.js';
import { AppError, asyncRoute } from './errors.js';
// Express augments its request type through a declaration namespace.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { id: string; role: string };
    }
  }
}
export const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api/auth',
} as const;
export async function issueTokens(id: string, res: Response) {
  const refresh = jwt.sign({ sub: id, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  await Refresh.create({
    user: id,
    hash: hash(refresh),
    expires: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie('refresh', refresh, { ...cookieOptions, maxAge: 7 * 86400000 });
  return jwt.sign({ sub: id }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}
export const authenticate: RequestHandler = asyncRoute(async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new Error();
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string' || !payload.sub) throw new Error();
    const user = await User.findById(payload.sub);
    if (!user) throw new Error();
    req.auth = { id: user.id, role: user.role! };
    next();
  } catch {
    throw new AppError(401, 'Please sign in to continue');
  }
});
export const admin: RequestHandler = (req, _res, next) => {
  if (req.auth?.role !== 'Admin') return next(new AppError(403, 'Administrator access required'));
  next();
};
export function publicUser(user: {
  _id: unknown;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  favorites?: unknown;
}) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    favorites: user.favorites,
  };
}
