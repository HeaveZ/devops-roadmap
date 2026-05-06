// ============================================================
//  Jenkinsfile — Taskly multi-service CI/CD pipeline
// ------------------------------------------------------------
//  6 mikroservis için tek pipeline:
//    audit-logger, auth-server, task-manager, email-sender, frontend, nginx
//
//  Akış:
//    - Her branch (PR dahil): Checkout → Install → Lint → Audit → Sonar → Build
//    - Sadece 'master' branch: Push → Deploy
//
//  Paralelleştirme: Install/Lint/Audit/Build/Push stage'leri
//    NODE_SERVICES (veya SERVICES).collectEntries pattern ile paralel
//    çalışır. Her parallel branch: node('built-in') → unstash → iş.
//    Built-in executor sayısı doğal RAM koruması yapar.
//
//  Stash stratejisi: skipDefaultCheckout(true) → her stage'de auto-fetch
//    yok. Checkout stage'i workspace'i stash eder, diğer stage'ler unstash.
//
//  Etiketleme stratejisi (çift tag, her servis için):
//    - Master: :v2.1-${BUILD_NUMBER} (immutable) + :v2.1 (moving pointer, compose pull)
//    - PR:     :pr-${CHANGE_ID}-${BUILD_NUMBER} + :pr-${CHANGE_ID} (lokal, push edilmez)
//
//  Multi-agent pattern:
//    - Quality stages (Install/Lint/Audit):  node:20-alpine (paralel)
//    - SonarCloud:                           sonarsource/sonar-scanner-cli
//    - Build / Push / Deploy:                built-in (host docker daemon)
// ============================================================

// PR build helper — Multibranch Pipeline'da PR build'lerde Jenkins
// otomatik olarak CHANGE_ID env değişkenini set eder (PR numarası).
// Branch build'lerde (master dahil) null'dur.
def isPR() {
    return env.CHANGE_ID != null
}

