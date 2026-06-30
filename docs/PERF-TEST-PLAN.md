# Taskly — Performans Testi & Scaling Kuralı Planı

> Durum dokümanı — başlangıç: **2026-06-07**. Çalışma **devam ediyor**, yarın Faz 0'dan sürdürülecek.
> Bu doküman bir "kaldığımız yerden devam" referansıdır: tüm doğrulanmış altyapı gerçekleri içeride, böylece yeniden keşif (probe) gerekmez.

---

## 0. Nerede kaldık? (TL;DR)

- **Hedef:** backend'in saniyede kaç istek (RPS) kaldırdığını ölçmek → 4 vCPU / 8 GB tek-node prod'un kaynağı yetiyor mu görmek → buna göre **manuel eşik tabanlı scaling kuralı** yazmak.
- **Yapıldı:** ortam doğrulandı (bu makine = canlı prod VPS), kararlar alındı, 6 fazlı plan çıkarıldı, mevcut Mac monitoring stack'i (`~/k6-grafana/`) ile sunucu uyumu teyit edildi.
- **YARIN İLK ADIM:** Mac'te SSH tunnel'ı aç (`cd ~/k6-grafana && ./ssh-tunnel.sh`) → Prometheus target'ları UP olsun → Faz 1'e (k6 senaryo tasarımı) geç.
- **Açık karar:** test edilecek temsili `/api` endpoint seti + gerçekçi auth/kullanıcı akışı henüz netleşmedi (bkz. §6 Açık Sorular).

---

## 1. Amaç

1. **Yük testi** — k6 ile backend'e kademeli yük bindirip RPS / latency / hata oranını ölçmek.
2. **Kaynak yeterliliği** — yük altında CPU / RAM / IO'yu izleyip darboğazın nerede olduğunu bulmak.
3. **Scaling kuralı** — veriden somut, 4-core bütçesine saygılı manuel eşik runbook'u üretmek.
4. **Gözlemlenebilirlik** — ölçeklerken canlı izleme (Grafana) kurmak.

---

