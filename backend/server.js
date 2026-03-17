const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Veritabanı tablosunu oluştur (ilk çalıştırmada)
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
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tablo boşsa varsayılan görevleri ekle
    const { rowCount } = await pool.query("SELECT 1 FROM tasks LIMIT 1");
    if (rowCount === 0) {
      const defaultTasks = [
        // Linux & OS Temelleri
        { title: "Linux komut satırı temelleri", section: "Linux & OS" },
        { title: "Dosya sistemi ve izinler", section: "Linux & OS" },
        { title: "Süreç yönetimi (ps, top, kill)", section: "Linux & OS" },
        { title: "Shell scripting (Bash)", section: "Linux & OS" },
        { title: "Cron jobs & systemd", section: "Linux & OS" },
        // Networking
        { title: "TCP/IP, DNS, HTTP/HTTPS temelleri", section: "Networking" },
        { title: "Firewall (iptables, ufw)", section: "Networking" },
        { title: "Load Balancing kavramları", section: "Networking" },
        { title: "SSL/TLS sertifikaları", section: "Networking" },
        // Versiyon Kontrol
        { title: "Git temelleri (add, commit, push, pull)", section: "Git & VCS" },
        { title: "Branching ve merging stratejileri", section: "Git & VCS" },
        { title: "GitHub/GitLab kullanımı", section: "Git & VCS" },
        // CI/CD
        { title: "CI/CD kavramları", section: "CI/CD" },
        { title: "GitHub Actions", section: "CI/CD" },
        { title: "Jenkins pipeline", section: "CI/CD" },
        { title: "GitLab CI", section: "CI/CD" },
        // Containers
        { title: "Docker temelleri", section: "Containers" },
        { title: "Dockerfile yazımı", section: "Containers" },
        { title: "Docker Compose", section: "Containers" },
        { title: "Container registry kullanımı", section: "Containers" },
        // Orchestration
        { title: "Kubernetes temelleri", section: "Orchestration" },
        { title: "Pods, Services, Deployments", section: "Orchestration" },
        { title: "Helm charts", section: "Orchestration" },
        { title: "kubectl komutları", section: "Orchestration" },
        // Cloud
        { title: "AWS / Azure / GCP temelleri", section: "Cloud" },
        { title: "IAM ve güvenlik", section: "Cloud" },
        { title: "S3 / Blob Storage", section: "Cloud" },
        { title: "EC2 / VM yönetimi", section: "Cloud" },
        // IaC
        { title: "Terraform temelleri", section: "IaC" },
        { title: "Ansible ile konfigürasyon yönetimi", section: "IaC" },
        { title: "CloudFormation / ARM Templates", section: "IaC" },
        // Monitoring
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
      console.log("Varsayılan görevler eklendi.");
    }

    // Kişisel roadmap görevlerini ekle (bir kez)
    const { rowCount: roadmapCheck } = await pool.query(
      "SELECT 1 FROM tasks WHERE title LIKE '* %' LIMIT 1"
    );
    if (roadmapCheck === 0) {
      const roadmap = [
        // Docker Deep Dive
        {
          section: "Docker Deep Dive",
          tasks: [
            { title: "* Multi-stage builds", subtasks: ["* Github'da evamX projelerini incele ve Dockerfile yapısı ile ilgili bir analiz yap."] },
            { title: "* Docker networking detayları (bridge, overlay, host)", subtasks: ["* Docker network yapısını ve kavramlarını öğren"] },
            { title: "* Volume management ve persistent storage", subtasks: ["* Stateful uygulamalar için volume ve persistent storage kavramlarını öğren"] },
            { title: "* Docker security best practices", subtasks: ["* Dockerize bir uygulama için güvenlik best practice'lerini öğren"] },
            { title: "* Image optimization teknikleri", subtasks: ["* Docker build sonrasında oluşan Image'ın optimizasyonlarını araştır ve uygula"] },
          ],
        },
        // Linux & Scripting
        {
          section: "Linux & Scripting",
          tasks: [
            { title: "* Bash scripting", subtasks: ["* Temel bash scriptlerini kullanmayı alışkanlık haline getir, AI ile işine yarayacak scriptler oluştur."] },
            { title: "* Log analizi araçları (grep, awk, sed, jq)", subtasks: ["* Çalışan docker container yada pod içindeki uygulamanın loglarını analiz etmeyi öğren"] },
            { title: "* Systemd servisleri", subtasks: ["* Temel linux servisleri ve yeni bir servisin systemd'e eklenmesini araştır"] },
            { title: "* Cron jobs ve automation", subtasks: ["* Zamanlı işler için cronjob oluşturmayı öğren"] },
          ],
        },
        // Networking Temelleri
        {
          section: "Networking Temelleri",
          tasks: [
            { title: "* TCP/IP deep dive", subtasks: ["* Temel network kavramları, özellikle docker ve kubernetes ortamlar için"] },
            { title: "* Load balancing kavramları", subtasks: ["* Load Balancer yapısı ve kavramlarını öğren"] },
            { title: "* Reverse proxy (Nginx detaylı)", subtasks: ["* Reverse Proxy kavramını ve teknik yapısını öğren"] },
            { title: "* DNS management", subtasks: ["* DNS yönetimini, teknik yapısını ve kavramlarını öğren"] },
          ],
        },
        // Pratik Projeler
        {
          section: "Pratik Projeler",
          tasks: [
            { title: "* evamX servislerinden birini multi-stage build ile optimize et", subtasks: [] },
            { title: "* Docker Compose ile 5+ servisli bir environment kur (DB, evamX, Nginx)", subtasks: [] },
            { title: "* Nginx ile reverse proxy + SSL termination kur", subtasks: [] },
            { title: "* Belirttiğim bütün teknik süreçler ile ilgili kendi lokalinde test et", subtasks: [] },
          ],
        },
        // ToDo
        {
          section: "ToDo",
          tasks: [
            { title: "* Haftada 2 saat pair programming", subtasks: [] },
            { title: "* Code review", subtasks: [] },
          ],
        },
      ];

      for (const group of roadmap) {
        for (const task of group.tasks) {
          const { rows } = await pool.query(
            "INSERT INTO tasks (title, section) VALUES ($1, $2) RETURNING id",
            [task.title, group.section]
          );
          const taskId = rows[0].id;
          for (const st of task.subtasks) {
            await pool.query(
              "INSERT INTO subtasks (parent_id, title) VALUES ($1, $2)",
              [taskId, st]
            );
          }
        }
      }
      console.log("Kişisel roadmap görevleri eklendi.");
    }

    console.log("Veritabanı hazır.");
  } catch (err) {
    console.error("DB init hatası:", err.message);
  }
}

