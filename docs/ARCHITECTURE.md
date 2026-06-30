# Taskly — Mimari Dokümanı

> Bu doküman kaynaktan otomatik doğrulanarak üretildi — son güncelleme: 2026-06-07

---

## 1. Genel Bakış

**Taskly**, Jira-benzeri bir görev/proje yönetim sistemidir. 6 uygulama servisi (+ 2 durum-tutan altyapı servisi) olmak üzere bir servis yığını olarak, **Docker Swarm** üzerinde, Cloudflare arkasındaki tek bir nginx edge ile yayınlanır. Kullanıcılar bir React SPA ile etkileşir; tüm trafik tek nginx ingress'ine (port 80, TLS Cloudflare tarafından upstream'de sonlandırılır) girer ve buradan frontend, çekirdek görev API'si ve auth servisine dağılır.

**6 uygulama servisi:**
1. **nginx** — edge reverse proxy / tek dış giriş (`nginx/nginx.conf:7`)
2. **frontend** — React 19 + Vite 8 SPA, iç nginx ile servis edilir (`frontend/nginx.conf:2`)
3. **auth-server** — JWT + OTP kimlik doğrulama (`auth-server/src/index.js:10`)
4. **task-manager** — çekirdek görev/proje API'si, Postgres şema sahibi, Kafka producer, S3 upload (`task-manager/server.js:28`)
5. **email-sender** — SMTP OTP e-posta gönderimi (`email-sender/src/index.js:9`)
6. **audit-logger** — Kafka consumer, audit olaylarını kalıcılaştırır (`audit-logger/src/index.js:35`)

**Veri + mesajlaşma (2 durum-tutan altyapı servisi):**
- **PostgreSQL 15** — tek paylaşılan veritabanı, servisler arası 10 tablo, `CREATE TABLE IF NOT EXISTS` ile başlangıçta oluşturulur (`docker-stack.yml:10`)
- **Apache Kafka 3.7.0** — tek topic (`audit-log`) olay akışı, KRaft modunda (`docker-stack.yml:31`)

**Deploy:** `docker-stack.yml` (compose v3.9) ile Docker Swarm. Stateless app servisleri 2 replica; durum-tutan db/kafka 1 replica, manager node'lara sabitlenmiş. Tüm servisler external `taskly-overlay` ağını paylaşır. Canlı tag **v2.1-70**. `docker-compose.prod.yml` legacy/rollback rezervi olarak tutulur.

