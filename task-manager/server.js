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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const { Kafka } = require("kafkajs");

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;
// NOSONAR-NEXT: dahili Docker bridge network URL'si, public network'e cikmaz
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || "http://auth-server:3001"; // NOSONAR

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

// Bildirim olusturma helper
async function createNotification(userEmail, type, title, message, resource, resourceId) {
  if (!userEmail) return;
  try {
    await pool.query(
      "INSERT INTO notifications (user_email, type, title, message, resource, resource_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [userEmail, type, title, message || null, resource || null, String(resourceId || "")]
    );
  } catch (err) {
    console.error("Bildirim olusturulamadi:", err.message);
  }
}

async function createNotification(userEmail, type, title, message, resource, resourceId) {
  if (!userEmail) return;
  try {
    await pool.query(
      "INSERT INTO notifications (user_email, type, title, message, resource, resource_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [userEmail, type, title, message || null, resource || null, String(resourceId || "")]
    );
  } catch (err) {
    console.error("Bildirim olusturulamadi:", err.message);
  }
}

// Middleware
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
app.use(express.json({ limit: '5mb' }));

const healthStartTime = Date.now();
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: process.env.SERVICE_NAME || 'task-manager',
    version: process.env.VERSION || '2.1',
    uptime_seconds: Math.floor((Date.now() - healthStartTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

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

    // --- Jira-like yeni kolonlar ---
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT`);
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'todo'`);
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_email VARCHAR(100)`);
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE`);
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id INTEGER`);
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0`);

    // Notifications tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        resource VARCHAR(50),
        resource_id VARCHAR(50),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Labels tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Task-Label junction tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, label_id)
      )
    `);

    // Sprints tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_date DATE,
        end_date DATE,
        status VARCHAR(20) DEFAULT 'planning',
        created_at TIMESTAMP DEFAULT NOW()
      )
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        resource VARCHAR(50),
        resource_id VARCHAR(50),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0
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
  if (!authHeader?.startsWith("Bearer ")) {
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

// Tum gorevleri getir (misafir erisime acik, filtreleme destekli)
app.get("/api/tasks", async (req, res) => {
  try {
    const { status, assignee, sprint_id, label, search } = req.query;

    let taskQuery = "SELECT * FROM tasks WHERE 1=1";
    const params = [];
    let idx = 1;

    if (status) {
      taskQuery += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (assignee) {
      taskQuery += ` AND assignee_email = $${idx++}`;
      params.push(assignee);
    }
    if (sprint_id) {
      taskQuery += ` AND sprint_id = $${idx++}`;
      params.push(sprint_id);
    }
    if (search) {
      taskQuery += ` AND (title ILIKE $${idx} OR description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (label) {
      taskQuery += ` AND id IN (SELECT task_id FROM task_labels tl JOIN labels l ON tl.label_id = l.id WHERE l.name = $${idx++})`;
      params.push(label);
    }

    taskQuery += " ORDER BY section, position, id";

    const { rows: tasks } = await pool.query(taskQuery, params);
    const { rows: subtasks } = await pool.query("SELECT * FROM subtasks ORDER BY created_at");
    const { rows: comments } = await pool.query("SELECT * FROM comments ORDER BY created_at");
    const { rows: taskLabels } = await pool.query(
      "SELECT tl.task_id, l.id, l.name, l.color FROM task_labels tl JOIN labels l ON tl.label_id = l.id"
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
    const labelMap = {};
    taskLabels.forEach(tl => {
      if (!labelMap[tl.task_id]) labelMap[tl.task_id] = [];
      labelMap[tl.task_id].push({ id: tl.id, name: tl.name, color: tl.color });
    });

    const result = tasks.map(t => ({
      ...t,
      subtasks: subtaskMap[t.id] || [],
      comments: commentMap[t.id] || [],
      labels: labelMap[t.id] || [],
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gorev siralamasini guncelle
app.post("/api/tasks/reorder", authMiddleware, async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds)) return res.status(400).json({ error: "taskIds dizisi gerekli" });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < taskIds.length; i++) {
        await client.query("UPDATE tasks SET position = $1 WHERE id = $2", [i, taskIds[i]]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    auditLog("TASKS_REORDERED", req.user, "task", null, `${taskIds.length} gorev yeniden siralandi`);
    res.json({ message: "Siralama guncellendi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tek gorev detayi
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: tasks } = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: "Gorev bulunamadi" });
    }
    const task = tasks[0];
    const { rows: subtasks } = await pool.query("SELECT * FROM subtasks WHERE parent_id = $1 ORDER BY created_at", [id]);
    const { rows: comments } = await pool.query("SELECT * FROM comments WHERE task_id = $1 ORDER BY created_at", [id]);
    const { rows: labels } = await pool.query(
      "SELECT l.id, l.name, l.color FROM task_labels tl JOIN labels l ON tl.label_id = l.id WHERE tl.task_id = $1", [id]
    );
    res.json({ ...task, subtasks, comments, labels });
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
    const { title, section, description, priority, assignee_email, due_date, sprint_id } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: "Baslik gerekli" });
    }
    if (!section?.trim()) {
      return res.status(400).json({ error: "Section gerekli" });
    }
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, section, description, priority, assignee_email, due_date, sprint_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo') RETURNING *`,
      [
        title.trim(),
        section.trim(),
        description || null,
        priority || 'none',
        assignee_email || null,
        due_date || null,
        sprint_id || null,
      ]
    );
    auditLog("TASK_CREATED", req.user, "task", rows[0].id, title.trim());
    res.status(201).json({ ...rows[0], subtasks: [], comments: [], labels: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Task patch icin field'lari topla
const VALID_PRIORITIES = new Set(['none', 'dusuk', 'orta', 'yuksek', 'kritik']);
const VALID_STATUSES = new Set(['todo', 'in_progress', 'in_review', 'done']);

function resolveAutoCompleted(status, explicitCompleted) {
  if (status === 'done') return true;
  if (explicitCompleted === undefined) return false;
  return undefined;
}

function buildTaskPatch(body) {
  const updates = [];
  const values = [];
  let idx = 1;

  const addField = (col, val) => { updates.push(`${col} = $${idx++}`); values.push(val); };

  if (body.completed !== undefined) addField('completed', body.completed);
  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.has(body.priority)) return { error: "Gecersiz oncelik degeri" };
    addField('priority', body.priority);
  }
  if (body.description !== undefined) addField('description', body.description);
  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status)) return { error: "Gecersiz durum degeri" };
    addField('status', body.status);
    const auto = resolveAutoCompleted(body.status, body.completed);
    if (auto !== undefined) addField('completed', auto);
  }
  if (body.assignee_email !== undefined) addField('assignee_email', body.assignee_email || null);
  if (body.due_date !== undefined) addField('due_date', body.due_date || null);
  if (body.sprint_id !== undefined) addField('sprint_id', body.sprint_id || null);

  return { updates, values, idx };
}

