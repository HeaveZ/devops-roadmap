Taskly — DevOps Roadmap Tracker
Görev takibi ve DevOps yol haritası uygulaması. React + Node.js + PostgreSQL stack'i, GitHub Actions ile CI/CD pipeline'ı üzerinden ghcr.io'ya build edilip, Contabo VPS üzerinde Docker Compose ile çalıştırılmaktadır. Sunucuda kaynak kod bulunmaz — sadece imajlar registry'den çekilir.

Domain: heavezz.uk
Sunucu: Contabo VPS — Linux amd64
Registry: GitHub Container Registry (ghcr.io)
CI/CD: GitHub Actions
Repo: github.com/HeaveZ/devops-roadmap
İçindekiler
Mimari
CI/CD Pipeline
Containerlar
Frontend
Backend & API
Veritabanı
Nginx
AWS S3
Cloudflare
Güvenlik
Sunucu Yönetimi
Dosya Yapısı
Multi-Arch Build
CI/CD Pipeline
Kaynak kod sadece GitHub'da bulunur. Sunucuda kaynak kod yoktur. İmajlar GitHub Actions tarafından build edilip ghcr.io'ya push edilir, sunucu sadece imajları çeker.

GitHub Repo              GitHub Actions            ghcr.io              Sunucu
┌───────────────┐       ┌────────────────┐       ┌──────────────┐     ┌──────────────┐
│ Kaynak kod    │─push─▶│ Build & Push   │──────▶│ backend:latest│─pull▶│ docker-compose│
│ Dockerfile    │       │ (her push'ta)  │      │ frontend:latest│     │ .env          │
│ workflow.yml  │       └────────────────┘       └──────────────┘     │ nginx.conf    │
└───────────────┘                                                     └──────────────┘
Akış:

Geliştirici kodu GitHub'a push eder
GitHub Actions otomatik tetiklenir (.github/workflows/build-and-push.yml)
Backend ve frontend imajları paralel olarak build edilir
İmajlar ghcr.io'ya push edilir:
ghcr.io/heavez/devops-roadmap/backend:latest
ghcr.io/heavez/devops-roadmap/frontend:latest
Sunucuda docker compose pull && docker compose up -d ile güncelleme yapılır
Workflow özellikleri:

master branch'e her push'ta tetiklenir
GITHUB_TOKEN ile ghcr.io'ya otomatik auth
Her imaja latest + commit SHA tag'i verilir
Containerlar
4 container, Docker Compose ile yönetilmektedir. Tüm uygulama imajları ghcr.io'dan çekilir.

Container	Image	Port	Rol	Restart
heavezz-nginx-1	nginx:alpine	80, 443 → host	Reverse proxy	always
heavezz-frontend-1	ghcr.io/heavez/devops-roadmap/frontend:latest	80 (internal)	React SPA	always
heavezz-backend-1	ghcr.io/heavez/devops-roadmap/backend:latest	5000 (internal)	Node.js REST API	always
heavezz-db-1	postgres:15	5432 (internal)	Veritabanı	always
Başlatma sırası (depends_on): db → backend → frontend → nginx

Frontend
Teknoloji: React 19.2.4, Vanilla CSS, JWT auth (localStorage)

Dockerfile: Multi-stage build

Aşama	İşlem
Stage 1 — build	node:18-alpine → npm install → npm run build
Stage 2 — serve	nginx:alpine → build çıktısını /usr/share/nginx/html'e kopyalar
Özellikler:

JWT tabanlı kullanıcı girişi
Görev listesi — section bazlı gruplama
Alt görev (subtask) yönetimi
Yorum sistemi
Dosya upload/download (S3 entegrasyonu, drag & drop)
Avatar yükleme
Şifre değiştirme (değişince otomatik logout)
Progress bar (genel ilerleme takibi)
Backend & API
Teknoloji: Node.js, Express 5.2.1 Dockerfile: Single-stage build (node:18-alpine)

Bağımlılıklar
Paket	Versiyon	Kullanım
express	5.2.1	HTTP framework
pg	8.20.0	PostgreSQL client
jsonwebtoken	9.0.3	JWT auth
bcryptjs	3.0.3	Şifre hash'leme
cors	2.8.6	Cross-origin izinleri
dotenv	17.3.1	Env variable yönetimi
@aws-sdk/client-s3	3.x	S3 dosya işlemleri
@aws-sdk/s3-request-presigner	3.x	Presigned URL üretimi
multer	1.4.5	Dosya upload middleware
API Endpoints
Method	Endpoint	Auth	Açıklama
POST	/api/login	—	Kullanıcı girişi, JWT döner
POST	/api/change-password	✓	Şifre değiştirme
POST	/api/avatar	✓	Avatar yükleme (base64)
GET	/api/avatar/:username	—	Kullanıcı avatarı getir
GET	/api/tasks	✓	Tüm görevler + subtask + yorum
POST	/api/tasks	✓	Yeni görev oluştur
PATCH	/api/tasks/:id	✓	Görev durumu güncelle
POST	/api/tasks/:id/subtasks	✓	Alt görev ekle
PATCH	/api/subtasks/:id	✓	Alt görev durumu güncelle
DELETE	/api/subtasks/:id	✓	Alt görev sil
POST	/api/tasks/:id/comments	✓	Yorum ekle
DELETE	/api/comments/:id	✓	Yorum sil
POST	/api/upload	✓	Dosya yükle (S3)
GET	/api/files	✓	Dosya listele (presigned URL)
DELETE	/api/files/:id	✓	Dosya sil (S3 + DB)
Nginx
Hem frontend SPA'yı serve eder hem de API isteklerini backend'e yönlendirir.

Route	Yönlendirme
/	http://frontend:80
/api/*	http://backend:5000
Özellikler:

WebSocket desteği (Upgrade header)
Real IP forwarding (X-Real-IP)
Max upload boyutu: 10MB (client_max_body_size)
Docker internal DNS ile service discovery
AWS S3
Bucket: heavezz-images Bölge: eu-north-1 (Stockholm) Erişim: IAM kullanıcısı, AmazonS3FullAccess policy

Özellik	Detay
Upload	Multer ile bellekte tutulur, PutObjectCommand ile S3'e gönderilir
Download	s3-request-presigner ile 1 saatlik presigned URL üretilir
Silme	DeleteObjectCommand + DB kaydı birlikte silinir
Dosya limiti	10MB
Cloudflare
Özellik	Açıklama
DNS	heavezz.uk → Contabo VPS yönlendirmesi
SSL/TLS	Flexible mod — kullanıcı ↔ Cloudflare arası şifreli
DDoS Koruması	Proxy (turuncu bulut) aktif, gerçek IP gizli
CDN	Statik içerik cache'leme
Güvenlik
Katman	Uygulama
SSL/TLS	Cloudflare tarafından terminate ediliyor
DDoS	Cloudflare proxy koruması
Auth	JWT — 7 gün expiry, Bearer token
Şifre	bcrypt hash, salt round: 10
Secrets	.env dosyasında, .gitignore'da — repo'ya gitmiyor
JWT Secret	Environment variable'dan okunuyor
Dosya upload	10MB limit, presigned URL (1 saat TTL)
Kaynak kod	Sunucuda kaynak kod bulunmaz, sadece container imajları
Sunucu Yönetimi
Sunucuda kaynak kod yoktur. Tüm yönetim Docker Compose üzerinden yapılır.

# ghcr.io'ya login (ilk seferde)
echo $GITHUB_TOKEN | docker login ghcr.io -u HeaveZ --password-stdin

# İmajları güncelle ve başlat
docker compose pull
docker compose up -d

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
Dosya Yapısı
GitHub Reposu (kaynak kod)
devops-roadmap/
├── .github/
│   └── workflows/
│       └── build-and-push.yml  ← CI/CD: build & push to ghcr.io
├── backend/
│   ├── Dockerfile              ← node:18-alpine, single-stage
│   ├── package.json
│   └── server.js               ← Tüm API + DB init
├── frontend/
│   ├── Dockerfile              ← Multi-stage (build + nginx serve)
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── App.js              ← Tüm UI mantığı
│       └── App.css             ← Tüm stiller
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── README.md
Sunucu (production — kaynak kod yok)
/opt/heavezz/
├── docker-compose.yml          ← ghcr.io'dan imajları çeker
├── .env                        ← Tüm secretlar
└── nginx/
    └── nginx.conf              ← Reverse proxy config