## 2. Alınan kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| Test hedefi | **Canlı prod** (güvenlik kuşağı + metodla) | Ayrı staging yok; gerçek rakam isteniyor. Risk → Faz 2 önlemleri. |
| Yük üretici | **Dış makine (Mac, k6)** | Backend'in kaynağını yemesin → temiz ölçüm. |
| Monitoring | **Lokal Prometheus + Grafana** (Mac'te), SSH tunnel ile sunucu metriklerini çek | Mac'te stack zaten kurulu; sunucu exporter'ları 127.0.0.1'e bağlı. |
| Scaling mekanizması | **Manuel eşik runbook** (`docker service scale`) | Swarm'da yerel autoscale yok; basit/şeffaf/düşük risk. |

---

## 3. Doğrulanmış altyapı gerçekleri (2026-06-07 — yeniden probe etme)

### Sunucu (Contabo) — **bu makine = canlı prod**
- Host: `vmi3163314` · IP: **161.97.95.33** · tek-node Docker **Swarm** (active).
- Kaynak: **4 vCPU / 7.8 GiB RAM** (idle'da ~4.6 GiB boş, ~3.2 GiB kullanımda). **Dar** — test sırasında kritik.
- Servisler (canlı, image `ghcr.io/heavez/<svc>:v2.1-70`):

| Servis | Replica | Port (iç) | Not |
|---|---|---|---|
| nginx (edge) | 2/2 | :80 yayında (`*:80`, `*:443`) | **443 ölü config** (nginx yalnız `:80` bind eder, TLS Cloudflare'de) |
| frontend | 2/2 | iç :80 | React SPA, iç nginx |
| auth-server | 2/2 | :3001 | JWT + OTP |
| task-manager | 2/2 | :5000 | **çekirdek API**, Postgres şema sahibi, Kafka producer |
| email-sender | 2/2 | :3002 | yalnız iç ağ |
| audit-logger | **3/3** | health :8080 | repoda 2, **canlıda 3** (config drift); ana listen yok |
| db (postgres:15) | 1/1 | iç :5432 | **mem cap 1 GiB**, manager-pinned, yayın yok |
| kafka (3.7.0) | 1/1 | iç :9092/:9093 | KRaft, ~800 MiB RAM, yayın yok |

- **Edge routing** (`nginx/nginx.conf`): `/`→frontend:80 · `/api`→task-manager:5000 (WS upgrade, body 10M) · `/auth`→auth-server:3001 · `=/health`→**nginx lokal stub (200, backend'e gitmez)**.
- **CF bypass:** Cloudflare'i atlamak için doğrudan **`http://161.97.95.33:80`** vur (gerekirse `Host: heavezz.uk`).
- task-manager container isimleri (cadvisor filtresi): `taskly_task-manager.1.*`, `taskly_task-manager.2.*`.
- task-manager'da `GET /health` var (`server.js:109`) ama **iç**; çoğu `/api` route'u **JWT ister**.
- **Idle baseline:** task-manager ~%0 CPU / ~25 MiB · db 19 MiB/1 GiB · kafka ~800 MiB · auth ~14 MiB.

### Sunucu monitoring (zaten kurulu, dışa KAPALI → tunnel şart)
- **node-exporter** → `127.0.0.1:9100` (host network).
- **cadvisor** → `127.0.0.1:8081` (bridge, `ghcr.io/google/cadvisor:v0.57.0`).
- Sunucuda Prometheus/Grafana **YOK** (kasıtlı; izleme Mac'te).

### Mac monitoring stack — `~/k6-grafana/` (macOS, Docker Desktop)
- `docker-compose.yml` (4 servis, network `k6-net`):
  - **Grafana** `grafana/grafana:11.3.0` → host **:3001** (anonymous Admin, login yok).
  - **InfluxDB** `influxdb:1.8` → :8086 (db `k6`, k6 sonuçları).
  - **Prometheus** `prom/prometheus:v2.55.1` → :9091 (30g retention).
  - **k6-runner** `grafana/k6:0.54.0` (profile `manual`, `docker compose run` ile).
- `ssh-tunnel.sh` → `ssh root@161.97.95.33 -L 9100 -L 8081` (node-exporter + cadvisor forward). **ŞU AN KAPALI.**
- Prometheus scrape (`prometheus/prometheus.yml`): `host.docker.internal:9100` + `host.docker.internal:8081` (tunnel üzerinden).
- Grafana provisioning: InfluxDB (default) + Prometheus datasource'ları; `k6-dashboard.json` ("k6 Load Testing Results") hazır.
- Test scriptleri: `tests/sample-test.js` (staged 20→50→100 VU, 5dk) · `tests/smoke-test.js` (5 VU/10s).
- Volume: `influxdb-data`, `grafana-data`, `prom-data`. (Orphan: kök `prometheus.yml` ve `prometheus-data` — silinebilir.)

---

## 4. Mimari

```
┌──────── Mac (~/k6-grafana) ────────┐    SSH tunnel     ┌──── Contabo 161.97.95.33 (4 vCPU/8GB, PROD) ────┐
│ k6 ──► load üretir                 │  -L 9100 -L 8081  │ node-exporter 127.0.0.1:9100  (host net)         │
│ Grafana :3001 ◄─ InfluxDB :8086    │ ◄════════════════ │ cadvisor      127.0.0.1:8081  (bridge)           │
│               ◄─ Prometheus :9091  │ host.docker.internal                                                │
└──── k6 ──HTTP──► http://161.97.95.33:80 (Cloudflare bypass) ──► nginx → task-manager/auth → db/kafka     │
                                                                  └────────────────────────────────────────┘
```

---

## 5. Plan — 6 faz

### Faz 0 — Bağlantı (Mac'te; YARIN İLK ADIM)
1. Tunnel aç: `cd ~/k6-grafana && ./ssh-tunnel.sh` (9100 + 8081).
2. Prometheus targets (`localhost:9091/targets`) → `host.docker.internal:9100` ve `:8081` **UP**.
3. Grafana'ya dashboard ekle: **node-exporter Full (1860)** + **cadvisor (893)**. (k6 dashboard zaten var.)

### Faz 1 — Senaryo tasarımı (CF bypass)
- Hedef: **`http://161.97.95.33/`** (CF atla). Gerekirse `Host: heavezz.uk`.
- ⚠️ `/health` nginx stub'ı backend'i ölçmez → yalnız nginx baseline için. Gerçek backend = `/api/*` + `/auth/*`.
- Auth: `setup()` içinde `/auth` login → JWT → `/api` çağrılarında kullan.
- k6 stages: smoke (5 VU/10s) → ramp (10→50→100→200 VU) → plateau. Gerçekçi think-time.
- **Threshold + abort** (prod güvenliği): `http_req_failed` ve `p95` eşiği aşılınca k6 **otomatik dursun**.

### Faz 2 — Prod güvenlik kuşağı
- Düşük-trafik pencere · test öncesi baseline snapshot · canlı Grafana izleme · kill-switch (`Ctrl-C`; gerekirse `docker service scale` ile hızlı toparla).

### Faz 3 — Kademeli yük & eşzamanlı ölçüm
Her kademede 3 kaynağı birlikte oku:
- **k6** (InfluxDB): RPS, p95/p99 latency, error %.
- **cadvisor**: `taskly_task-manager.1/.2`, `taskly_db`, `taskly_kafka`, `taskly_nginx` CPU/mem.
- **node-exporter**: toplam **4-core** CPU, RAM, load avg, network.
- **"Knee" noktası** = RPS artarken latency/error fırladığı veya CPU doyduğu an = mevcut kapasite tavanı.

### Faz 4 — Darboğaz analizi (KRİTİK — sadece RPS değil)
Tek 4-core kutuda "replica artır" her zaman çözmez:
- task-manager CPU doyuyor + db rahat **+ boş core var** → replica eklemek **işe yarar**.
- **db doyuyor / 1 GiB cap'e değiyor** → replica **işe yaramaz**; darboğaz Postgres (pool/index/tuning).
- **4 core zaten dolu** → replica sadece context-switch artırır → **dikey ölçek** (daha büyük VPS) gerekir.
- Kafka/audit-logger: tek partition → 3 audit-logger'dan yalnız 1'i aktif (idle consumer); yazma yükü buradan da gelebilir.
> Bu analiz olmadan yazılan scaling kuralı yanlış olur. **En önemli adım bu.**

### Faz 5 — Eşik kuralı (manuel runbook) + doküman
- Veriden somut kural, örn: *"task-manager CPU (cadvisor) > %70, 5 dk sürerse → `docker service scale taskly_task-manager=N`"*.
- **Üst sınır 4-core bütçesiyle**: db+kafka+nginx+auth+frontend payı düşülünce task-manager için güvenli max (muhtemelen 3, belki 2'de kalır).
- Scale-down eşiği + min replica + opsiyonel Grafana alert (CPU>%70).
- Çıktı: **`docs/RUNBOOK-scaling.md`**.

---

## 6. Açık sorular (yarın netleştir)
1. **Hangi `/api` endpoint'leri** gerçek yükü temsil ediyor? (görev listele, oluştur, güncelle…) — k6 senaryosu bunları içermeli.
2. **Auth akışı:** test kullanıcısı register mı login mi? OTP in-memory Map olduğu için yük altında OTP akışı sorun çıkarır mı? (login + sabit token tercih edilebilir.)
3. Yazma (POST/PUT) testleri prod DB'ye **gerçek kayıt** yazar → test verisi temizliği / ayrı test kullanıcısı gerekir.
4. Hedef RPS / kabul kriteri var mı (ör. "p95 < 300ms iken N RPS")?

---

## 7. team-lead delegasyon planı (onay sonrası)
| Uzman | Görev |
|---|---|
| **developer + tester** | k6 senaryoları: smoke + staged + auth-flow + CF-bypass + abort thresholds |
| **devops** | tunnel/Prometheus target sağlığı + cadvisor(893)/node(1860) dashboard import |
| **architect** | darboğaz çerçevesi + 4-core bütçeli scaling kuralı mantığı |
| **technical-writer** | `RUNBOOK-scaling.md` |

---

## 8. Komut referansı

```bash
# --- Mac (~/k6-grafana) ---
./ssh-tunnel.sh                              # tunnel aç (9100 + 8081)
docker compose up -d                         # grafana + influxdb + prometheus
docker compose run --rm k6 run /tests/smoke-test.js   # smoke
docker compose run --rm k6 run -e K6_OUT=influxdb=http://influxdb:8086/k6 /tests/sample-test.js

# --- Sunucu (Contabo) — canlı izleme/aksiyon ---
docker stats --no-stream                     # anlık CPU/mem
docker service ls                            # replica durumu
docker service scale taskly_task-manager=3   # ölçekle (manuel kural)
docker service ps taskly_task-manager        # task dağılımı
```

> Kurallar: master'a direkt push yok · onaysız push/commit yok · prod'a yıkıcı işlemde önce onay. Bu doküman working-tree'de; commit/PR ayrıca onayla.