// --- API ROUTES ---

// Tüm görevleri getir (subtask'larla birlikte)
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

// Yeni görev oluştur
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, section } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Başlık gerekli" });
    }
    if (!section || !section.trim()) {
      return res.status(400).json({ error: "Section gerekli" });
    }
    const { rows } = await pool.query(
      "INSERT INTO tasks (title, section) VALUES ($1, $2) RETURNING *",
      [title.trim(), section.trim()]
    );
    res.status(201).json({ ...rows[0], subtasks: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Görev durumunu güncelle (tamamlandı işaretleme)
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const { rows } = await pool.query(
      "UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *",
      [completed, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Görev bulunamadı" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alt görev oluştur
app.post("/api/tasks/:id/subtasks", async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Başlık gerekli" });
    }
    const parent = await pool.query("SELECT id FROM tasks WHERE id = $1", [id]);
    if (parent.rows.length === 0) {
      return res.status(404).json({ error: "Üst görev bulunamadı" });
    }
    const { rows } = await pool.query(
      "INSERT INTO subtasks (parent_id, title) VALUES ($1, $2) RETURNING *",
      [id, title.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alt görev durumunu güncelle
app.patch("/api/subtasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const { rows } = await pool.query(
      "UPDATE subtasks SET completed = $1 WHERE id = $2 RETURNING *",
      [completed, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Alt görev bulunamadı" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alt görevi sil
app.delete("/api/subtasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "DELETE FROM subtasks WHERE id = $1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Alt görev bulunamadı" });
    }
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yorum ekle
app.post("/api/tasks/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Yorum metni gerekli" });
    }
    const parent = await pool.query("SELECT id FROM tasks WHERE id = $1", [id]);
    if (parent.rows.length === 0) {
      return res.status(404).json({ error: "Görev bulunamadı" });
    }
    const { rows } = await pool.query(
      "INSERT INTO comments (task_id, text) VALUES ($1, $2) RETURNING *",
      [id, text.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yorum sil
app.delete("/api/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "DELETE FROM comments WHERE id = $1 RETURNING *",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Yorum bulunamadı" });
    }
    res.json({ message: "Silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucuyu başlat
app.listen(PORT, async () => {
  console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
  await initDB();
});
