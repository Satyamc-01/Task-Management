// src/app.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redis } from './config/redis.js';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/error.js';

dotenv.config();

const app = express();
app.use(morgan('dev'));
app.use(express.json());

// CORS first
const allowed = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!allowed.length || !origin) return cb(null, true);
    cb(null, allowed.includes(origin));
  },
  credentials: true
}));

// trust proxy so Secure cookies work on Render
app.set('trust proxy', 1);

// --- SESSION MIDDLEWARE (BEFORE ROUTES) ---
const isProd = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change-me';

const sessionOptions = {
  name: 'sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProd,                               // HTTPS only in prod
    sameSite: isProd ? 'none' : 'lax',            // cross-site cookie for static site -> API
    maxAge: 7 * 24 * 60 * 60 * 1000               // 7 days
  }
};

// Only add Redis store if the client exists AND is connected.
if (redis?.isOpen) {
  sessionOptions.store = new RedisStore({ client: redis });
}

app.use(session(sessionOptions));

// health + tiny landing
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => {
  res.type('html').send(`
    <h1>Task Management API</h1>
    <p>It's alive ✅</p>
    <ul>
      <li>POST <code>/register</code></li>
      <li>POST <code>/login</code></li>
      <li>GET  <code>/tasks?filter=all|pending|completed</code></li>
      <li>GET  <code>/health</code></li>
    </ul>
  `);
});

// ROUTES (after session)
app.use('/', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);

// ERROR HANDLER LAST
app.use(errorHandler);

export default app;
