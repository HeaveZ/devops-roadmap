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
// ============================================================

pipeline {
    // Jenkins master üzerinde çalışıyoruz (aynı VPS'te Docker da var).
    agent any

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
        // 1) CHECKOUT
        // Git repoyu Jenkins workspace'ine indirir.
        // ------------------------------------------------------
        stage('Checkout') {
            steps {
                echo "[BAŞLA] Kaynak kod checkout ediliyor (branch=${env.BRANCH_NAME ?: 'n/a'})"
                checkout scm
                echo "[BİTİŞ] Checkout tamamlandı"
            }
        }

        // ------------------------------------------------------
        // 2) INSTALL DEPENDENCIES
        // npm ci → package-lock.json'dan deterministik kurulum.
        // `npm install` yerine `npm ci` kullanılır çünkü:
        //   - daha hızlı
        //   - lock file'ı değiştirmez
        //   - node_modules'u temizden kurar (reproducible build)
        // ------------------------------------------------------
        stage('Install Dependencies') {
            steps {
                echo "[BAŞLA] ${SERVICE} bağımlılıkları yükleniyor (npm ci)"
                dir("${SERVICE}") {
                    sh 'npm ci'
                }
                echo "[BİTİŞ] Bağımlılıklar yüklendi"
            }
        }

        // ------------------------------------------------------
        // 3) LINT & COMPILE CHECK
        // Lint script'i yoksa atlar (|| echo).
        // node --check ile JavaScript syntax doğrulaması yapılır.
        // ------------------------------------------------------
        stage('Lint & Compile Check') {
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
        // 4) DEPENDENCY SCAN
        // npm audit → bilinen CVE'li paket var mı bakar.
        // --audit-level=high: sadece 'high' ve 'critical' varsa fail.
        // (moderate/low'da exit code 0 döner; pipeline kırılmaz.)
        // ------------------------------------------------------
        stage('Dependency Scan') {
            steps {
                echo "[BAŞLA] Bağımlılık güvenlik taraması (npm audit, high+)"
                dir("${SERVICE}") {
                    sh 'npm audit --audit-level=high'
                }
                echo "[BİTİŞ] Bağımlılık taraması temiz"
            }
        }

        // ------------------------------------------------------
        // 5) SONARCLOUD ANALYSIS
        // SonarCloud SaaS'a statik kod analizi gönderir.
        // Token Jenkins'te 'sonarcloud-token' credential'ında saklı.
        // sonar-scanner CLI'sinin VPS'te PATH'te olduğu varsayılıyor.
        // ------------------------------------------------------
        stage('SonarCloud Analysis') {
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
        // 6) DOCKER BUILD (sadece main)
        // İki tag ile build edilir:
        //   - immutable:  v2.1-<build_number>
        //   - moving:     v2.1   (compose bunu pull eder)
        // ------------------------------------------------------
        stage('Docker Build') {
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
        // 7) PUSH TO GHCR (sadece main)
        // GitHub Container Registry'e login → iki tag'i de push.
        // 'github-ghcr' credential'ı: username = GitHub kullanıcı adı,
        //                             password = PAT (write:packages yetkili).
        // ------------------------------------------------------
        stage('Push to GHCR') {
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
        // 8) DEPLOY (sadece main)
        // docker compose ile sadece audit-logger servisi yenilenir.
        // compose dosyası repo kök dizininde: docker-compose.prod.yml
        // .env dosyası VPS'te manuel olarak hazırlanmış olmalı.
        // ------------------------------------------------------
        stage('Deploy') {
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
    // Her durumda GHCR'dan logout, sonuca göre bildirim.
    // ----------------------------------------------------------
    post {
        always {
            sh 'docker logout ghcr.io || true'
        }
        failure {
            echo "Pipeline BAŞARISIZ: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        success {
            echo "Pipeline BAŞARILI: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