> **Sürüm gerçeği:** Kaynak dosyalar tutarsızdır — `frontend/package.json:3` = `2.0.1`, `frontend/src/shared/config/env.ts:3` default = `2.0.0`, tüm `/health` endpoint'leri `2.1` hardcode (`auth-server/src/routes/health.js:9`, `audit-logger/src/health-server.js:11`, `nginx/nginx.conf:13`, `frontend/nginx.conf:20`); git'teki en güncel tag `v2.0.0` (v2.1 git tag'i YOK). **Çalışan/deploy edilen sürüm 2.1'dir; image TAG yetkilidir.**

---

## 2. Bileşen Tablosu

| Servis | Rol | Teknoloji | Port | Replica | Image |
|---|---|---|---|---|---|
| **nginx** | Edge reverse proxy / ingress | nginx:alpine | 80 (yayınlanan), 443 (yayınlanan ama bağlanmıyor) | 2 (`docker-stack.yml:192`) | `ghcr.io/heavez/nginx:${TAG}` (`docker-stack.yml:181`) |
| **frontend** | React SPA (UI) | React 19, Vite 8, TS 5.6, iç nginx:alpine | iç :80 (`frontend/nginx.conf:2`) | 2 (`docker-stack.yml:173`) | `ghcr.io/heavez/frontend:${TAG}` (`docker-stack.yml:169`) |
| **auth-server** | JWT + OTP auth | Node 20, Express 4.19.2, jsonwebtoken 9, bcryptjs, pg | 3001 (`index.js:10`, listen `:43`) | 2 (`docker-stack.yml:74`) | `ghcr.io/heavez/auth-server:${TAG}` (`docker-stack.yml:55`) |
| **task-manager** | Çekirdek görev/proje API | Node 20, Express 5.2.1, pg 8.20, kafkajs 2.2.4, AWS SDK S3, Multer | 5000 (`server.js:28`, listen `:1089`) | 2 (`docker-stack.yml:107`) | `ghcr.io/heavez/task-manager:${TAG}` (`docker-stack.yml:87`) |
| **email-sender** | SMTP OTP e-posta | Node 20, Express 4.19.2, Nodemailer 8 | 3002 (`src/index.js:9`, listen `:30`) | 2 (`docker-stack.yml:135`) | `ghcr.io/heavez/email-sender:${TAG}` (`docker-stack.yml:117`) |
| **audit-logger** | Kafka consumer → audit_logs | Node 20, kafkajs 2.2.4, pg 8.11.5, Express 4.19.2 | sadece health :8080 (ana listen YOK) (`src/health-server.js:4,16`) | repo **2** (`docker-stack.yml:161`), canlı **3** (CLAUDE.md config-drift notu) | `ghcr.io/heavez/audit-logger:${TAG}` (`docker-stack.yml:143`) |
| **db (Postgres)** | Paylaşılan ilişkisel DB | PostgreSQL 15 | iç :5432 (yayınlanan port YOK) | 1, manager-pinned (`docker-stack.yml:20,24-25`) | `postgres:15` (`docker-stack.yml:10`) |
| **kafka** | Olay broker'ı | Apache Kafka 3.7.0 (KRaft) | iç :9092 broker / :9093 controller (yayınlanan port YOK) | 1, manager-pinned (`docker-stack.yml:48,51-52`) | `apache/kafka:3.7.0` |

> **Image isimleri (DOĞRULANDI):** Tüm 6 app image'ı `docker-stack.yml` içinde literal olarak yer alır: `ghcr.io/heavez/{auth-server,task-manager,email-sender,audit-logger,frontend,nginx}:${TAG}` (sırasıyla satır 55, 87, 117, 143, 169, 181). `${TAG}` deploy sırasında `envsubst` ile render edilir (hardcoded v2.1-70 değildir). Jenkinsfile `GHCR_NAMESPACE='heavez'` (satır 47) ile uyumludur.

> **Port yayını (DOĞRULANDI):** Yalnızca **nginx** port yayınlar (80 ve 443 ingress, `docker-stack.yml:182-188`). db ve kafka HİÇBİR port yayınlamaz; 5432/9092/9093 yalnızca overlay ağı içinde erişilebilir konteyner içi portlardır.

---

## 3. nginx Edge Yönlendirme Tablosu

| Location | Metod | Upstream | Notlar |
|---|---|---|---|
| `= /health` | GET/HEAD | (lokal `return 200` JSON) | `{status:ok, service:nginx, version:2.1}`; access_log off (`nginx.conf:10-14`) |
| `/` | tümü | `http://frontend:80` | React SPA; Host + X-Real-IP iletir (`nginx.conf:16-20`) |
| `/api` | tümü | `http://task-manager:5000` | HTTP/1.1 upgrade (WebSocket), upload için `client_max_body_size 10M`, CF real-IP (`nginx.conf:22-34`) |
| `/auth` | tümü | `http://auth-server:3001` | JWT/OTP auth servisi (`nginx.conf:37-38`) |

- Cloudflare real-IP: varsa `$http_cf_connecting_ip`, yoksa `$remote_addr` (`nginx.conf:28-32`).
- Edge'de **TLS YOK** (`listen 80` tek direktif, hiçbir `ssl_*`/`listen 443` yok — `nginx.conf:7`). TLS Cloudflare tarafından sonlandırılır.
- **Rate limit / güvenlik header'ı yok.**

> **`/email` edge route'u YOK (DOĞRULANDI):** `nginx.conf` yalnızca `=/health` (satır 10), `/` (16), `/api` (22), `/auth` (37) location'larını içerir. `/email` bloğu yoktur. **email-sender yalnızca iç ağ üzerinden erişilebilir** — auth-server, `EMAIL_SENDER_URL=http://email-sender:3002` (`docker-stack.yml:59`) ile `POST /email/send-code` çağırır (`auth-server/src/routes/auth.js:40`). Eski orkestrasyon haritasındaki `/email` edge route'u YANLIŞTIR.

> **443 ölü config (DOĞRULANDI):** `docker-stack.yml:186-188` 443'ü yayınlar, ancak `nginx.conf:7` yalnızca `:80` bağlar; dosyanın tamamında hiçbir `ssl`/`listen 443` direktifi yoktur. 443 yayını ölü config'tir (hiçbir listener bağlı değil); TLS upstream'de (Cloudflare) sonlandırılır.

---

## 4. Kafka Topic Akışı & Postgres Kullanımı

### 4.1 Kafka (tek topic)

| Topic | Producer | Consumer | Semantik |
|---|---|---|---|
| `audit-log` | **task-manager** — `producer.send({topic:'audit-log', ...})` fire-and-forget; `kafkaReady` guard (`server.js:45`); hatalar yakalanır, isteği fail ETMEZ (`server.js:47-48,61-62`) | **audit-logger** — groupId `audit-logger-group`, `fromBeginning:false` (`audit-logger/src/index.js:13,35`) | Tek partition, replication factor 1; auto-create topics açık, offsets RF 1 (`docker-stack.yml:40-41`) |

Audit olay payload'ı (JSON): `action, userId, email, resource, resourceId, details, timestamp` (`task-manager/server.js:50-57`). Action'lar: `TASK_CREATED/UPDATED/DELETED`, `SUBTASK_*`, `COMMENT_*`, `LABEL_*`, `SPRINT_*`, `FILE_DELETED`.

- **auth-server, email-sender** — Kafka YOK.
- **email-sender** — Postgres da YOK (yalnızca SMTP, stateless).

> **Kafka idle-consumer tuzağı:** `audit-log` tek partition; canlıda audit-logger 3 replica (repoda 2), hepsi tek consumer-group'ta → aynı anda **yalnızca 1 replica consume eder**, diğerleri idle/standby. Replica artırmak işleme hızını artırmaz (partition artmadıkça); bu bir HA yedeğidir.

### 4.2 PostgreSQL (tek paylaşılan DB)

Bağlantı: tüm DB-kullanan servisler `DATABASE_URL` ile havuzlanır. Şema, başlangıçta inline `CREATE TABLE IF NOT EXISTS` ile oluşturulur (migration dosyası yoktur).

| Tablo | Sahibi / Oluşturan | Referans |
|---|---|---|
| `auth_users` | auth-server | `auth-server/src/index.js:33` |
| `tasks` | task-manager | `server.js:128` |
| `subtasks` | task-manager | `server.js:138` |
| `comments` | task-manager | `server.js:148` |
| `notifications` (**iki kez** oluşturulur) | task-manager | `server.js:178` & `server.js:236` |
| `labels` | task-manager | `server.js:193` |
| `task_labels` (join) | task-manager | `server.js:203` |
| `sprints` | task-manager | `server.js:212` |
| `files` (S3 metadata) | task-manager | `server.js:223` |
| `audit_logs` | audit-logger yazar; task-manager `GET /api/audit-logs` ile okur | `audit-logger/src/index.js:18`; `task-manager/server.js:1073,1078` |

> **Şema sahipliği race'i:** task-manager `audit_logs`'u SELECT eder ama CREATE etmez (audit-logger oluşturur). Swarm'da başlatma sırası garanti değildir (`depends_on` yok sayılır) → audit-logger önce ayağa kalkmazsa task-manager'ın ilk audit okuması patlayabilir.

> **Kod kokuları (bloker değil):** task-manager'da duplike tanımlar — `createNotification` (`server.js:67-77` & `79-89`), `/api/notifications/*` (`935-990` & `994-1044`), `/api/tasks/reorder` (`400-422` & `1048-1070`); Express ilk eşleşeni kullanır. `notifications` tablosu CREATE'i iki kez geçer (178 & 236).

---

## 5. İstek / Veri Akışı

**A. Kimlik doğrulama (OTP, iki adımlı + JWT)**
1. Kullanıcı → `https://heavezz.uk` → Cloudflare (TLS sonlandırma) → VPS:80 → nginx.
2. SPA `/auth/register` veya `/auth/login` POST → nginx `/auth` → **auth-server:3001**.
3. auth-server bcrypt ile parola doğrular / **Postgres** `auth_users`'da duplike kontrol eder, 6 haneli OTP üretir (in-memory Map, 5 dk expiry), `POST /email/send-code` ile **email-sender:3002**'ye senkron HTTP atar (iç overlay) → Gmail SMTP STARTTLS:587 (`auth.js:40`).
4. Kullanıcı kodu gönderir → `/auth/verify-code` → auth-server OTP doğrular → **JWT** verir (7 günlük, `JWT_SECRET`).
5. SPA token saklar; axios `Authorization: Bearer <token>` ekler (`frontend/src/shared/api/client.ts:15`).

**B. Görev işlemleri (kimliği doğrulanmış API)**
1. SPA → `/api/*` → nginx `/api` (10M body limit, WS upgrade) → **task-manager:5000**.
2. Korumalı route'lar `authMiddleware` çalıştırır: task-manager uzaktan `fetch(AUTH_SERVER_URL/auth/verify)` yapar (`server.js:315`); `{userId, email}` bekler, yoksa 401. Lokal JWT parse YOK.
3. task-manager **Postgres**'i okur/yazar (tasks, subtasks, comments, labels, sprints, notifications).
4. Dosya upload: `POST /api/upload` → multer memory (10MB) → **AWS S3** PutObject; listeleme presigned GET URL döner (3600s) (`server.js:867-884`).
5. Mutating action'larda task-manager (a) atama/yorumda DB notification ekler, (b) `audit-log` Kafka olayı atar (fire-and-forget).

**C. Asenkron audit boru hattı**
1. task-manager (producer) → **Kafka** `audit-log` topic'i.
2. **audit-logger** (consumer group `audit-logger-group`) JSON parse → Postgres `audit_logs`'a INSERT (`index.js:42-46`).
3. UI geçmişi `GET /api/audit-logs` (paginated) ile task-manager'dan `audit_logs`'tan okur.

**D. Statik / SPA**
- `GET /` ve eşleşmeyen path'ler → **frontend:80** (iç nginx `try_files ... /index.html` SPA fallback, gzip, 1 yıl immutable static cache) (`frontend/nginx.conf:25`).

---

## 6. Üretim Topolojisi (ASCII)

```
                          Internet (kullanıcılar)
                               │  HTTPS
                      ┌────────▼─────────┐
                      │    Cloudflare    │  TLS sonlandırma (upstream)
                      │   heavezz.uk     │  X-Cf-Connecting-IP enjekte eder
                      └────────┬─────────┘
                               │  HTTP :80  →  VPS 161.97.95.33
══════════════════════ DOCKER SWARM ═══════════════════════════════════
                               │  ingress publish 80 (443 publish, BAĞLANMIYOR=ölü)
                     ┌─────────▼──────────┐
                     │  nginx  (x2)       │  edge / ingress
                     │  listen :80        │
                     └──┬──────┬──────┬───┘
              /         │  /api │ /auth│            (edge'de /email YOK)
       ┌────────────────▼┐ ┌───▼──────────┐ ┌──────▼─────────┐
       │ frontend (x2)   │ │ task-manager │ │ auth-server(x2)│
       │ iç nginx :80    │ │   (x2) :5000 │ │     :3001      │
       └─────────────────┘ └──┬───┬───┬──┬┘ └───┬────────┬───┘
                              │   │   │  │       │        │
        ┌──── auth verify ◄───┘   │   │  │ Bearer│        │ POST /email/send-code
        │  (HTTP /auth/verify)    │   │  └───────┘        ▼   (yalnız iç overlay)
        │                         │   │              ┌──────────────┐
        │                  S3 ◄───┘   │              │ email-sender │ ──► Gmail SMTP:587
        │              (upload,       │              │  (x2) :3002  │
        │              presigned)     │              └──────────────┘
        │                             │ produce
═══════════════ taskly-overlay (external overlay ağı) ══════════════════
        │                             ▼
   ┌────┴───────────────┐      ┌──────────────────┐ audit-log  ┌───────────────────┐
   │  db: PostgreSQL 15 │◄─────│  kafka 3.7.0      │───────────►│ audit-logger      │
   │  (x1, manager pin) │      │  (x1, manager pin)│  topic     │ repo x2 / canlı x3│
   │  iç :5432 (publish │      │  iç :9092 / :9093 │  RF=1,p=1   │  health :8080     │
   │   YOK)             │      │  (publish YOK)    │  (1 aktif  └─────────┬─────────┘
   │  vol: taskly_pgdata│      │  vol:taskly_kafka │   consumer,          │ INSERT audit_logs
   └─────────▲──────────┘      │       _data       │   diğerleri idle)    │
             │                 └───────────────────┘                      │
             └──────────────────── writes (auth_users, tasks, ...) ◄──────┘
                                   (Postgres'i auth-server,
                                    task-manager, audit-logger paylaşır)

Volume'lar (external, manager-local):
  taskly_pgdata      → /var/lib/postgresql/data
  taskly_kafka_data  → /tmp/kraft-combined-logs

Port yayını: YALNIZCA nginx (80 + 443). db/kafka hiçbir port yayınlamaz.
```

---

## 7. CI/CD Pipeline Aşamaları (Jenkinsfile)

Jenkins Multibranch Declarative pipeline; `agent none` ve stage-başına node'lar; global 30 dk timeout (satır 59); `disableConcurrentBuilds` (57); buildDiscarder (10 build / 5 artifact / 14 gün, satır 65-68). `NODE_SERVICES`=5, `SERVICES`=6 (nginx dahil, satır 43,45). `GHCR_NAMESPACE='heavez'`, `VERSION='v2.1'`, `IMMUTABLE_TAG='v2.1-${BUILD_NUMBER}'` (47,48,50).

1. **Checkout** — SCM checkout, downstream stage'ler için tam workspace stash.
2. **Install Dependencies** — 5 Node servisi paralel (`collectEntries`).
3. **Lint** — `npm run lint` (yoksa fallback).
4. **Dependency Scan** — `npm audit --audit-level=high`, başarısızlıkta exit 1.
5. **Gitleaks Secret Scan** — `zricethezav/gitleaks`, `--no-git --redact`.
6. **SonarCloud Analysis** — 5 Node servisinin `src`'ini tarar; `withSonarQubeEnv('SonarCloud')` server binding'i (satır 225); token credential'ı yorum satırına göre `sonarcloud-token` (satır 212) — `'SonarCloud'` bir Jenkins credential'ı DEĞİL, SonarQube server config adıdır.
7. **Trivy Filesystem Scan** — tüm repo, `--severity CRITICAL,HIGH --exit-code 1`, cache'li DB.
8. **Docker Build** — 6 servisin (nginx dahil) paralel build'i; PR tag `pr-${CHANGE_ID}-${BUILD_NUMBER}`, master tag'leri `IMMUTABLE_TAG=v2.1-${BUILD_NUMBER}` + `VERSION=v2.1`.
9. **Trivy Image Scan** — 6 image paralel tarama, `--ignore-unfixed`.
10. **Push to GHCR** — *yalnız master* (`when{branch 'master'}`, satır 370); `github-ghcr` credential'ı (377) ile tek login; IMMUTABLE_TAG + VERSION push.
11. **Deploy** — *yalnız master* (satır 409); `taskly-env-prod` Secret file'dan (417) `.env` çekilir; `envsubst` `docker-stack.yml`'i `docker-stack.rendered.yml`'e render eder; `docker stack deploy --with-registry-auth --prune` (444-451); secret sızıntısını önlemek için xtrace susturulur.
12. **Smoke Test** — *yalnız master* (satır 469); Swarm convergence için ≤60s bekler. **Sıra (DOĞRULANDI):** önce public `/health` (satır 490) → sonra 5 iç `/health` endpoint'i (auth-server:3001, task-manager:5000, email-sender:3002, audit-logger:8080, frontend:80; satır 494-506) → sonra public root `/` (satır 509). İç probe'lar `taskly-overlay` üzerinde geçici curl konteyneri ile yapılır. (5 iç + 2 public toplam doğrudur; yalnızca sıra önceden yanlıştı.)
13. **Post / always** — GHCR logout; `*-${BUILD_NUMBER}` workspace dizinlerini temizle.

Kalite aşamaları (1–9) her branch/PR'da çalışır; 10–12 yalnız master'dadır. Rollback için ayrı Jenkins stage yoktur; Swarm `failure_action: rollback` otomatik devreye girer.

---

## 8. Ağlar, Volume'lar, Secret'lar

**Ağlar**
- `taskly-overlay` — tüm 8 servisin paylaştığı tek external overlay ağı (`docker-stack.yml:201-203`, `external: true`). İç servis keşfi DNS adıyla (`frontend:80`, `task-manager:5000`, `auth-server:3001`, `email-sender:3002`, `postgres:5432`, `kafka:9092`).

**Volume'lar** (her ikisi de external/önceden oluşturulmuş, manager-local)
- `taskly_pgdata` → `/var/lib/postgresql/data` (`docker-stack.yml:206-208`)
- `taskly_kafka_data` → `/tmp/kraft-combined-logs` (`docker-stack.yml:209-211`)

**Secret / config enjeksiyonu**
- **Docker `secrets:` mount'u TANIMLI DEĞİL.** Tüm hassas değerler environment değişkeni olarak geçirilir (container env'de plaintext).
- CI/CD'de prod env, Jenkins **`taskly-env-prod` Secret file** credential'ından gelir, deploy'da `envsubst` ile render edilir; GHCR auth **`github-ghcr`** credential'ından; Sonar token'ı yorum satırına göre **`sonarcloud-token`** credential'ından (`'SonarCloud'` server config adıdır, credential değil).
- Hassas env değişkenleri: `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, `CLUSTER_ID`.

**Deploy politikası (Swarm)**
- Tüm app servisleri: `update_config` `order: start-first`, `failure_action: rollback`.
- auth-server: explicit `rollback_config` parallelism 1, delay 5s (`docker-stack.yml:82-84`).
- db: memory limit 1G (`docker-stack.yml:27-28`); diğer servislerde resource limit yok.
- **Hiçbir serviste `healthcheck:` direktifi yoktur** (liveness dışarıdan smoke test ile kapsanır).
- Port yayını yalnızca nginx'te (80 + 443); db/kafka hiçbir port yayınlamaz.

---

## 9. Atıflar (Kanıt İndeksi)

**Frontend:** `frontend/nginx.conf:2,17-21,25`; `frontend/package.json:3`; `frontend/src/shared/api/client.ts:15`; `frontend/src/shared/config/env.ts:3`.

**auth-server:** `src/index.js:10,33,43`; `src/routes/auth.js:40`; `src/routes/health.js:9`.

**task-manager:** `server.js:28,45,47-48,50-57,61-62,67-89,128,138,148,178,193,203,212,223,236,315,400-422,867-884,935-990,994-1044,1048-1070,1073,1078,1089`.

**email-sender:** `src/index.js:9,30`.

**audit-logger:** `src/index.js:13,18,35,42-46`; `src/health-server.js:4,11,16`.

**nginx edge:** `nginx/nginx.conf:7,10-14,16-20,22-34,28-32,37-38`.

**Orkestrasyon:** `docker-stack.yml:10,20,24-25,27-28,40-41,48,51-52,55,59,74,87,107,117,135,143,161,169,173,181,182-188,192,201-203,206-211`.

**CI/CD:** `Jenkinsfile:43,45,47,48,50,57,59,65-68,212,225,370,377,409,417,444-451,469,490,494-506,509`.

**CLAUDE.md:** canlı tag v2.1-70; audit-logger canlı 3 replica (config drift, repo 2).
