import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from './config.js';
import { AppError } from './errors.js';
import { authRoutes } from './routes/authRoutes.js';
import { customerRoutes } from './routes/customerRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(
  '/api',
  rateLimit({ windowMs: 60000, limit: 200, standardHeaders: 'draft-7', legacyHeaders: false }),
);
// Reject foreign browser origins on mutations, including cookie-based refresh/logout.
app.use((req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== env.CLIENT_ORIGIN
  )
    return next(new AppError(403, 'Origin not allowed'));
  next();
});
app.get('/api/health', (_req, res) =>
  res
    .status(mongoose.connection.readyState === 1 ? 200 : 503)
    .json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable' }),
);
app.use('/api', authRoutes, customerRoutes);
app.use('/api/admin', adminRoutes);
app.use((_req, _res, next) => next(new AppError(404, 'Endpoint not found')));
app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { message: 'Please check the submitted fields', details: error.flatten() },
      });
      return;
    }
    if (error instanceof AppError) {
      res.status(error.status).json({ error: { message: error.message } });
      return;
    }
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      res.status(409).json({ error: { message: 'This record already exists' } });
      return;
    }
    console.error(
      JSON.stringify({
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    res.status(500).json({ error: { message: 'Something went wrong. Please try again.' } });
  },
);
