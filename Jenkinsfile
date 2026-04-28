// ============================================================
//  Jenkinsfile — audit-logger servisi için CI/CD pipeline
// ------------------------------------------------------------
//  Bu pipeline sadece audit-logger servisi için kurulmuştur.
//  Amaç: pipeline mekaniğini bu servisle oturtmak; diğer
//  servisler daha sonra aynı şablonla eklenecek.
//
//  Akış:
//    - Her branch (PR dahil): Checkout → Install → Lint/Compile
//      → Dependency Scan → SonarCloud
//    - Sadece 'main' branch: Docker Build → GHCR Push → Deploy
//
//  Etiketleme stratejisi (çift tag):
//    - :v2.1-${BUILD_NUMBER}  → immutable, izlenebilir
//    - :v2.1                  → moving pointer, compose tarafı bunu pull eder
//
//  Multi-agent pattern: her stage uygun image'da çalışır.
//    - Node tabanlı stage'ler:  node:20-alpine
//    - SonarCloud:              sonarsource/sonar-scanner-cli:latest
//    - Build / Push / Deploy:   built-in (host docker daemon)
// ============================================================

pipeline {
    // Top-level agent yok; her stage kendi container'ında.
    agent none

    // Pipeline genelinde kullanılacak değişkenler.
    environment {
        SERVICE        = 'audit-logger'
        GHCR_REGISTRY  = 'ghcr.io'
        GHCR_NAMESPACE = 'heavez'
        IMAGE_NAME     = "${GHCR_REGISTRY}/${GHCR_NAMESPACE}/${SERVICE}"
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
                echo "[BİTİŞ] Checkout tamamlandı"
            }
        }

        // ------------------------------------------------------
        // 2) INSTALL DEPENDENCIES — node:20-alpine
        // npm ci → package-lock.json'dan deterministik kurulum.
        // `npm install` yerine `npm ci` kullanılır çünkü:
        //   - daha hızlı
        //   - lock file'ı değiştirmez
        //   - node_modules'u temizden kurar (reproducible build)
        // ------------------------------------------------------
        stage('Install Dependencies') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                echo "[BAŞLA] ${SERVICE} bağımlılıkları yükleniyor (npm ci)"
                dir("${SERVICE}") {
                    sh 'npm ci'
                }
                echo "[BİTİŞ] Bağımlılıklar yüklendi"
            }
        }

        // ------------------------------------------------------
        // 3) LINT & COMPILE CHECK — node:20-alpine
        // Lint script'i yoksa atlar (|| echo).
        // node --check ile JavaScript syntax doğrulaması yapılır.
        // ------------------------------------------------------
        stage('Lint & Compile Check') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                echo "[BAŞLA] Lint ve syntax kontrolü"
                dir("${SERVICE}") {
                    sh 'npm run lint || echo "lint scripti bulunamadı — atlandı"'
                    sh 'node --check src/index.js'
                }
                echo "[BİTİŞ] Lint ve syntax kontrolü OK"
            }
        }

        // ------------------------------------------------------
        // 4) DEPENDENCY SCAN — node:20-alpine
        // npm audit → bilinen CVE'li paket var mı bakar.
        // --audit-level=high: sadece 'high' ve 'critical' varsa fail.
        // (moderate/low'da exit code 0 döner; pipeline kırılmaz.)
        // ------------------------------------------------------
        stage('Dependency Scan') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                echo "[BAŞLA] Bağımlılık güvenlik taraması (npm audit, high+)"
                dir("${SERVICE}") {
                    sh 'npm audit --audit-level=high'
                }
                echo "[BİTİŞ] Bağımlılık taraması temiz"
            }
        }

        // ------------------------------------------------------
        // 5) SONARCLOUD ANALYSIS — sonar-scanner-cli
        // SonarCloud SaaS'a statik kod analizi gönderir.
        // Token Jenkins'te 'sonarcloud-token' credential'ında saklı.
        // Image entrypoint'i sonar-scanner; sh çalıştırmak için sıfırla.
        // -u root: scanner'ın cache klasörlerine yazabilmesi için.
        // ------------------------------------------------------
        stage('SonarCloud Analysis') {
            agent {
                docker {
                    image 'sonarsource/sonar-scanner-cli:latest'
                    reuseNode true
                    args '-u root --entrypoint=""'
                }
            }
            steps {
                echo "[BAŞLA] SonarCloud analizi gönderiliyor"
                withCredentials([string(credentialsId: 'sonarcloud-token', variable: 'SONAR_TOKEN')]) {
                    dir("${SERVICE}") {
                        sh '''
                            sonar-scanner \
                              -Dsonar.projectKey=HeaveZ_devops-roadmap \
                              -Dsonar.organization=heavez \
                              -Dsonar.host.url=https://sonarcloud.io \
                              -Dsonar.login=$SONAR_TOKEN \
                              -Dsonar.sources=src
                        '''
                    }
                }
                echo "[BİTİŞ] SonarCloud raporu gönderildi"
            }
        }

        // ------------------------------------------------------
        // 6) DOCKER BUILD (sadece main) — built-in
        // İki tag ile build edilir:
        //   - immutable:  v2.1-<build_number>
        //   - moving:     v2.1   (compose bunu pull eder)
        // Built-in agent: Jenkins container'ında docker CLI var,
        // host docker.sock üzerinden host daemon'a bağlanır.
        // ------------------------------------------------------
        stage('Docker Build') {
            agent { label 'built-in' }
            when { branch 'main' }
            steps {
                echo "[BAŞLA] Docker image build — ${IMAGE_NAME}:${IMMUTABLE_TAG} + :${VERSION}"
                dir("${SERVICE}") {
                    sh """
                        docker build \
                          -t ${IMAGE_NAME}:${IMMUTABLE_TAG} \
                          -t ${IMAGE_NAME}:${VERSION} \
                          .
                    """
                }
                echo "[BİTİŞ] Docker image build edildi"
            }
        }

        // ------------------------------------------------------
        // 7) PUSH TO GHCR (sadece main) — built-in
        // GitHub Container Registry'e login → iki tag'i de push.
        // 'github-ghcr' credential'ı: username = GitHub kullanıcı adı,
        //                             password = PAT (write:packages yetkili).
        // ------------------------------------------------------
        stage('Push to GHCR') {
            agent { label 'built-in' }
            when { branch 'main' }
            steps {
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
                sh """
                    docker push ${IMAGE_NAME}:${IMMUTABLE_TAG}
                    docker push ${IMAGE_NAME}:${VERSION}
                """
                echo "[BİTİŞ] Image GHCR'a pushlandı (${IMMUTABLE_TAG} + ${VERSION})"
            }
        }

        // ------------------------------------------------------
        // 8) DEPLOY (sadece main) — built-in
        // docker compose ile sadece audit-logger servisi yenilenir.
        // compose dosyası repo kök dizininde: docker-compose.prod.yml
        // .env dosyası VPS'te manuel olarak hazırlanmış olmalı.
        // ------------------------------------------------------
        stage('Deploy') {
            agent { label 'built-in' }
            when { branch 'main' }
            steps {
                echo "[BAŞLA] Production deploy (audit-logger)"
                sh '''
                    docker compose -f docker-compose.prod.yml pull audit-logger
                    docker compose -f docker-compose.prod.yml up -d audit-logger
                '''
                echo "[BİTİŞ] audit-logger deploy tamamlandı"
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

