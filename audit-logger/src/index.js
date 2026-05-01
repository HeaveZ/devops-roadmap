require('dotenv').config();
const { Kafka } = require('kafkajs');
const pool = require('./db');
const { startHealthServer } = require('./health-server');

startHealthServer();

const kafka = new Kafka({
  clientId: 'audit-logger',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const consumer = kafka.consumer({ groupId: 'audit-logger-group' });
const RETRY_DELAY_MS = 5000;

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      user_id VARCHAR(255),
      email VARCHAR(255),
      resource VARCHAR(100),
      resource_id VARCHAR(100),
      details TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('audit_logs tablosu hazir');
}

async function startConsumer() {
  await initDB();
  await consumer.connect();
  await consumer.subscribe({ topic: 'audit-log', fromBeginning: false });
  console.log('Kafka consumer baslatildi, audit-log dinleniyor...');

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const log = JSON.parse(message.value.toString());
        await pool.query(
          `INSERT INTO audit_logs (action, user_id, email, resource, resource_id, details)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [log.action, log.userId, log.email, log.resource, log.resourceId, log.details]
        );
        console.log(`Audit log kaydedildi: ${log.action} - ${log.resource} ${log.resourceId || ''}`);
      } catch (err) {
        console.error('Audit log isleme hatasi:', err.message);
      }
    },
  });
}

async function runWithRetry() {
  while (true) {
    try {
      await startConsumer();
      return;
    } catch (err) {
      console.error(`Consumer baslatma hatasi, ${RETRY_DELAY_MS}ms sonra tekrar denenecek:`, err.message);
      try { await consumer.disconnect(); } catch (_) { /* ignore */ }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

runWithRetry();

async function shutdown(signal) {
  console.log(`${signal} alindi, graceful shutdown...`);
  try { await consumer.disconnect(); } catch (_) { /* ignore */ }
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
