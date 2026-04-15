const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const EMAIL_SENDER_URL = process.env.EMAIL_SENDER_URL || 'http://email-sender:3002';

// Bellekte kod saklama (production'da Redis kullanilmali)
const verificationCodes = new Map();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeCode(email, code, context) {
  verificationCodes.set(email, {
    code,
    context, // 'register' veya 'login'
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 dakika
  });
}

function getStoredCode(email) {
  const entry = verificationCodes.get(email);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    verificationCodes.delete(email);
    return null;
  }
  return entry;
}

// Email-sender'a kod gonder
async function sendVerificationEmail(to, code) {
  const res = await fetch(`${EMAIL_SENDER_URL}/email/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, code }),
  });
  if (!res.ok) throw new Error('Mail gonderilemedi');
}

// POST /auth/register - 1. adim: kayit + kod gonder
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve sifre gerekli' });
    }

    const existing = await pool.query('SELECT id FROM auth_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Bu e-posta zaten kullaniliyor' });
    }

    // Sifreyi hashle ve gecici sakla
    const password_hash = await bcrypt.hash(password, 10);

    // Kodu olustur ve gonder
    const code = generateCode();
    storeCode(email, code, { type: 'register', password_hash });

    await sendVerificationEmail(email, code);

    res.json({ message: 'Dogrulama kodu gonderildi', requiresVerification: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login - 1. adim: sifre dogrula + kod gonder
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve sifre gerekli' });
    }

    const { rows } = await pool.query('SELECT * FROM auth_users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-posta veya sifre hatali' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'E-posta veya sifre hatali' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/verify-code - 2. adim: kodu dogrula + token ver
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'E-posta ve kod gerekli' });
    }

    const stored = getStoredCode(email);
    if (!stored) {
      return res.status(400).json({ error: 'Kod suresi dolmus veya gecersiz' });
    }

    if (stored.code !== code) {
      return res.status(401).json({ error: 'Yanlis kod' });
    }

    // Kodu temizle
    verificationCodes.delete(email);

    let user;

    if (stored.context.type === 'register') {
      // Yeni kullaniciyi DB'ye kaydet
      const { rows } = await pool.query(
        'INSERT INTO auth_users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, stored.context.password_hash]
      );
      user = rows[0];
    } else {
      // Login: kullaniciyi bul
      const { rows } = await pool.query('SELECT id, email FROM auth_users WHERE email = $1', [email]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Kullanici bulunamadi' });
      }
      user = rows[0];
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/verify - token dogrulama (degismedi)
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yetkilendirme basliqi eksik' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({ userId: decoded.userId, email: decoded.email });
  } catch (err) {
    res.status(401).json({ error: 'Gecersiz veya suresi dolmus token' });
  }
});

module.exports = router;