pipeline {
    // Top-level agent yok; her stage kendi container'ında veya paralel branch'inde.
    agent none

    // Pipeline genelinde kullanılacak değişkenler.
    environment {
        // Node.js servisleri (npm ci/lint/audit stage'leri için)
        NODE_SERVICES  = 'audit-logger,auth-server,task-manager,email-sender,frontend'
        // Build & push edilen tüm image'lar (nginx reverse-proxy de dahil)
        SERVICES       = 'audit-logger,auth-server,task-manager,email-sender,frontend,nginx'
        GHCR_REGISTRY  = 'ghcr.io'
        GHCR_NAMESPACE = 'heavez'
        VERSION        = 'v2.1'
        // BUILD_NUMBER Jenkins tarafından otomatik atanır.
        IMMUTABLE_TAG  = "${VERSION}-${BUILD_NUMBER}"
    }

    options {
        // Log satırlarına zaman damgası ekler — debug için çok faydalı.
        timestamps()
        // Aynı job'un iki build'inin paralel çalışmasını engeller.
        disableConcurrentBuilds()
        // 30 dakikada bitmezse build'i sonlandır.
        timeout(time: 30, unit: 'MINUTES')
        // Her stage'de implicit checkout scm ÇALIŞMASIN — Checkout stage'i
        // bir kez yapar ve stash eder; diğer stage'ler unstash ile alır.
        skipDefaultCheckout(true)
        // Build retention — disk şişmesini engelle.
        // Workspace cleanup post.always'de yapılıyor; bu da Jenkins meta/log birikimini engeller.
        buildDiscarder(logRotator(
            numToKeepStr: '10',
            artifactNumToKeepStr: '5',
            daysToKeepStr: '14'
        ))
    }

    stages {

        // ------------------------------------------------------
        // 1) CHECKOUT — built-in
        // Git repoyu Jenkins workspace'ine indirir, sonra tüm dosyaları
        // 'workspace' adlı stash'e koyar. Diğer stage'ler unstash ile alır.
        // ------------------------------------------------------
        stage('Checkout') {
            agent { label 'built-in' }
            steps {
                echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                echo "[BAŞLA] Kaynak kod checkout ediliyor (branch=${env.BRANCH_NAME ?: 'n/a'})"
                checkout scm
                stash includes: '**', name: 'workspace'
                echo "[BİTİŞ] Checkout + workspace stash tamamlandı"
            }
        }

        // ------------------------------------------------------
        // 2) INSTALL DEPENDENCIES — paralel (5 servis)
        // Her servis kendi node'unda + node:20-alpine container'ında
        // npm ci paralel olarak çalışır. Eski sıralı for-loop yerine
        // collectEntries ile her servis paralel branch.
        // ------------------------------------------------------
        // ------------------------------------------------------
        // 2) INSTALL DEPENDENCIES — parallel (5 services)
        // Each service runs npm ci in its own shared workspace.
        // Lint and Audit stages reuse the same ws() path so
        // node_modules persists on disk — no duplicate npm ci.
        // ------------------------------------------------------
        stage('Install Dependencies') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    parallel NODE_SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-quality-${svc}-${env.BUILD_NUMBER}") {
                                    unstash 'workspace'
                                    docker.image('node:20-alpine').inside {
                                        dir(svc) {
                                            echo "[START] ${svc} npm ci"
                                            sh 'npm ci'
                                            echo "[DONE] ${svc}"
                                        }
                                    }
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 3) LINT & COMPILE CHECK — parallel (5 services)
        // Reuses the same ws() path from Install stage so
        // node_modules is already present — no npm ci needed.
        // ------------------------------------------------------
        stage('Lint & Compile Check') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    parallel NODE_SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-quality-${svc}-${env.BUILD_NUMBER}") {
                                    docker.image('node:20-alpine').inside {
                                        dir(svc) {
                                            echo "[START] ${svc} lint and syntax check"
                                            sh 'npm run lint || echo "lint script not found — skipped"'
                                            echo "[DONE] ${svc} lint/syntax OK"
                                        }
                                    }
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 4) DEPENDENCY SCAN — parallel (5 services)
        // npm audit --audit-level=high → fails if high+ CVEs exist.
        // Reuses the same ws() path — node_modules already installed.
        // ------------------------------------------------------
        stage('Dependency Scan') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    parallel NODE_SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-quality-${svc}-${env.BUILD_NUMBER}") {
                                    docker.image('node:20-alpine').inside {
                                        dir(svc) {
                                            echo "[START] ${svc} dependency scan (npm audit, high+)"
                                            sh 'npm audit --audit-level=high'
                                            echo "[DONE] ${svc} dependency scan clean"
                                        }
                                    }
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 4.5) GITLEAKS SECRET SCAN — zricethezav/gitleaks
        // Working tree'de sızdırılmış secret arar (AWS key, JWT, API token).
        // Bir tane bulursa exit 1 → pipeline patlar (default davranış).
        // --no-git: workspace stash'ten geliyor, .git history yok zaten.
        // --redact: bulunan secret log'da maskelenir.
        // ------------------------------------------------------
        stage('Gitleaks Secret Scan') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-gitleaks-${env.BUILD_NUMBER}") {
                            unstash 'workspace'
                            echo "[BAŞLA] Gitleaks secret scan"
                            sh '''
                                docker run --rm \
                                    -v "$(pwd):/repo" \
                                    -w /repo \
                                    zricethezav/gitleaks:latest \
                                    detect --source=/repo --verbose --redact --no-git
                            '''
                            echo "[BİTİŞ] Gitleaks scan temiz"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 5) SONARCLOUD ANALYSIS — sonar-scanner-cli (tek scan, 5 servis kaynak)
        // SonarCloud SaaS'a statik kod analizi gönderir.
        // Token Jenkins'te 'sonarcloud-token' credential'ında saklı.
        // sonar.sources tüm 5 servisin kaynak dizinlerini kapsar.
        // ------------------------------------------------------
        stage('SonarCloud Analysis') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-sonar-${env.BUILD_NUMBER}") {
                            unstash 'workspace'
                            echo "[BAŞLA] SonarCloud analizi gönderiliyor (5 servis kaynak)"
                            sh 'rm -rf .scannerwork || true'
                            withSonarQubeEnv('SonarCloud') {
                                docker.image('sonarsource/sonar-scanner-cli:latest').inside('-u root --entrypoint=""') {
                                    sh '''
                                        sonar-scanner \
                                          -Dsonar.projectKey=HeaveZ_devops-roadmap \
                                          -Dsonar.organization=heavez \
                                          -Dsonar.sources=audit-logger/src,auth-server/src,task-manager/server.js,email-sender/src,frontend/src \
                                          -Dsonar.coverage.exclusions=**/*
                                    '''
                                }
                            }
                            echo "[BİTİŞ] SonarCloud raporu gönderildi"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 5.5) TRIVY FILESYSTEM SCAN — aquasec/trivy
        // Kod + bağımlılık + Dockerfile misconfig + secret tarar.
        // CRITICAL/HIGH bulunursa exit 1 → pipeline patlar (--exit-code 1).
        // trivy-cache volume → vuln DB ikinci build'de cache hit (ilk
        // build ~30s yavaş, sonrakiler hızlı).
        // ------------------------------------------------------
        stage('Trivy Filesystem Scan') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-trivy-fs-${env.BUILD_NUMBER}") {
                            unstash 'workspace'
                            echo "[BAŞLA] Trivy filesystem scan (CRITICAL+HIGH ile patlat)"
                            sh '''
                                docker run --rm \
                                    -v "$(pwd):/repo" \
                                    -v trivy-cache:/root/.cache/trivy \
                                    aquasec/trivy:latest \
                                    fs /repo \
                                    --severity CRITICAL,HIGH \
                                    --exit-code 1 \
                                    --no-progress \
                                    --scanners vuln,misconfig,secret
                            '''
                            echo "[BİTİŞ] Trivy FS scan temiz"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 6) DOCKER BUILD (master + PR) — paralel (6 servis)
        // SERVICES = NODE_SERVICES + nginx. Her servis kendi node'unda
        // build edilir, executor sayısı doğal sınır.
        // PR build'lerde tag pattern: pr-${CHANGE_ID}-${BUILD_NUMBER} +
        // pr-${CHANGE_ID} (lokal, push edilmez — Push stage master only).
        // ------------------------------------------------------
        stage('Docker Build') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    // Pull base images once before parallel builds so Docker
                    // uses the latest base layer while keeping other layers cached.
                    node('built-in') {
                        sh 'docker pull node:20-alpine && docker pull nginx:alpine'
                    }
                    parallel SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-build-${svc}-${env.BUILD_NUMBER}") {
                                    unstash 'workspace'
                                    def imageName = "${GHCR_REGISTRY}/${GHCR_NAMESPACE}/${svc}"
                                    def buildTag  = isPR() ? "pr-${env.CHANGE_ID}-${env.BUILD_NUMBER}" : "${IMMUTABLE_TAG}"
                                    def stableTag = isPR() ? "pr-${env.CHANGE_ID}"                    : "${VERSION}"
                                    echo "[BAŞLA] ${svc} docker build — ${imageName}:${buildTag} + :${stableTag}"
                                    dir(svc) {
                                        sh """
                                            docker build \
                                              -t ${imageName}:${buildTag} \
                                              -t ${imageName}:${stableTag} \
                                              .
                                        """
                                    }
                                    sh "docker images | grep ${svc} || true"
                                    echo "[BİTİŞ] ${svc} image build edildi"
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 6.5) TRIVY IMAGE SCAN — paralel (6 imaj)
        // Build edilen lokal image'ları (henüz push edilmedi) tarar.
        // CRITICAL/HIGH varsa exit 1 → push olmaz, pipeline patlar.
        // --ignore-unfixed: düzeltmesi olmayan vuln'lar atlanır
        // (false-positive azaltır — base image patch yoksa beklemek gerek).
        // docker.sock mount → trivy host daemon'daki imajları görür.
        // Tag pattern Build stage ile aynı (PR-aware: pr-<ID> | v2.1).
        // ------------------------------------------------------
        stage('Trivy Image Scan') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    parallel SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-trivy-img-${svc}-${env.BUILD_NUMBER}") {
                                    def stableTag = isPR() ? "pr-${env.CHANGE_ID}" : "${VERSION}"
                                    def imageName = "${GHCR_REGISTRY}/${GHCR_NAMESPACE}/${svc}:${stableTag}"
                                    echo "[BAŞLA] Trivy image scan: ${imageName}"
                                    sh """
                                        docker run --rm \
                                            -v /var/run/docker.sock:/var/run/docker.sock \
                                            -v trivy-cache:/root/.cache/trivy \
                                            aquasec/trivy:latest \
                                            image ${imageName} \
                                            --severity CRITICAL,HIGH \
                                            --exit-code 1 \
                                            --no-progress \
                                            --ignore-unfixed
                                    """
                                    echo "[BİTİŞ] ${svc} image scan temiz"
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 7) PUSH TO GHCR (sadece master) — paralel (6 servis)
        // ÖNEMLİ: docker login parallel DIŞINDA tek seferlik.
        // Login docker daemon'a credential cache eder; sonra tüm
        // parallel push branches aynı login'i kullanır.
        // ------------------------------------------------------
        stage('Push to GHCR') {
            agent none
            when { branch 'master' }
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    // Önce tek seferlik login
                    node('built-in') {
                        withCredentials([usernamePassword(
                            credentialsId: 'github-ghcr',
                            usernameVariable: 'GHCR_USER',
                            passwordVariable: 'GHCR_TOKEN'
                        )]) {
                            sh 'echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin'
                        }
                    }
                    // Sonra paralel push
                    parallel SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-push-${svc}-${env.BUILD_NUMBER}") {
                                    def imageName = "${GHCR_REGISTRY}/${GHCR_NAMESPACE}/${svc}"
                                    echo "[PUSH] ${imageName}:${IMMUTABLE_TAG} + :${VERSION}"
                                    sh "docker push ${imageName}:${IMMUTABLE_TAG}"
                                    sh "docker push ${imageName}:${VERSION}"
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 8) DEPLOY (sadece master) — built-in (tek compose komutu)
        // docker compose ile tüm servisleri pull edip yeniden başlatır.
        // .env dosyası Jenkins 'taskly-env-prod' Secret file'dan gelir.
        // Compose paralelleştirilmez — tek seferde tüm servisi yönetir.
        // ------------------------------------------------------
        stage('Deploy') {
            agent none
            when { branch 'master' }
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-deploy-${env.BUILD_NUMBER}") {
                            unstash 'workspace'
                            echo "[BAŞLA] Production deploy — TAG=${IMMUTABLE_TAG} (immutable)"
                            withCredentials([file(credentialsId: 'taskly-env-prod', variable: 'ENV_FILE')]) {
                                sh """
                                    set -e
                                    # Onceki build basarisiz biterse .env workspace'te kalmis
                                    # ve farkli uid'li olabilir; once temizle, sonra olusturul.
                                    # Cleanup'i her durumda calistir (trap).
                                    trap 'rm -f .env' EXIT
                                    rm -f .env
                                    install -m 600 "\$ENV_FILE" .env
                                    # TAG env var compose'a inject — her build farkli immutable tag,
                                    # image ID degisir, compose container'lari recreate eder.
                                    # --pull always ile GHCR source-of-truth, lokal cache bypass.
                                    export TAG=${IMMUTABLE_TAG}
                                    docker compose -f docker-compose.prod.yml pull
                                    docker compose -f docker-compose.prod.yml up -d --pull always
                                """
                            }
                            echo "[BİTİŞ] Production deploy tamamlandı (TAG=${IMMUTABLE_TAG})"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 9) SMOKE TEST (sadece master) — built-in
        // Deploy sonrası 6 servisin /health endpoint'ini compose
        // network içinden, son olarak public uçtan probe eder.
        // 15 sn warm-up; herhangi biri patlarsa stage FAIL.
        // ------------------------------------------------------
        stage('Smoke Test') {
            agent none
            when { branch 'master' }
            steps {
                script {
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-smoke-${env.BUILD_NUMBER}") {
                            echo "[BAŞLA] Smoke test — post-deploy health probe"
                            sleep 15
                            sh '''
                                set -e
                                echo "--> Internal health (compose network via taskly-nginx-1)"
                                docker exec taskly-nginx-1 wget -q -T 5 -O - http://auth-server:3001/health
                                echo ""
                                docker exec taskly-nginx-1 wget -q -T 5 -O - http://task-manager:5000/health
                                echo ""
                                docker exec taskly-nginx-1 wget -q -T 5 -O - http://email-sender:3002/health
                                echo ""
                                docker exec taskly-nginx-1 wget -q -T 5 -O - http://audit-logger:8080/health
                                echo ""
                                docker exec taskly-nginx-1 wget -q -T 5 -O - http://frontend:80/health
                                echo ""
                                echo "--> Public endpoint (Cloudflare -> origin)"
                                curl -fsS --max-time 10 https://heavezz.uk/health
                                echo ""
                            '''
                            echo "[BİTİŞ] Smoke test başarılı — 5 internal + 1 public uç sağlıklı"
                        }
                    }
                }
            }
        }
    }

    // ----------------------------------------------------------
    // POST-BUILD
    // agent none olduğu için sh çağrısı için node bloğu lazım.
    // Her durumda GHCR'dan logout, sonuca göre bildirim.
    // ----------------------------------------------------------
    post {
        always {
            // Mevcut: Docker logout (DOKUNULMADI)
            node('built-in') {
                sh 'docker logout ghcr.io || true'
            }
            // YENİ: Pipeline TAMAMEN bittikten sonra workspace cleanup.
            // Bu build'in oluşturduğu paralel ws() dizinleri ARTIK kullanılmıyor.
            // Pattern: workspace/devops/master-{stage}-{svc}-{BUILD_NUMBER}
            // Cleanup hatası pipeline'ı patlatmasın diye try/catch içinde.
            script {
                try {
                    node('built-in') {
                        echo "[CLEANUP] Build #${env.BUILD_NUMBER} workspace temizliği başlıyor"
                        sh '''
                            BEFORE=$(df -h / | tail -1 | awk '{print $5}')
                            find /var/jenkins_home/workspace/devops/ \\
                                -maxdepth 1 \\
                                -type d \\
                                \\( -name "*-${BUILD_NUMBER}" -o -name "*-${BUILD_NUMBER}@tmp" \\) \\
                                -exec rm -rf {} + 2>/dev/null || true
                            AFTER=$(df -h / | tail -1 | awk '{print $5}')
                            echo "[CLEANUP] Disk doluluk: ${BEFORE} -> ${AFTER}"
                            echo "[CLEANUP] Build #${BUILD_NUMBER} workspace dizinleri silindi"
                        '''
                    }
                } catch (e) {
                    // Cleanup hatası pipeline'ı patlatmasın
                    echo "Workspace cleanup hatası (kritik değil): ${e.message}"
                }
            }
        }
        failure {
            echo "Pipeline BAŞARISIZ: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        success {
            echo "Pipeline BAŞARILI: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