// Gorev guncelle (tum alanlar)
app.patch("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = buildTaskPatch(req.body);
    if (patch.error) return res.status(400).json({ error: patch.error });
    if (patch.updates.length === 0) return res.status(400).json({ error: "Guncellenecek alan belirtilmedi" });

    patch.values.push(id);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${patch.updates.join(', ')} WHERE id = $${patch.idx} RETURNING *`,
      patch.values
    );
    if (rows.length === 0) return res.status(404).json({ error: "Gorev bulunamadi" });

    let action = "TASK_UPDATED";
    if (req.body.status) action = "TASK_STATUS_CHANGED";
    else if (req.body.completed !== undefined) action = req.body.completed ? "TASK_COMPLETED" : "TASK_UNCOMPLETED";
    auditLog(action, req.user, "task", id, rows[0].title);
    // Assignee degistiyse bildirim gonder
    if (req.body.assignee_email && req.body.assignee_email !== req.user.email) {
      createNotification(req.body.assignee_email, 'TASK_ASSIGNED', `Size bir gorev atandi: ${rows[0].title}`, null, 'task', id);
    }

    if (req.body.assignee_email && req.body.assignee_email !== req.user.email) {
      createNotification(req.body.assignee_email, 'TASK_ASSIGNED', `Size bir gorev atandi: ${rows[0].title}`, null, 'task', id);
    }

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
    if (!title?.trim()) {
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
    if (!text?.trim()) {
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

    const taskResult = await pool.query("SELECT assignee_email, title FROM tasks WHERE id = $1", [id]);
    const taskData = taskResult.rows[0];
    if (taskData?.assignee_email && taskData.assignee_email !== req.user.email) {
      createNotification(taskData.assignee_email, 'COMMENT_ADDED', `${rows[0].author} yorum yapti: ${taskData.title}`, text.trim(), 'task', id);
    }

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

// --- LABELS CRUD ---

app.get("/api/labels", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM labels ORDER BY name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/labels", authMiddleware, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Etiket adi gerekli" });
    }
    const { rows } = await pool.query(
      "INSERT INTO labels (name, color) VALUES ($1, $2) RETURNING *",
      [name.trim(), color || '#6366f1']
    );
    auditLog("LABEL_CREATED", req.user, "label", rows[0].id, name.trim());
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: "Bu etiket zaten mevcut" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/labels/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("DELETE FROM labels WHERE id = $1 RETURNING *", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Etiket bulunamadi" });
    }
    auditLog("LABEL_DELETED", req.user, "label", id, rows[0].name);
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASK-LABEL YONETIMI ---

app.post("/api/tasks/:id/labels", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { labelId } = req.body;
    if (!labelId) return res.status(400).json({ error: "labelId gerekli" });

    const task = await pool.query("SELECT id FROM tasks WHERE id = $1", [id]);
    if (task.rows.length === 0) return res.status(404).json({ error: "Gorev bulunamadi" });

    const label = await pool.query("SELECT id, name FROM labels WHERE id = $1", [labelId]);
    if (label.rows.length === 0) return res.status(404).json({ error: "Etiket bulunamadi" });

    await pool.query(
      "INSERT INTO task_labels (task_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [id, labelId]
    );
    auditLog("TASK_LABEL_ADDED", req.user, "task_label", id, label.rows[0].name);
    res.status(201).json({ message: "Etiket eklendi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id/labels/:labelId", authMiddleware, async (req, res) => {
  try {
    const { id, labelId } = req.params;
    const { rowCount } = await pool.query(
      "DELETE FROM task_labels WHERE task_id = $1 AND label_id = $2",
      [id, labelId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Etiket iliskisi bulunamadi" });
    }
    auditLog("TASK_LABEL_REMOVED", req.user, "task_label", id, `label:${labelId}`);
    res.json({ message: "Etiket kaldirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SPRINTS CRUD ---

app.get("/api/sprints", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM sprints ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sprints", authMiddleware, async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Sprint adi gerekli" });
    }
    const { rows } = await pool.query(
      "INSERT INTO sprints (name, start_date, end_date) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), start_date || null, end_date || null]
    );
    auditLog("SPRINT_CREATED", req.user, "sprint", rows[0].id, name.trim());
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/sprints/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, status } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${idx++}`);
      values.push(start_date || null);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${idx++}`);
      values.push(end_date || null);
    }
    if (status !== undefined) {
      const validStatuses = ['planning', 'active', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Gecersiz sprint durumu" });
      }
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "Guncellenecek alan belirtilmedi" });
    }
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE sprints SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Sprint bulunamadi" });
    }
    auditLog("SPRINT_UPDATED", req.user, "sprint", id, rows[0].name);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/sprints/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Sprint silinince task'larin sprint_id'sini null yap
    await pool.query("UPDATE tasks SET sprint_id = NULL WHERE sprint_id = $1", [id]);
    const { rows } = await pool.query("DELETE FROM sprints WHERE id = $1 RETURNING *", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Sprint bulunamadi" });
    }
    auditLog("SPRINT_DELETED", req.user, "sprint", id, rows[0].name);
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DOSYA ISLEMLERI ---

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

// --- NOTIFICATIONS ---

// Kullanicinin bildirimlerini getir
app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const { unread } = req.query;
    let query = "SELECT * FROM notifications WHERE user_email = $1";
    const params = [req.user.email];
    if (unread === "true") {
      query += " AND read = false";
    }
    query += " ORDER BY created_at DESC LIMIT 50";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bildirimi okundu olarak isaretle
app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "UPDATE notifications SET read = true WHERE id = $1 AND user_email = $2 RETURNING *",
      [id, req.user.email]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Bildirim bulunamadi" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tum bildirimleri okundu olarak isaretle
app.post("/api/notifications/read-all", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET read = true WHERE user_email = $1 AND read = false",
      [req.user.email]
    );
    res.json({ message: "Tum bildirimler okundu olarak isaretlendi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Okunmamis bildirim sayisi
app.get("/api/notifications/unread-count", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) FROM notifications WHERE user_email = $1 AND read = false",
      [req.user.email]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTIFICATIONS ---

app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    let query = "SELECT * FROM notifications WHERE user_email = $1";
    const params = [req.user.email];
    if (req.query.unread === 'true') {
      query += " AND read = false";
    }
    query += " ORDER BY created_at DESC LIMIT 50";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications/unread-count", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_email = $1 AND read = false",
      [req.user.email]
    );
    res.json({ count: Number.parseInt(rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE notifications SET read = true WHERE id = $1 AND user_email = $2 RETURNING *",
      [req.params.id, req.user.email]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Bildirim bulunamadi" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/read-all", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET read = true WHERE user_email = $1 AND read = false",
      [req.user.email]
    );
    res.json({ message: "Tum bildirimler okundu" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASK REORDER ---

app.post("/api/tasks/reorder", authMiddleware, async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds)) return res.status(400).json({ error: "taskIds dizisi gerekli" });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < taskIds.length; i++) {
        await client.query("UPDATE tasks SET position = $1 WHERE id = $2", [i, taskIds[i]]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    auditLog("TASKS_REORDERED", req.user, "task", null, `${taskIds.length} gorev yeniden siralandi`);
    res.json({ message: "Siralama guncellendi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit loglari getir
app.get("/api/audit-logs", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 200);
    const offset = Number.parseInt(req.query.offset, 10) || 0;
    const { rows } = await pool.query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    const countResult = await pool.query("SELECT COUNT(*) as total FROM audit_logs");
    res.json({ logs: rows, total: Number.parseInt(countResult.rows[0].total, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucuyu baslat
app.listen(PORT, async () => {
  console.log(`Task Manager http://localhost:${PORT} adresinde calisiyor`);
  await initDB();
});
