const express = require('express');
const router = express.Router();
const startTime = Date.now();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: process.env.SERVICE_NAME || 'email-sender',
    version: process.env.VERSION || '2.1',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
