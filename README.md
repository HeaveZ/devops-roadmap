TASKLY - Tam Mimari Dokumantasyonu
====================================

1. Genel Bakis
--------------
Proje: Taskly - DevOps Roadmap Tracker
Domain: heavezz.uk
Sunucu: Contabo VPS (161.97.95.33) - Linux amd64
Orkestrasyon: Docker Compose (4 container)
Kaynak Kod: github.com/HeaveZ/devops-roadmap


2. Altyapi Mimarisi
--------------------

                        INTERNET
                           |
                    +------+------+
                    |  Cloudflare  |
                    |  DNS + CDN   |
                    |  SSL/TLS     |
                    |  DDoS Koruma |
                    +------+------+
                           |
                   Contabo VPS (161.97.95.33)
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


3. Container'lar (4 Adet)
--------------------------

Container              Image                Port              Rol                    Restart
heavezz-nginx-1        nginx:alpine         80, 443 -> host   Reverse proxy          always
heavezz-frontend-1     heavezz-frontend     80 (internal)     React SPA serve        always
heavezz-backend-1      heavezz-backend      5000 (internal)   Node.js REST API       always
heavezz-db-1           postgres:15          5432 (internal)   Veritabani             always

Baslatma sirasi (depends_on): db -> backend -> frontend -> nginx


4. Frontend (React 19)
-----------------------

Dockerfile: Multi-stage build
  Stage 1 (build): node:18-alpine -> npm install -> npm run build (React production build)
  Stage 2 (serve): nginx:alpine -> build ciktisini /usr/share/nginx/html'e kopyalar

Teknolojiler:
  - React 19.2.4
  - Vanilla CSS (framework yok)
  - JWT token ile auth (localStorage)

Ozellikler:
  - Kullanici girisi (JWT tabanli)
  - Gorev listesi (section bazli gruplama)
  - Alt gorev (subtask) yonetimi
  - Yorum sistemi
  - Dosya upload/download (S3 entegrasyonu)
  - Avatar yukleme
  - Sifre degistirme (degisince otomatik logout)
  - Drag & drop dosya yukleme
  - Progress bar (genel ilerleme takibi)


5. Backend (Node.js / Express 5)
----------------------------------

Dockerfile: Single-stage build (node:18-alpine)

Bagimliliklar:
  Paket                          Versiyon    Kullanim
  express                        5.2.1       HTTP framework
  pg                             8.20.0      PostgreSQL client
  jsonwebtoken                   9.0.3       JWT auth
  bcryptjs                       3.0.3       Sifre hash'leme
  cors                           2.8.6       Cross-origin izinleri
  dotenv                         17.3.1      Env variable yonetimi
  @aws-sdk/client-s3             3.x         S3 dosya islemleri
  @aws-sdk/s3-request-presigner  3.x         Presigned URL uretimi
  multer                         1.4.5       Dosya upload middleware

API Endpoints:

  Method   Endpoint                  Auth    Aciklama
  POST     /api/login                Hayir   Kullanici girisi, JWT doner
  POST     /api/change-password      Evet    Sifre degistirme
  POST     /api/avatar               Evet    Avatar yukleme (base64)
  GET      /api/avatar/:username     Hayir   Kullanici avatari getir
  GET      /api/tasks                Evet    Tum gorevler + subtask + yorum
  POST     /api/tasks                Evet    Yeni gorev olustur
  PATCH    /api/tasks/:id            Evet    Gorev durumu guncelle
  POST     /api/tasks/:id/subtasks   Evet    Alt gorev ekle
  PATCH    /api/subtasks/:id         Evet    Alt gorev durumu guncelle
  DELETE   /api/subtasks/:id         Evet    Alt gorev sil
  POST     /api/tasks/:id/comments   Evet    Yorum ekle
  DELETE   /api/comments/:id         Evet    Yorum sil
  POST     /api/upload               Evet    Dosya yukle (S3)
  GET      /api/files                Evet    Dosya listele (presigned URL)
  DELETE   /api/files/:id            Evet    Dosya sil (S3 + DB)


6. Veritabani (PostgreSQL 15)
------------------------------

Persistent Storage: Docker named volume -> heavezz_pgdata

Tablolar:

  users
    id SERIAL PRIMARY KEY
    username VARCHAR(100) UNIQUE
    password_hash VARCHAR(255)       <- bcrypt hash
    avatar_data TEXT                  <- base64 encoded
    created_at TIMESTAMP

  tasks
    id SERIAL PRIMARY KEY
    title VARCHAR(255)
    section VARCHAR(100)             <- gruplama icin
    completed BOOLEAN
    created_at TIMESTAMP

  subtasks
    id SERIAL PRIMARY KEY
    parent_id INTEGER -> tasks(id) ON DELETE CASCADE
    title VARCHAR(255)
    completed BOOLEAN
    created_at TIMESTAMP

  comments
    id SERIAL PRIMARY KEY
    task_id INTEGER -> tasks(id) ON DELETE CASCADE
    author VARCHAR(100)
    text TEXT
    created_at TIMESTAMP

  files
    id SERIAL PRIMARY KEY
    filename VARCHAR(255)
    s3_key VARCHAR(500)
    url TEXT
    size INTEGER
    mimetype VARCHAR(100)
    uploaded_by VARCHAR(100)
    created_at TIMESTAMP

