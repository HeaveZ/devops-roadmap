# Taskly — DevOps Roadmap Tracker

> **Domain:** heavezz.uk  
> **Sunucu:** Contabo VPS  — Linux amd64  
> **Orkestrasyon:** Docker Compose (4 container)  
> **Kaynak Kod:** [github.com/HeaveZ/devops-roadmap](https://github.com/HeaveZ/devops-roadmap)

---

## İçindekiler

- [Genel Mimari](#genel-mimari)
- [Containerlar](#containerlar)
- [Frontend](#frontend-react-19)
- [Backend](#backend-nodejs--express-5)
- [Veritabanı](#veritabanı-postgresql-15)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [Güvenlik](#güvenlik)
- [Multi-Architecture Build](#multi-architecture-build)
- [External Servisler](#external-servisler)
- [Trafik Akışı](#trafik-akışı)
- [DevOps Komutları](#devops-komutları)
- [Dosya Yapısı](#dosya-yapısı)

---

## Genel Mimari

```
                        INTERNET
                           |
                    +------+------+
                    |  Cloudflare  |
                    |  DNS + CDN   |
                    |  SSL/TLS     |
                    |  DDoS Koruma |
                    +------+------+
                           |
                   Contabo VPS 
                           |
              +------------+------------+
              |     Docker Network      |
              |     (bridge: heavezz)   |
              |                         |
    +---------+---------+               |
    |   Nginx Container  |              |
    |   (Reverse Proxy)  |              |
    |   Port 80/443      |              |
    +----+--------+-----+              |
         |        |                     |
    +----+--+ +---+----+               |
    |  /    | | /api/* |               |
    +---+---+ +---+----+               |
        |         |                     |
  +-----+--+  +--+-------+  +---------+--+
  |Frontend |  | Backend   |  | PostgreSQL |
  |Container|  | Container |  | Container  |
  |nginx:80 |  | node:5000 |  | pg:5432    |
  +---------+  +-----+-----+  +-----------+
                     |
              +------+------+
              |   AWS S3    |
              | eu-north-1  |
              | heavezz-    |
              | images      |
              +-------------+
```

---

## Containerlar

| Container | Image | Port | Rol | Restart |
|---|---|---|---|---|
| heavezz-nginx-1 | nginx:alpine | 80, 443 → host | Reverse proxy | always |
| heavezz-frontend-1 | heavezz-frontend | 80 (internal) | React SPA serve | always |
| heavezz-backend-1 | heavezz-backend | 5000 (internal) | Node.js REST API | always |
| heavezz-db-1 | postgres:15 | 5432 (internal) | Veritabanı | always |

> **Başlatma sırası:** `db → backend → frontend → nginx`

---

## Frontend (React 19)

**Dockerfile:** Multi-stage build

| Aşama | Açıklama |
|---|---|
| Stage 1 (build) | `node:18-alpine` → `npm install` → `npm run build` |
| Stage 2 (serve) | `nginx:alpine` → build çıktısını serve eder |

**Teknolojiler:**
- React 19.2.4
- Vanilla CSS (framework yok)
- JWT token ile auth (localStorage)

**Özellikler:**
- Kullanıcı girişi (JWT tabanlı)
- Görev listesi (section bazlı gruplama)
- Alt görev (subtask) yönetimi
- Yorum sistemi
- Dosya upload/download (S3 entegrasyonu)
- Avatar yükleme
- Şifre değiştirme (değişince otomatik logout)
- Drag & drop dosya yükleme
- Progress bar (genel ilerleme takibi)

---

## Backend (Node.js / Express 5)

**Dockerfile:** Single-stage build (`node:18-alpine`)

### Bağımlılıklar

| Paket | Versiyon | Kullanım |
|---|---|---|
| express | 5.2.1 | HTTP framework |
| pg | 8.20.0 | PostgreSQL client |
| jsonwebtoken | 9.0.3 | JWT auth |
| bcryptjs | 3.0.3 | Şifre hash'leme |
| cors | 2.8.6 | Cross-origin izinleri |
| dotenv | 17.3.1 | Env variable yönetimi |
| @aws-sdk/client-s3 | 3.x | S3 dosya işlemleri |
| @aws-sdk/s3-request-presigner | 3.x | Presigned URL üretimi |
| multer | 1.4.5 | Dosya upload middleware |

### API Endpoints

| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| POST | `/api/login` | Hayır | Kullanıcı girişi, JWT döner |
| POST | `/api/change-password` | Evet | Şifre değiştirme |
| POST | `/api/avatar` | Evet | Avatar yükleme (base64) |
| GET | `/api/avatar/:username` | Hayır | Kullanıcı avatarı getir |
| GET | `/api/tasks` | Evet | Tüm görevler + subtask + yorum |
| POST | `/api/tasks` | Evet | Yeni görev oluştur |
| PATCH | `/api/tasks/:id` | Evet | Görev durumu güncelle |
| POST | `/api/tasks/:id/subtasks` | Evet | Alt görev ekle |
| PATCH | `/api/subtasks/:id` | Evet | Alt görev durumu güncelle |
| DELETE | `/api/subtasks/:id` | Evet | Alt görev sil |
| POST | `/api/tasks/:id/comments` | Evet | Yorum ekle |
| DELETE | `/api/comments/:id` | Evet | Yorum sil |
| POST | `/api/upload` | Evet | Dosya yükle (S3) |
| GET | `/api/files` | Evet | Dosya listele (presigned URL) |
| DELETE | `/api/files/:id` | Evet | Dosya sil (S3 + DB) |

---

## Veritabanı (PostgreSQL 15)

**Persistent Storage:** Docker named volume → `heavezz_pgdata`

### Tablolar

**users**
```sql
id            SERIAL PRIMARY KEY
username      VARCHAR(100) UNIQUE
password_hash VARCHAR(255)   -- bcrypt hash
avatar_data   TEXT           -- base64 encoded
created_at    TIMESTAMP
```

**tasks**
```sql
id         SERIAL PRIMARY KEY
title      VARCHAR(255)
section    VARCHAR(100)   -- gruplama için
completed  BOOLEAN
created_at TIMESTAMP
```

**subtasks**
```sql
id         SERIAL PRIMARY KEY
parent_id  INTEGER → tasks(id) ON DELETE CASCADE
title      VARCHAR(255)
completed  BOOLEAN
created_at TIMESTAMP
```

**comments**
```sql
id         SERIAL PRIMARY KEY
task_id    INTEGER → tasks(id) ON DELETE CASCADE
author     VARCHAR(100)
text       TEXT
created_at TIMESTAMP
```

**files**
```sql
id          SERIAL PRIMARY KEY
filename    VARCHAR(255)
s3_key      VARCHAR(500)
url         TEXT
size        INTEGER
mimetype    VARCHAR(100)
uploaded_by VARCHAR(100)
created_at  TIMESTAMP
```

> **Auto-init:** İlk başlatmada tablolar ve varsayılan görevler (DevOps roadmap) otomatik oluşturulur.

---

## Nginx Reverse Proxy

| Route | Yönlendirme | Açıklama |
|---|---|---|
| `/` | `http://frontend:80` | React SPA |
| `/api/*` | `http://backend:5000` | Node.js API |

**Özellikler:**
- WebSocket desteği (Upgrade header)
- Real IP forwarding (X-Real-IP)
- Max upload: 10MB (`client_max_body_size`)
- Docker internal DNS ile service discovery

---

## Güvenlik

| Katman | Uygulama |
|---|---|
| SSL/TLS | Cloudflare tarafından terminate ediliyor |
| DDoS | Cloudflare proxy koruması |
| Auth | JWT (7 gün expiry), Bearer token |
| Şifre | bcrypt hash (salt round: 10) |
| Secrets | `.env` dosyasında, `.gitignore`'da — repo'ya gitmiyor |
| JWT Secret | Environment variable'dan okunuyor |
| Dosya upload | 10MB limit, S3 presigned URL (1 saat TTL) |

---

## Multi-Architecture Build

`docker buildx` ile hem **linux/amd64** (Contabo) hem **linux/arm64** (Apple Silicon) için image üretilir.

**Registry:** GitHub Container Registry (`ghcr.io`)

| Image | Platform |
|---|---|
| `ghcr.io/heavez/devops-backend:latest` | amd64 + arm64 |
| `ghcr.io/heavez/devops-frontend:latest` | amd64 + arm64 |

> `docker pull` otomatik olarak çalıştığı platformun mimarisini seçer.

---

## External Servisler

| Servis | Kullanım | Bölge |
|---|---|---|
| Cloudflare | DNS, CDN, SSL, DDoS koruması | Global |
| AWS S3 | Dosya depolama (heavezz-images) | eu-north-1 (Stockholm) |
| GitHub | Kaynak kod (devops-roadmap repo) | — |
| ghcr.io | Docker image registry | — |

---

## Trafik Akışı

```
1. Kullanıcı heavezz.uk'ye girer
2. DNS → Cloudflare (188.114.97.3) → SSL terminate
3. Cloudflare → Contabo 
4. Nginx container request'i alır
5a. "/" → Frontend container → React SPA (HTML/CSS/JS) döner
5b. "/api/*" → Backend container → İş mantığı çalışır
6. Backend → PostgreSQL (veri okuma/yazma)
7. Backend → AWS S3 (dosya upload/download - presigned URL)
8. Response aynı yoldan geri döner
```

---

## DevOps Komutları

```bash
# Tüm servisleri başlat
docker compose up -d

# Rebuild ile başlat (kod değişikliği sonrası)
docker compose up -d --build

# Sadece frontend rebuild
docker compose up -d --build frontend

# Logları izle
docker compose logs -f backend

# Container durumları
docker compose ps

# Veritabanına bağlan
docker compose exec db psql -U heavezz heavezzdb

# Multi-arch build + push
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/heavez/devops-backend:latest --push ./backend/

# Durdur
docker compose down

# Durdur + volume sil (DİKKAT: DB verileri gider!)
docker compose down -v
```

---

## Dosya Yapısı

```
/opt/heavezz/
├── .env                    ← Tüm secretlar (gitignore'da)
├── .gitignore
├── docker-compose.yml      ← Orkestrasyon tanımı
├── backend/
│   ├── Dockerfile          ← node:18-alpine, single-stage
│   ├── package.json
│   └── server.js           ← Tüm API + DB init
├── frontend/
│   ├── Dockerfile          ← Multi-stage (build + nginx)
│   ├── package.json
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── index.html      ← Title: Taskly
│   │   └── manifest.json   ← PWA manifest
│   └── src/
│       ├── App.js          ← Tüm UI mantığı
│       └── App.css         ← Tüm stiller
└── nginx/
    └── nginx.conf          ← Reverse proxy config
```

---

*Taskly — HeaveZ DevOps Roadmap Projesi*
