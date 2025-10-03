import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/error.js';

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


export default app;
