# Taskly (devops-roadmap)

Jira-benzeri görev/proje yönetim uygulaması. 6 mikroservis + Postgres + Kafka, **Docker Swarm** üzerinde, Cloudflare arkasında **heavezz.uk**. Trafik: kullanıcı → Cloudflare (HTTPS) → VPS :80 → edge nginx → `/` frontend, `/api` task-manager, `/auth` auth-server (edge'de TLS yok, CF terminasyonu). Canlı sürüm = image tag **v2.1-70** (git'te v2.1 tag'i yok, package.json/health sürümleri tutarsız — image tag'ine güven).

> **Tam mimari için `docs/ARCHITECTURE.md`'ye bak** (servis tablosu, nginx routing, kafka/postgres akışı, prod topoloji, CI/CD).

## Servisler (6 + 2 altyapı)

| Servis | Port | Tek satır |
|---|---|---|
| nginx (edge) | 80 (443 publish ama bağlanmıyor=ölü) | Tek dış giriş; `/`→frontend, `/api`→task-manager, `/auth`→auth-server. `/email` route YOK |
| frontend | iç :80 | React 19 + Vite 8 SPA, iç nginx + SPA fallback |
| auth-server | 3001 | JWT (7g) + 6 haneli OTP (bcrypt, in-memory Map); register'da email-sender'a HTTP |
| task-manager | 5000 | Çekirdek API + Postgres şema sahibi; Kafka producer (`audit-log`); S3 upload |
| email-sender | 3002 | SMTP OTP (Gmail STARTTLS); yalnız iç ağ; Kafka/Postgres YOK |
| audit-logger | health :8080 (ana listen yok) | Kafka consumer (`audit-log`) → `audit_logs` tablosu |
| db | iç :5432 (publish yok) | postgres:15, tek paylaşılan DB, vol taskly_pgdata |
| kafka | iç :9092/:9093 (publish yok) | apache/kafka:3.7.0 KRaft; tek topic `audit-log` (1 partition / RF 1) |

Image'lar: `ghcr.io/heavez/<servis>:${TAG}` (hepsi docker-stack.yml'de literal). Yalnız nginx port yayınlar.

## Kurallar / Konvansiyonlar
- **master'a direkt push YASAK** — branch + PR. **Onaysız push/commit yok.** Türkçe log/commit.
- **Dokümantasyon `docs/`'a** yazılır (İngilizce klasör adı). Agent ekibinin proaktif doküman kuralı `döküman/` dese de bu repoda **`docs/` kullan, `döküman/` AÇMA**.
- **Kod-içi credential YASAK**: env file + BuildKit secret mount + GitHub Secret. Hardcoded password/secret/token komiti yok.
- Jenkins paralel stage'lerde izole `ws("...-${svc}-${BUILD_NUMBER}")` + `unstash` **pattern'ini bozma**.
- Sonar docker fix: S6437+S6504 için doğrudan compliant pattern (root:app + 0640 + g+X).
- Commit sonu: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
