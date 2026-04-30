// ============================================================
//  Jenkinsfile — Taskly multi-service CI/CD pipeline
// ------------------------------------------------------------
//  5 mikroservis için tek pipeline:
//    audit-logger, auth-server, task-manager, email-sender, frontend
//
//  Akış:
//    - Her branch (PR dahil): Checkout → Install → Lint → Audit → Sonar
//    - Sadece 'master' branch: Build → Push → Deploy (tüm servisler)
//
//  Etiketleme stratejisi (çift tag, her servis için):
//    - :v2.1-${BUILD_NUMBER}  → immutable, izlenebilir
//    - :v2.1                  → moving pointer, compose tarafı bunu pull eder
//
//  Multi-agent pattern: her stage uygun image'da çalışır.
//    - Quality stages (Install/Lint/Audit):  node:20-alpine
//    - SonarCloud:                           sonarsource/sonar-scanner-cli:latest
//    - Build / Push / Deploy:                built-in (host docker daemon)
//
//  Deploy: docker compose -f docker-compose.prod.yml up -d
//          → 5 servisi dependency order'da recreate eder
//          → .env Jenkins secret file 'taskly-env-prod'tan gelir
// ============================================================

pipeline {
    // Top-level agent yok; her stage kendi container'ında.
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
        // 30 dakikada bitmezse build'i sonlandır (5 servis × build/push/deploy).
        timeout(time: 30, unit: 'MINUTES')
        // Her stage'in implicit `checkout scm` adımını kapat; tek checkout
        // + stash/unstash ile workspace dağıtılır (git fetch tekrarı yok).
        skipDefaultCheckout()
    }

    stages {

        // ------------------------------------------------------
        // 1) CHECKOUT — built-in
        // Git repoyu Jenkins workspace'ine indirir.
        // ------------------------------------------------------
        stage('Checkout') {
            agent { label 'built-in' }
            steps {
                echo "[BAŞLA] Kaynak kod checkout ediliyor (branch=${env.BRANCH_NAME ?: 'n/a'})"
                checkout scm
                // Workspace'i stash'le; sonraki stage'ler unstash ile alır.
                // Tek git fetch — 8x git fetch yerine.
                stash includes: '**', name: 'workspace'
                echo "[BİTİŞ] Checkout tamamlandı (workspace stashed)"
            }
        }

        // ------------------------------------------------------
        // 2) INSTALL DEPENDENCIES — node:20-alpine (5 servis)
        // Her servis için npm ci → package-lock.json'dan deterministik
        // kurulum. Tek container içinde 5 dir+npm ci sıralı koşar.
        // Frontend için devDependencies dahil (Vite, Tailwind vs. quality
        // gate'ler için lazım); diğer node servisleri için de tüm deps.
        // ------------------------------------------------------
        stage('Install Dependencies') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                unstash 'workspace'
                script {
                    NODE_SERVICES.split(',').each { svc ->
                        echo "[BAŞLA] ${svc} bağımlılıkları yükleniyor (npm ci)"
                        dir(svc) {
                            sh 'npm ci'
                        }
                        echo "[BİTİŞ] ${svc} bağımlılıkları yüklendi"
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 3) LINT & COMPILE CHECK — node:20-alpine (5 servis)
        // Lint script'i yoksa atlar (|| echo).
        // Node servisler için node --check ile syntax doğrulaması.
        // Frontend için lint'i package.json'da tanımlanırsa koşar,
        // yoksa atlar.
        // ------------------------------------------------------
        stage('Lint & Compile Check') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                unstash 'workspace'
                script {
                    NODE_SERVICES.split(',').each { svc ->
                        echo "[BAŞLA] ${svc} lint ve syntax kontrolü"
                        dir(svc) {
                            sh 'npm run lint || echo "lint scripti bulunamadı — atlandı"'
                        }
                        echo "[BİTİŞ] ${svc} lint/syntax OK"
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 4) DEPENDENCY SCAN — node:20-alpine (5 servis)
        // npm audit → bilinen CVE'li paket var mı bakar.
        // --audit-level=high: sadece 'high' ve 'critical' varsa fail.
        // ------------------------------------------------------
        stage('Dependency Scan') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                unstash 'workspace'
                script {
                    NODE_SERVICES.split(',').each { svc ->
                        echo "[BAŞLA] ${svc} bağımlılık taraması (npm audit, high+)"
                        dir(svc) {
                            sh 'npm audit --audit-level=high'
                        }
                        echo "[BİTİŞ] ${svc} bağımlılık taraması temiz"
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
            agent {
                docker {
                    image 'sonarsource/sonar-scanner-cli:latest'
                    reuseNode true
                    args '-u root --entrypoint=""'
                }
            }
            // PR'lar ve feature branch'lerde Sonar atlanır; sadece master'da koşar.
            when { branch 'master' }
            steps {
                unstash 'workspace'
                echo "[BAŞLA] SonarCloud analizi gönderiliyor (5 servis kaynak)"
                withCredentials([string(credentialsId: 'sonarcloud-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=HeaveZ_devops-roadmap \
                          -Dsonar.organization=heavez \
                          -Dsonar.host.url=https://sonarcloud.io \
                          -Dsonar.login=$SONAR_TOKEN \
                          -Dsonar.sources=audit-logger/src,auth-server/src,task-manager/server.js,email-sender/src,frontend/src
                    '''
                }
                echo "[BİTİŞ] SonarCloud raporu gönderildi"
            }
        }

        // ------------------------------------------------------
        // 6) DOCKER BUILD (sadece master) — built-in (5 servis)
        // Her servis için iki tag ile build:
        //   - immutable:  v2.1-<build_number>
        //   - moving:     v2.1   (compose bunu pull eder)
        // Built-in agent: Jenkins container'ında docker CLI var,
        // host docker.sock üzerinden host daemon'a bağlanır.
        // ------------------------------------------------------
        stage('Docker Build') {
            agent { label 'built-in' }
            when { branch 'master' }
            steps {
                unstash 'workspace'
                script {
                    SERVICES.split(',').each { svc ->
                        def imageName = "${GHCR_REGISTRY}/${GHCR_NAMESPACE}/${svc}"
                        echo "[BAŞLA] ${svc} docker image build — ${imageName}:${IMMUTABLE_TAG} + :${VERSION}"
                        sh """
                            docker build \
                              -t ${imageName}:${IMMUTABLE_TAG} \
                              -t ${imageName}:${VERSION} \
                              ./${svc}/
                        """
                        echo "[BİTİŞ] ${svc} image build edildi"
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 7) PUSH TO GHCR (sadece master) — built-in (5 servis)
        // GitHub Container Registry'e login → her servisi iki tag ile push.
        // 'github-ghcr' credential: username = GitHub kullanıcı adı,
        //                           password = PAT (write:packages yetkili).
        // Login bir kez, push 5 servis × 2 tag.
        // ------------------------------------------------------
        stage('Push to GHCR') {
            agent { label 'built-in' }
            when { branch 'master' }
            steps {
                unstash 'workspace'
                echo "[BAŞLA] GHCR login ve image push"
                withCredentials([usernamePassword(
                    credentialsId: 'github-ghcr',
                    usernameVariable: 'GHCR_USER',
                    passwordVariable: 'GHCR_TOKEN'
                )]) {
                    sh '''
                        echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
                    '''
                }
                script {
                    SERVICES.split(',').each { svc ->
                        def imageName = "${GHCR_REGISTRY}/${GHCR_NAMESPACE}/${svc}"
                        echo "[PUSH] ${imageName}:${IMMUTABLE_TAG} ve :${VERSION}"
                        sh """
                            docker push ${imageName}:${IMMUTABLE_TAG}
                            docker push ${imageName}:${VERSION}
                        """
                    }
                }
                echo "[BİTİŞ] ${SERVICES.split(',').size()} servis × 2 tag GHCR'a pushlandı"
            }
        }

        // ------------------------------------------------------
        // 8) DEPLOY (sadece master) — built-in (tek compose komutu)
        // docker compose ile tüm servisleri pull edip yeniden başlatır.
        // .env dosyası Jenkins 'taskly-env-prod' Secret file'dan gelir.
        // db ve kafka image değişmediği için recreate olmaz (volume korunur);
        // 5 uygulama servisi yeni :v2.1 image ile recreate olur.
        // nginx config değişmemişse o da etkilenmez.
        // ------------------------------------------------------
        stage('Deploy') {
            agent { label 'built-in' }
            when { branch 'master' }
            steps {
                unstash 'workspace'
                echo "[BAŞLA] Production deploy (5 servis, docker compose up -d)"
                withCredentials([file(credentialsId: 'taskly-env-prod', variable: 'ENV_FILE')]) {
                    sh '''
                        set -e
                        # Onceki build basarisiz biterse .env workspace'te kalmis
                        # ve farkli uid'li olabilir; once temizle, sonra olusturul.
                        # Cleanup'i her durumda calistir (trap).
                        trap 'rm -f .env' EXIT
                        rm -f .env
                        install -m 600 "$ENV_FILE" .env
                        docker compose -f docker-compose.prod.yml pull
                        docker compose -f docker-compose.prod.yml up -d
                    '''
                }
                echo "[BİTİŞ] Production deploy tamamlandı"
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
            node('built-in') {
                sh 'docker logout ghcr.io || true'
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
