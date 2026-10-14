import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import { User, Refresh } from '../models.js';
import { AppError, asyncRoute as route } from '../errors.js';
import { issueTokens, publicUser, hash, cookieOptions } from '../auth.js';
import { registerSchema, loginSchema } from '../validation.js';
export const authRoutes = Router();
const authLimit = rateLimit({ windowMs: 15 * 60000, limit: 30 });
authRoutes.post(
  '/auth/register',
  authLimit,
  route(async (req, res) => {
    const input = registerSchema.parse(req.body);
    if (await User.exists({ email: input.email }))
      throw new AppError(409, 'Email is already registered');
    const user = await User.create({ ...input, password: await bcrypt.hash(input.password, 12) });
    res.status(201).json({ user: publicUser(user), accessToken: await issueTokens(user.id, res) });
  }),
);
authRoutes.post(
  '/auth/login',
  authLimit,
  route(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email }).select('+password');
    if (!user || !(await bcrypt.compare(input.password, user.password!)))
      throw new AppError(401, 'Email or password is incorrect');
    res.json({ user: publicUser(user), accessToken: await issueTokens(user.id, res) });
  }),
);
authRoutes.post(
  '/auth/refresh',
  route(async (req, res) => {
    const token = req.cookies.refresh as string | undefined;
    if (!token) throw new AppError(401, 'Session expired');
    let subject: string;
    let tokenVersion = 0;
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
      if (typeof payload === 'string' || !payload.sub) throw new Error();
      subject = payload.sub;
      tokenVersion = typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0;
    } catch {
      throw new AppError(401, 'Session expired');
    }
    const old = await Refresh.findOneAndDelete({ hash: hash(token), expires: { $gt: new Date() } });
    if (!old || String(old.user) !== subject) throw new AppError(401, 'Session expired');
    const user = await User.findById(subject);
    if (!user || (user.tokenVersion ?? 0) !== tokenVersion)
      throw new AppError(401, 'Session expired');
    res.json({ user: publicUser(user), accessToken: await issueTokens(user.id, res) });
  }),
);
authRoutes.post(
  '/auth/logout',
  route(async (req, res) => {
    if (req.cookies.refresh) await Refresh.deleteOne({ hash: hash(req.cookies.refresh) });
    res.clearCookie('refresh', cookieOptions).status(204).end();
  }),
);
