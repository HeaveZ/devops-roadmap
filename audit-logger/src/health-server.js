const express = require('express');
const startTime = Date.now();

function startHealthServer(port = process.env.HEALTH_PORT || 8080) {
  const app = express();
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: process.env.SERVICE_NAME || 'audit-logger',
      version: process.env.VERSION || '2.1',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });
  app.listen(port, () => console.log(`Health server on :${port}`));
}

module.exports = { startHealthServer };
