# Taskly — DevOps Roadmap Tracker

Görev takibi ve DevOps yol haritası uygulaması. React + Node.js + PostgreSQL stack'i, Docker Compose ile orkestre edilmiş, Cloudflare arkasında Contabo VPS üzerinde çalışmaktadır.

- **Domain:** heavezz.uk
- **Sunucu:** Contabo VPS — Linux amd64
- **Repo:** github.com/HeaveZ/devops-roadmap

---

## İçindekiler

- [Mimari](#mimari)
- [Containerlar](#containerlar)
- [Frontend](#frontend)
- [Backend & API](#backend--api)
- [Veritabanı](#veritabanı)
- [Nginx](#nginx)
- [AWS S3](#aws-s3)
- [Cloudflare](#cloudflare)
- [Güvenlik](#güvenlik)
- [Multi-Arch Build](#multi-arch-build)
- [DevOps Komutları](#devops-komutları)
- [Dosya Yapısı](#dosya-yapısı)

---

## Mimari

```
                        INTERNET
                           │
                    ┌──────┴──────┐
                    │  Cloudflare  │
                    │  DNS + CDN   │
                    │  SSL/TLS     │
                    │  DDoS Koruma │
                    └──────┬──────┘
                           │ :80 / :443
                    Contabo VPS
                           │
              ┌────────────┴────────────┐
              │      Docker Network      │
              │                          │
         ┌────┴─────────┐               │
         │  Nginx        │               │
         │  Reverse Proxy│               │
         │  Port 80/443  │               │
         └──┬────────┬──┘               │
            │        │                   │
           /        /api/*               │
            │        │                   │
      ┌─────┴──┐ ┌──┴──────┐ ┌─────────┴──┐
      │Frontend│ │ Backend  │ │ PostgreSQL  │
      │React   │ │ Node.js  │ │ pg:5432     │
      │:80     │ │ :5000    │ └────────────┘
      └────────┘ └──┬──────┘
                    │
             ┌──────┴──────┐
             │   AWS S3     │
             │ eu-north-1   │
             │heavezz-images│
             └─────────────┘
```

**Trafik akışı (uçtan uca):**

1. Kullanıcı `heavezz.uk`'ye girer
2. DNS → Cloudflare → SSL terminate
3. Cloudflare → Contabo VPS :80
4. Nginx request'i alır
5. `/` → Frontend container (React SPA)
5. `/api/*` → Backend container (Node.js)
6. Backend → PostgreSQL (veri okuma/yazma)
7. Backend → AWS S3 (dosya upload/download — presigned URL)

---

## Containerlar

4 container, Docker Compose ile yönetilmektedir.

| Container | Image | Port | Rol | Restart |
|---|---|---|---|---|
| heavezz-nginx-1 | nginx:alpine | 80, 443 → host | Reverse proxy | always |
| heavezz-frontend-1 | heavezz-frontend | 80 (internal) | React SPA | always |
| heavezz-backend-1 | heavezz-backend | 5000 (internal) | Node.js REST API | always |
| heavezz-db-1 | postgres:15 | 5432 (internal) | Veritabanı | always |

> **Başlatma sırası (depends_on):** `db → backend → frontend → nginx`

---

## Frontend

**Teknoloji:** React 19.2.4, Vanilla CSS, JWT auth (localStorage)

**Dockerfile:** Multi-stage build

| Aşama | İşlem |
|---|---|
| Stage 1 — build | `node:18-alpine` → `npm install` → `npm run build` |
| Stage 2 — serve | `nginx:alpine` → build çıktısını `/usr/share/nginx/html`'e kopyalar |

**Özellikler:**
- JWT tabanlı kullanıcı girişi
- Görev listesi — section bazlı gruplama
- Alt görev (subtask) yönetimi
- Yorum sistemi
- Dosya upload/download (S3 entegrasyonu, drag & drop)
- Avatar yükleme
- Şifre değiştirme (değişince otomatik logout)
- Progress bar (genel ilerleme takibi)

---

## Backend & API

**Teknoloji:** Node.js, Express 5.2.1  
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
| POST | `/api/login` | — | Kullanıcı girişi, JWT döner |
| POST | `/api/change-password` | ✓ | Şifre değiştirme |
| POST | `/api/avatar` | ✓ | Avatar yükleme (base64) |
| GET | `/api/avatar/:username` | — | Kullanıcı avatarı getir |
| GET | `/api/tasks` | ✓ | Tüm görevler + subtask + yorum |
| POST | `/api/tasks` | ✓ | Yeni görev oluştur |
| PATCH | `/api/tasks/:id` | ✓ | Görev durumu güncelle |
| POST | `/api/tasks/:id/subtasks` | ✓ | Alt görev ekle |
| PATCH | `/api/subtasks/:id` | ✓ | Alt görev durumu güncelle |
| DELETE | `/api/subtasks/:id` | ✓ | Alt görev sil |
| POST | `/api/tasks/:id/comments` | ✓ | Yorum ekle |
| DELETE | `/api/comments/:id` | ✓ | Yorum sil |
| POST | `/api/upload` | ✓ | Dosya yükle (S3) |
| GET | `/api/files` | ✓ | Dosya listele (presigned URL) |
| DELETE | `/api/files/:id` | ✓ | Dosya sil (S3 + DB) |

---

## Veritabanı

**Teknoloji:** PostgreSQL 15  
**Persistent storage:** Docker named volume → `heavezz_pgdata`

### Şema

**users**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | SERIAL PK | — |
| username | VARCHAR(100) UNIQUE | — |
| password_hash | VARCHAR(255) | bcrypt hash |
| avatar_data | TEXT | base64 encoded |
| created_at | TIMESTAMP | — |

**tasks**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | SERIAL PK | — |
| title | VARCHAR(255) | — |
| section | VARCHAR(100) | Gruplama için |
| completed | BOOLEAN | — |
| created_at | TIMESTAMP | — |

**subtasks**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | SERIAL PK | — |
| parent_id | INTEGER → tasks(id) | ON DELETE CASCADE |
| title | VARCHAR(255) | — |
| completed | BOOLEAN | — |
| created_at | TIMESTAMP | — |

**comments**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | SERIAL PK | — |
| task_id | INTEGER → tasks(id) | ON DELETE CASCADE |
| author | VARCHAR(100) | — |
| text | TEXT | — |
| created_at | TIMESTAMP | — |

**files**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | SERIAL PK | — |
| filename | VARCHAR(255) | — |
| s3_key | VARCHAR(500) | S3 object key |
| url | TEXT | Presigned URL |
| size | INTEGER | Byte cinsinden |
| mimetype | VARCHAR(100) | — |
| uploaded_by | VARCHAR(100) | — |
| created_at | TIMESTAMP | — |

> **Auto-init:** İlk başlatmada tablolar ve varsayılan DevOps roadmap görevleri otomatik oluşturulur.

---

## Nginx

Hem frontend SPA'yı serve eder hem de API isteklerini backend'e yönlendirir.

| Route | Yönlendirme |
|---|---|
| `/` | `http://frontend:80` |
| `/api/*` | `http://backend:5000` |

**Özellikler:**
- WebSocket desteği (Upgrade header)
- Real IP forwarding (X-Real-IP)
- Max upload boyutu: 10MB (`client_max_body_size`)
- Docker internal DNS ile service discovery

---

## AWS S3

**Bucket:** `heavezz-images`  
**Bölge:** `eu-north-1` (Stockholm)  
**Erişim:** IAM kullanıcısı, `AmazonS3FullAccess` policy

| Özellik | Detay |
|---|---|
| Upload | Multer ile bellekte tutulur, `PutObjectCommand` ile S3'e gönderilir |
| Download | `s3-request-presigner` ile 1 saatlik presigned URL üretilir |
| Silme | `DeleteObjectCommand` + DB kaydı birlikte silinir |
| Dosya limiti | 10MB |

---

## Cloudflare

| Özellik | Açıklama |
|---|---|
| DNS | `heavezz.uk` → Contabo VPS yönlendirmesi |
| SSL/TLS | Flexible mod — kullanıcı ↔ Cloudflare arası şifreli |
| DDoS Koruması | Proxy (turuncu bulut) aktif, gerçek IP gizli |
| CDN | Statik içerik cache'leme |

---

## Güvenlik

| Katman | Uygulama |
|---|---|
| SSL/TLS | Cloudflare tarafından terminate ediliyor |
| DDoS | Cloudflare proxy koruması |
| Auth | JWT — 7 gün expiry, Bearer token |
| Şifre | bcrypt hash, salt round: 10 |
| Secrets | `.env` dosyasında, `.gitignore`'da — repo'ya gitmiyor |
| JWT Secret | Environment variable'dan okunuyor |
| Dosya upload | 10MB limit, presigned URL (1 saat TTL) |

---

## Multi-Arch Build

`docker buildx` ile hem **linux/amd64** (Contabo) hem **linux/arm64** (Apple Silicon) desteklenmektedir.

**Registry:** GitHub Container Registry (`ghcr.io`)

| Image | Platform |
|---|---|
| `ghcr.io/heavez/devops-backend:latest` | linux/amd64 + linux/arm64 |
| `ghcr.io/heavez/devops-frontend:latest` | linux/amd64 + linux/arm64 |

```bash
# Multi-arch build + push
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/heavez/devops-backend:latest --push ./backend/
```

---

## DevOps Komutları

```bash
# Tüm servisleri başlat
docker compose up -d

# Rebuild ile başlat (kod değişikliği sonrası)
docker compose up -d --build

# Sadece tek servis rebuild
docker compose up -d --build frontend

# Logları izle
docker compose logs -f backend

# Container durumları
docker compose ps

# Veritabanına bağlan
docker compose exec db psql -U heavezz heavezzdb

# Durdur
docker compose down

# Durdur + volume sil (DİKKAT: tüm DB verileri silinir!)
docker compose down -v
```

---

## Dosya Yapısı

```
/opt/heavezz/
├── .env                    ← Tüm secretlar (gitignore'da)
├── .gitignore
├── docker-compose.yml      ← 4 container orkestrasyon tanımı
├── backend/
│   ├── Dockerfile          ← node:18-alpine, single-stage
│   ├── package.json
│   └── server.js           ← Tüm API + DB init
├── frontend/
│   ├── Dockerfile          ← Multi-stage (build + nginx serve)
│   ├── package.json
│   ├── public/
│   │   ├── index.html      ← Title: Taskly
│   │   └── manifest.json   ← PWA manifest
│   └── src/
│       ├── App.js          ← Tüm UI mantığı
│       └── App.css         ← Tüm stiller
└── nginx/
    └── nginx.conf          ← Reverse proxy config
```
