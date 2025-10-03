import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/error.js';

import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redis } from './config/redis.js';


dotenv.config();

const app = express();



app.use(morgan('dev'));
app.use(express.json());

const allowed = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!allowed.length || !origin) return cb(null, true);
    return cb(null, allowed.includes(origin));
  },
  credentials: true
}));

app.get('/', (req, res) => {
  res.type('html').send(`
    <h1>Task Management API</h1>
    <p>It's alive ✅</p>
    <ul>
      <li>POST <code>/register</code></li>
      <li>POST <code>/login</code></li>
      <li>GET  <code>/tasks?filter=all|pending|completed</code> (requires Bearer token)</li>
      <li>GET  <code>/health</code></li>
    </ul>
  `);
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use(errorHandler);




// trust proxy so secure cookies work behind Render’s proxy
app.set('trust proxy', 1);

const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;

app.use(session({
  store: new RedisStore({ client: redis }),
  name: 'sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',       // HTTPS only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // allow cross-site on Render
    maxAge: 7 * 24 * 60 * 60 * 1000                      // 7 days
  }
}));

export default app;


