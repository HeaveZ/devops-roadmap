require('dotenv').config();
const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/email');
const healthRouter = require('./routes/health');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3002;

const allowedOrigins = (process.env.CORS_ORIGINS || 'https://heavezz.uk,http://heavezz.uk')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());

app.use(healthRouter);
app.use('/email', emailRoutes);

app.listen(PORT, () => {
  console.log(`Email sender running on port ${PORT}`);
});
