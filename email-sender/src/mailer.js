const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,        // STARTTLS yukseltmesi kullanilacak (port 587)
  requireTLS: true,     // baglanti TLS'e zorla yukseltilir, plain-text reddedilir
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = transporter;