Auto-init: Ilk baslatmada tablolar ve varsayilan gorevler (DevOps roadmap) otomatik olusturulur.


7. Nginx Reverse Proxy
------------------------

  heavezz.uk
    /          -> proxy_pass http://frontend:80    (React SPA)
    /api/*     -> proxy_pass http://backend:5000   (Node.js API)

Ozellikler:
  - WebSocket destegi (Upgrade header)
  - Real IP forwarding (X-Real-IP)
  - Max upload: 10MB (client_max_body_size)
  - Docker internal DNS ile service discovery (frontend, backend hostname'leri)


8. Guvenlik
-------------

  Katman             Uygulama
  SSL/TLS            Cloudflare tarafindan terminate ediliyor
  DDoS               Cloudflare proxy korumasi
  Auth               JWT (7 gun expiry), Bearer token
  Sifre              bcrypt hash (salt round: 10)
  Secrets            .env dosyasinda, .gitignore'da - repo'ya gitmiyor
  JWT Secret         Environment variable'dan okunuyor (hardcoded degil)
  Default sifreler   Environment variable'dan okunuyor (hardcoded degil)
  Dosya upload       10MB limit, S3 presigned URL (1 saat TTL)


9. Multi-Architecture Build
-----------------------------

  docker buildx (multiarch builder)
    QEMU emulasyonu (tonistiigi/binfmt)
    BuildKit (docker-container driver)
    Desteklenen platformlar:
      linux/amd64   <- Contabo, Intel/AMD
      linux/arm64   <- Apple Silicon (M1/M2/M3/M4)

  Registry: GitHub Container Registry (ghcr.io)
    ghcr.io/heavez/devops-backend:latest  -> amd64 + arm64
    ghcr.io/heavez/devops-frontend:latest -> amd64 + arm64

  docker pull otomatik olarak calistigi platformun mimarisini secer.


10. External Servisler
-----------------------

  Servis       Kullanim                              Bolge
  Cloudflare   DNS, CDN, SSL, DDoS korumasi          Global
  AWS S3       Dosya depolama (heavezz-images)        eu-north-1 (Stockholm)
  GitHub       Kaynak kod (devops-roadmap repo)       -
  ghcr.io      Docker image registry                  -


11. Trafik Akisi (Uctan Uca)
------------------------------

  1. Kullanici heavezz.uk'ye girer
  2. DNS -> Cloudflare (188.114.97.3) -> SSL terminate
  3. Cloudflare -> Contabo (161.97.95.33:80)
  4. Nginx container request'i alir
  5a. "/" -> Frontend container -> React SPA (HTML/CSS/JS) doner
  5b. "/api/*" -> Backend container -> Is mantigi calisir
  6. Backend -> PostgreSQL (veri okuma/yazma)
  7. Backend -> AWS S3 (dosya upload/download - presigned URL)
  8. Response ayni yoldan geri doner


12. DevOps Komutlari
----------------------

  # Tum servisleri baslat
  docker compose up -d

  # Rebuild ile baslat (kod degisikligi sonrasi)
  docker compose up -d --build

  # Sadece frontend rebuild
  docker compose up -d --build frontend

  # Loglari izle
  docker compose logs -f backend

  # Container durumlari
  docker compose ps

  # Veritabani'na baglan
  docker compose exec db psql -U heavezz heavezzdb

  # Multi-arch build + push
  docker buildx build --platform linux/amd64,linux/arm64 \
    -t ghcr.io/heavez/devops-backend:latest --push ./backend/

  # Durdur
  docker compose down

  # Durdur + volume sil (DIKKAT: DB verileri gider)
  docker compose down -v


13. Dosya Yapisi
-----------------

  /opt/heavezz/
  ├── .env                    <- Tum secretlar (gitignore'da)
  ├── .gitignore
  ├── docker-compose.yml      <- Orkestrasyon tanimi
  ├── backend/
  │   ├── Dockerfile          <- node:18-alpine, single-stage
  │   ├── package.json
  │   └── server.js           <- Tum API + DB init
  ├── frontend/
  │   ├── Dockerfile          <- Multi-stage (build + nginx)
  │   ├── package.json
  │   ├── public/
  │   │   ├── favicon.ico     <- Heaven logosu
  │   │   ├── heaaaaven.png   <- Orijinal logo
  │   │   ├── logo192.png     <- Heaven logosu
  │   │   ├── logo512.png     <- Heaven logosu
  │   │   ├── index.html      <- Title: Taskly
  │   │   └── manifest.json   <- PWA manifest
  │   └── src/
  │       ├── App.js          <- Tum UI mantigi
  │       └── App.css         <- Tum stiller
  └── nginx/
      └── nginx.conf          <- Reverse proxy config
