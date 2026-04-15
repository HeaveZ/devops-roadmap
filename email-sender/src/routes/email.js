const express = require('express');
const transporter = require('../mailer');

const router = express.Router();

// POST /email/send-code
router.post('/send-code', async (req, res) => {
  try {
    const { to, code } = req.body;

    if (!to || !code) {
      return res.status(400).json({ error: 'E-posta ve kod gerekli' });
    }

    await transporter.sendMail({
      from: `"Taskly" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Taskly - Dogrulama Kodu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 30px; background: #0d1b2a; border-radius: 12px; color: #fff;">
          <h2 style="color: #2196F3; text-align: center; margin-bottom: 8px;">Taskly</h2>
          <p style="text-align: center; color: #8899aa; font-size: 14px;">Dogrulama kodunuz</p>
          <div style="background: #1b2838; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2196F3;">${code}</span>
          </div>
          <p style="text-align: center; color: #556677; font-size: 12px;">Bu kod 5 dakika gecerlidir.</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Mail gonderme hatasi:', err.message);
    res.status(500).json({ error: 'Mail gonderilemedi' });
  }
});

module.exports = router;
