require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const healthRouter = require('./routes/health');
const pool = require('./db');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'https://heavezz.uk,http://heavezz.uk')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());

app.use(healthRouter);
app.use('/auth', authRoutes);

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Database ready');
}

app.listen(PORT, async () => {
  console.log(`Auth server running on port ${PORT}`);
  await initDB();
});
