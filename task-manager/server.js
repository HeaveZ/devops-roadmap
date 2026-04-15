const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const upload = multer({ storage: multer.memoryStorage() });

const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || "http://auth-server:3001";

// Kafka Producer
const kafka = new Kafka({
  clientId: "task-manager",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});
const producer = kafka.producer();
let kafkaReady = false;

producer.connect()
  .then(() => { kafkaReady = true; console.log("Kafka producer baglandi"); })
  .catch((err) => console.error("Kafka baglanti hatasi:", err.message));

async function auditLog(action, user, resource, resourceId, details) {
  if (!kafkaReady) return;
  try {
    await producer.send({
      topic: "audit-log",
      messages: [{
        value: JSON.stringify({
          action,
          userId: user?.userId,
          email: user?.email,
          resource,
          resourceId: String(resourceId || ""),
          details: details || "",
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  } catch (err) {
    console.error("Audit log gonderilemedi:", err.message);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// PostgreSQL baglantisi
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Veritabani tablolarini olustur (ilk calistirmada)
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        section VARCHAR(100) NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        author VARCHAR(100) DEFAULT 'Anonim',
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE comments ADD COLUMN IF NOT EXISTS author VARCHAR(100) DEFAULT 'Anonim';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

    await pool.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'none'
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        s3_key VARCHAR(500) NOT NULL,
        url TEXT NOT NULL,
        size INTEGER NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        uploaded_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tablo bossa varsayilan gorevleri ekle
    const { rowCount } = await pool.query("SELECT 1 FROM tasks LIMIT 1");
    if (rowCount === 0) {
      const defaultTasks = [
        { title: "Linux komut satırı temelleri", section: "Linux & OS" },
        { title: "Dosya sistemi ve izinler", section: "Linux & OS" },
        { title: "Süreç yönetimi (ps, top, kill)", section: "Linux & OS" },
        { title: "Shell scripting (Bash)", section: "Linux & OS" },
        { title: "Cron jobs & systemd", section: "Linux & OS" },
        { title: "TCP/IP, DNS, HTTP/HTTPS temelleri", section: "Networking" },
        { title: "Firewall (iptables, ufw)", section: "Networking" },
        { title: "Load Balancing kavramları", section: "Networking" },
        { title: "SSL/TLS sertifikaları", section: "Networking" },
        { title: "Git temelleri (add, commit, push, pull)", section: "Git & VCS" },
        { title: "Branching ve merging stratejileri", section: "Git & VCS" },
        { title: "GitHub/GitLab kullanımı", section: "Git & VCS" },
        { title: "CI/CD kavramları", section: "CI/CD" },
        { title: "GitHub Actions", section: "CI/CD" },
        { title: "Jenkins pipeline", section: "CI/CD" },
        { title: "GitLab CI", section: "CI/CD" },
        { title: "Docker temelleri", section: "Containers" },
        { title: "Dockerfile yazımı", section: "Containers" },
        { title: "Docker Compose", section: "Containers" },
        { title: "Container registry kullanımı", section: "Containers" },
        { title: "Kubernetes temelleri", section: "Orchestration" },
        { title: "Pods, Services, Deployments", section: "Orchestration" },
        { title: "Helm charts", section: "Orchestration" },
        { title: "kubectl komutları", section: "Orchestration" },
        { title: "AWS / Azure / GCP temelleri", section: "Cloud" },
        { title: "IAM ve güvenlik", section: "Cloud" },
        { title: "S3 / Blob Storage", section: "Cloud" },
        { title: "EC2 / VM yönetimi", section: "Cloud" },
        { title: "Terraform temelleri", section: "IaC" },
        { title: "Ansible ile konfigürasyon yönetimi", section: "IaC" },
        { title: "CloudFormation / ARM Templates", section: "IaC" },
        { title: "Prometheus & Grafana", section: "Monitoring" },
        { title: "Log yönetimi (ELK Stack)", section: "Monitoring" },
        { title: "Alerting stratejileri", section: "Monitoring" },
        { title: "Application Performance Monitoring", section: "Monitoring" },
      ];
      for (const task of defaultTasks) {
        await pool.query(
          "INSERT INTO tasks (title, section) VALUES ($1, $2)",
          [task.title, task.section]
        );
      }
      console.log("Varsayilan gorevler eklendi.");
    }

    console.log("Veritabani hazir.");
  } catch (err) {
    console.error("DB init hatasi:", err.message);
  }
}

// --- AUTH MIDDLEWARE (auth-server uzerinden dogrulama) ---
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Yetkilendirme gerekli" });
  }
  try {
    const verifyRes = await fetch(`${AUTH_SERVER_URL}/auth/verify`, {
      headers: { "Authorization": authHeader },
    });
    if (!verifyRes.ok) {
      return res.status(401).json({ error: "Gecersiz veya suresi dolmus token" });
    }
    const data = await verifyRes.json();
    req.user = { userId: data.userId, email: data.email };
    next();
  } catch {
    return res.status(401).json({ error: "Auth servise baglanilamadi" });
  }
}

// --- API ROUTES ---

// Tum gorevleri getir (misafir erisime acik)
app.get("/api/tasks", async (req, res) => {
  try {
    const { rows: tasks } = await pool.query(
      "SELECT * FROM tasks ORDER BY section, id"
    );
    const { rows: subtasks } = await pool.query(
      "SELECT * FROM subtasks ORDER BY created_at"
    );
    const { rows: comments } = await pool.query(
      "SELECT * FROM comments ORDER BY created_at"
    );
    const subtaskMap = {};
    subtasks.forEach(st => {
      if (!subtaskMap[st.parent_id]) subtaskMap[st.parent_id] = [];
      subtaskMap[st.parent_id].push(st);
    });
    const commentMap = {};
    comments.forEach(c => {
      if (!commentMap[c.task_id]) commentMap[c.task_id] = [];
      commentMap[c.task_id].push(c);
    });
    const result = tasks.map(t => ({
      ...t,
      subtasks: subtaskMap[t.id] || [],
      comments: commentMap[t.id] || [],
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Misafir takip (auth gerektirmez)
app.post("/api/track", async (req, res) => {
  try {
    const { action, details } = req.body;
    if (!action) return res.status(400).json({ error: "Action gerekli" });
    const ip = req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.ip;
    const userAgent = req.headers["user-agent"] || "";
    auditLog("GUEST_" + action, { userId: null, email: null }, "guest", null, JSON.stringify({ ip, userAgent, details: details || "" }));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni gorev olustur
app.post("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const { title, section } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Baslik gerekli" });
    }
    if (!section || !section.trim()) {
      return res.status(400).json({ error: "Section gerekli" });
    }
    const { rows } = await pool.query(
      "INSERT INTO tasks (title, section) VALUES ($1, $2) RETURNING *",
      [title.trim(), section.trim()]
    );
    auditLog("TASK_CREATED", req.user, "task", rows[0].id, title.trim());
    res.status(201).json({ ...rows[0], subtasks: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gorev durumunu guncelle
app.patch("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, priority } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (completed !== undefined) {
      updates.push(`completed = $${idx++}`);
      values.push(completed);
    }
    if (priority !== undefined) {
      const validPriorities = ['none', 'dusuk', 'orta', 'yuksek', 'kritik'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: "Gecersiz oncelik degeri" });
      }
      updates.push(`priority = $${idx++}`);
      values.push(priority);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "Guncellenecek alan belirtilmedi" });
    }
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Gorev bulunamadi" });
    }
    const action = completed !== undefined ? (completed ? "TASK_COMPLETED" : "TASK_UNCOMPLETED") : "TASK_PRIORITY_CHANGED";
    auditLog(action, req.user, "task", id, rows[0].title);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alt gorev olustur
app.post("/api/tasks/:id/subtasks", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Baslik gerekli" });
    }
    const parent = await pool.query("SELECT id FROM tasks WHERE id = $1", [id]);
    if (parent.rows.length === 0) {
      return res.status(404).json({ error: "Ust gorev bulunamadi" });
    }
    const { rows } = await pool.query(
      "INSERT INTO subtasks (parent_id, title) VALUES ($1, $2) RETURNING *",
      [id, title.trim()]
    );
    auditLog("SUBTASK_CREATED", req.user, "subtask", rows[0].id, title.trim());
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alt gorev durumunu guncelle
app.patch("/api/subtasks/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const { rows } = await pool.query(
      "UPDATE subtasks SET completed = $1 WHERE id = $2 RETURNING *",
      [completed, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Alt gorev bulunamadi" });
    }
    auditLog(completed ? "SUBTASK_COMPLETED" : "SUBTASK_UNCOMPLETED", req.user, "subtask", id, rows[0].title);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alt gorevi sil
app.delete("/api/subtasks/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "DELETE FROM subtasks WHERE id = $1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Alt gorev bulunamadi" });
    }
    auditLog("SUBTASK_DELETED", req.user, "subtask", id, rows[0].title);
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yorum ekle
app.post("/api/tasks/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Yorum metni gerekli" });
    }
    const parent = await pool.query("SELECT id FROM tasks WHERE id = $1", [id]);
    if (parent.rows.length === 0) {
      return res.status(404).json({ error: "Gorev bulunamadi" });
    }
    const authorName = req.user.email;
    const { rows } = await pool.query(
      "INSERT INTO comments (task_id, text, author) VALUES ($1, $2, $3) RETURNING *",
      [id, text.trim(), authorName]
    );
    auditLog("COMMENT_CREATED", req.user, "comment", rows[0].id, text.trim());
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yorum sil
app.delete("/api/comments/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "DELETE FROM comments WHERE id = $1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Yorum bulunamadi" });
    }
    auditLog("COMMENT_DELETED", req.user, "comment", id, rows[0].text);
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dosya yukle (S3 + DB)
app.post("/api/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Dosya bulunamadi" });

    const key = `uploads/${Date.now()}-${file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    const { rows } = await pool.query(
      "INSERT INTO files (filename, s3_key, url, size, mimetype, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [file.originalname, key, url, file.size, file.mimetype, req.user.email]
    );

    const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }), { expiresIn: 3600 });

    auditLog("FILE_UPLOADED", req.user, "file", rows[0].id, file.originalname);
    res.status(201).json({ ...rows[0], url: signedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dosyalari listele (presigned URL ile)
app.get("/api/files", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM files ORDER BY created_at DESC");
    const filesWithUrls = await Promise.all(rows.map(async (f) => {
      const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: f.s3_key,
      }), { expiresIn: 3600 });
      return { ...f, url: signedUrl };
    }));
    res.json(filesWithUrls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dosya sil (S3 + DB)
app.delete("/api/files/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM files WHERE id = $1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Dosya bulunamadi" });
    }

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: rows[0].s3_key,
    }));

    await pool.query("DELETE FROM files WHERE id = $1", [id]);
    auditLog("FILE_DELETED", req.user, "file", id, rows[0].filename);
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucuyu baslat
app.listen(PORT, async () => {
  console.log(`Task Manager http://localhost:${PORT} adresinde calisiyor`);
  await initDB();
});
