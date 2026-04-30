# Taskly — Mimari ve CI/CD Notları

## Servisler

8 container'lı bir mikroservis stack'i (`docker-compose.prod.yml`, project name `taskly`):

| Servis | Image | Port | Rol |
|---|---|---|---|
| `nginx` | `ghcr.io/heavez/nginx:v2.1` | 80, 443 | Reverse proxy — `/` → frontend, `/api` → task-manager, `/auth` → auth-server. Domain: `heavezz.uk` |
| `frontend` | `ghcr.io/heavez/frontend:v2.1` | 80 (iç) | React + Vite + TS, nginx:alpine üzerinde sunulur |
| `auth-server` | `ghcr.io/heavez/auth-server:v2.1` | 3001 | JWT, bcryptjs, postgres |
| `task-manager` | `ghcr.io/heavez/task-manager:v2.1` | 5000 (varsayılan) | Express 5, postgres, multer + S3, kafkajs producer |
| `email-sender` | `ghcr.io/heavez/email-sender:v2.1` | 3002 | nodemailer (SMTP) |
| `audit-logger` | `ghcr.io/heavez/audit-logger:v2.1` | — | Kafka consumer, postgres'e audit log yazar |
| `db` | `postgres:15` | 5432 (iç) | Tüm servislerin paylaştığı DB |
| `kafka` | `apache/kafka:3.7.0` (KRaft) | 9092 (iç) | task-manager → audit-logger event akışı |

Volumes: `pgdata`, `kafka_data` (named).
Hassas config: Jenkins'te `taskly-env-prod` secret file → deploy sırasında `.env` olarak workspace'e iner, compose tüketir, build sonunda silinir.

## CI/CD Pipeline (`Jenkinsfile`)

8 stage, Jenkins Docker container'da koşar (host docker.sock üzerinden).

```
Checkout
  → Install Dependencies   ┐
  → Lint & Compile Check   ├─ node:20-alpine, NODE_SERVICES (5 npm servis)
  → Dependency Scan        ┘
  → SonarCloud Analysis    (sonarsource/sonar-scanner-cli, tek scan, 5 src dizin)
  → Docker Build           ┐
  → Push to GHCR           ├─ built-in agent, SERVICES (6 image: 5 + nginx)
  → Deploy                 ┘  docker compose -f docker-compose.prod.yml up -d
```

**İki servis listesi var:**
- `NODE_SERVICES` = audit-logger, auth-server, task-manager, email-sender, frontend (npm operasyonları)
- `SERVICES` = NODE_SERVICES + nginx (build + push edilen tüm image'lar)

**Tag stratejisi:** her image iki tag ile push edilir:
- `:v2.1` (mutable, compose bunu çeker)
- `:v2.1-<BUILD_NUMBER>` (immutable, geri dönüş için)

Pipeline yalnız `master` branch'inde Build/Push/Deploy stage'lerini çalıştırır (`when { branch 'master' }`).

## Kritik Sınırlar (kolayca tuzağa çevirir)

### 1. Jenkins workspace bind-mount görünmez
Jenkins kendi container'ı içinden host docker daemon'a komut yollar. Daemon `/var/jenkins_home/workspace/...` path'ini host üzerinde göremez. Bu yüzden `docker-compose.prod.yml`'de:

```yaml
# YAPMA ❌ — bind-mount runtime'da patlar
volumes:
  - ./foo/foo.conf:/etc/foo.conf
```

```dockerfile
# YAP ✅ — Dockerfile'a göm
FROM nginx:alpine
COPY foo.conf /etc/foo.conf
```

Sonra image'i GHCR'a push'la, compose'ta `image: ghcr.io/heavez/foo:v2.1`. nginx servisi tam bu pattern'i kullanıyor.

### 2. Deploy `.env` cleanup zorunlu
Jenkins secret file → workspace `.env` kopyalama pattern'inde, önceki başarısız build'den kalan `.env` farklı uid'li olabilir → cp üzerine yazamaz. Doğrusu:

```sh
set -e
trap 'rm -f .env' EXIT
rm -f .env
install -m 600 "$ENV_FILE" .env
```

### 3. `npm audit --audit-level=high` pipeline'ı patlatır
Yeni dep eklerken HIGH+ CVE varsa Dependency Scan stage'i fail. Lokal'de `npm audit --audit-level=high` ile doğrula. Moderate'lar geçer ama ilerde temizlemek lazım.

### 4. Lint script'leri syntax check (gerçek lint değil)
Backend: `find src -name '*.js' -exec node --check {} \;`
Frontend: `tsc --noEmit`
ESLint kurulu değil; isteyen ekleyebilir.

## Yeni Servis Eklerken

1. `<svc>/Dockerfile` yaz, gerekirse `<svc>/package.json` + `package-lock.json` (`npm install` ile)
2. `Jenkinsfile`:
   - npm gerektiren servis ise → `NODE_SERVICES` ve `SERVICES`'e ekle
   - sadece config-only image (nginx gibi) ise → yalnız `SERVICES`'e ekle
3. `docker-compose.prod.yml`'ye servisi `image: ghcr.io/heavez/<svc>:v2.1` ile ekle
4. `lint` script'i ekle (`node --check` veya `tsc --noEmit`)
5. Branch aç, PR aç, merge sonrası Jenkins build tetiklenir

## Versiyonlama

Her servisin `package.json` `version` alanı semver:
- Patch (X.Y.**Z**): yalnız bug fix / lint script gibi ekler
- Minor (X.**Y**.0): bağımlılık major bump (nodemailer 6→8, multer 1→2 gibi)
- Major (**X**.0.0): API değişikliği

Image tag (`v2.1`) ile servis version (`2.1.0`) ayrı tutulur — image tag deploy seti için, servis version tek servis için.

## Tarihçe (referans)

PR'lar repo `Closed Pull Requests`'de, ama özet:
- #11–#15: Jenkinsfile syntax + branch + secret-file düzeltmeleri
- #19: 5 servisli pipeline'a geçiş, multi-agent pattern
- #20: task-manager lockfile regenerate
- #21: nodemailer/multer/postcss CVE'leri + lint scripts
- #22: nginx config'i image'e göm (workspace bind-mount fix)
- #23: Deploy `.env` cleanup (trap + install)
