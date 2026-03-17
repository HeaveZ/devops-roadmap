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

    console.log("Veritabanı hazır.");
  } catch (err) {
    console.error("DB init hatası:", err.message);
  }
}

// --- API ROUTES ---

// Tüm görevleri getir
app.get("/api/tasks", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM tasks ORDER BY section, id"
    );
    res.json(rows);
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

// Sunucuyu başlat
app.listen(PORT, async () => {
  console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
  await initDB();
});
