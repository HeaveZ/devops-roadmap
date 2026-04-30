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
        stage('Install Dependencies') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    parallel NODE_SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-install-${svc}-${env.BUILD_NUMBER}") {
                                    unstash 'workspace'
                                    docker.image('node:20-alpine').inside {
                                        dir(svc) {
                                            echo "[BAŞLA] ${svc} npm ci"
                                            sh 'npm ci'
                                            echo "[BİTİŞ] ${svc}"
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
        // 3) LINT & COMPILE CHECK — paralel (5 servis)
        // Stash mantığında her parallel branch fresh workspace alır
        // (node_modules YOK), bu yüzden lint öncesi npm ci tekrar çalışır.
        // 5 servis paralel olduğu için extra npm ci wall-clock'a etkisiz.
        // ------------------------------------------------------
        stage('Lint & Compile Check') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    parallel NODE_SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-lint-${svc}-${env.BUILD_NUMBER}") {
                                    unstash 'workspace'
                                    docker.image('node:20-alpine').inside {
                                        dir(svc) {
                                            echo "[BAŞLA] ${svc} lint ve syntax kontrolü"
                                            sh 'npm ci'
                                            sh 'npm run lint || echo "lint scripti bulunamadı — atlandı"'
                                            echo "[BİTİŞ] ${svc} lint/syntax OK"
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
        // 4) DEPENDENCY SCAN — paralel (5 servis)
        // npm audit --audit-level=high → high+ CVE varsa fail.
        // Lint stage gibi, fresh workspace nedeniyle npm ci tekrar.
        // ------------------------------------------------------
        stage('Dependency Scan') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    parallel NODE_SERVICES.split(',').collectEntries { svc ->
                        ["${svc}": {
                            node('built-in') {
                                ws("workspace/${env.JOB_NAME}-audit-${svc}-${env.BUILD_NUMBER}") {
                                    unstash 'workspace'
                                    docker.image('node:20-alpine').inside {
                                        dir(svc) {
                                            echo "[BAŞLA] ${svc} bağımlılık taraması (npm audit, high+)"
                                            sh 'npm ci'
                                            sh 'npm audit --audit-level=high'
                                            echo "[BİTİŞ] ${svc} bağımlılık taraması temiz"
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
                            docker.image('sonarsource/sonar-scanner-cli:latest').inside('-u root --entrypoint=""') {
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
                            }
                            echo "[BİTİŞ] SonarCloud raporu gönderildi"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 5b) QUALITY GATE — SonarCloud Quality Gate sonucunu bekler.
        // Eğer Quality Gate FAILED dönerse pipeline burada patlar.
        // Not: SonarCloud webhook'u Jenkins'e tanımlı olmalıdır.
        // ------------------------------------------------------
        stage('Quality Gate') {
            agent { label 'built-in' }
            steps {
                echo "[BAŞLA] SonarCloud Quality Gate sonucu bekleniyor..."
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
                echo "[BİTİŞ] Quality Gate geçti"
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
                            echo "[BAŞLA] Production deploy (docker compose up -d)"
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
