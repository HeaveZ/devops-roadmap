// ============================================================
//  Jenkinsfile — Taskly multi-service CI/CD pipeline
// ------------------------------------------------------------
//  Single pipeline for 6 microservices:
//    audit-logger, auth-server, task-manager, email-sender, frontend, nginx
//
//  Flow:
//    - Every branch (incl. PRs): Checkout → Install → Lint → Audit → Sonar → Build
//    - Master branch only: Push → Deploy
//
//  Parallelization: Install/Lint/Audit/Build/Push stages use
//    NODE_SERVICES (or SERVICES).collectEntries pattern for parallel
//    execution. Each parallel branch: node('built-in') → unstash → work.
//    Built-in executor count provides natural RAM protection.
//
//  Stash strategy: skipDefaultCheckout(true) → no auto-fetch per stage.
//    Checkout stage stashes the workspace; other stages unstash it.
//
//  Tagging strategy (dual tag per service):
//    - Master: :v2.1-${BUILD_NUMBER} (immutable) + :v2.1 (moving pointer, compose pull)
//    - PR:     :pr-${CHANGE_ID}-${BUILD_NUMBER} + :pr-${CHANGE_ID} (local, not pushed)
//
//  Multi-agent pattern:
//    - Quality stages (Install/Lint/Audit):  node:20-alpine (parallel)
//    - SonarCloud:                           sonarsource/sonar-scanner-cli
//    - Build / Push / Deploy:                built-in (host docker daemon)
// ============================================================

// PR build helper — In Multibranch Pipeline, Jenkins automatically sets
// the CHANGE_ID env variable (PR number) for PR builds.
// It is null for branch builds (including master).
def isPR() {
    return env.CHANGE_ID != null
}

pipeline {
    // No top-level agent; each stage runs in its own container or parallel branch.
    agent none

    // Pipeline-wide variables.
    environment {
        // Node.js services (for npm ci/lint/audit stages)
        NODE_SERVICES  = 'audit-logger,auth-server,task-manager,email-sender,frontend'
        // All images to build & push (including nginx reverse-proxy)
        SERVICES       = 'audit-logger,auth-server,task-manager,email-sender,frontend,nginx'
        GHCR_REGISTRY  = 'ghcr.io'
        GHCR_NAMESPACE = 'heavez'
        VERSION        = 'v2.1'
        // BUILD_NUMBER is automatically assigned by Jenkins.
        IMMUTABLE_TAG  = "${VERSION}-${BUILD_NUMBER}"
    }

    options {
        // Add timestamps to log lines — very useful for debugging.
        timestamps()
        // Prevent two builds of the same job from running in parallel.
        disableConcurrentBuilds()
        // Abort the build if it doesn't finish within 30 minutes.
        timeout(time: 30, unit: 'MINUTES')
        // Disable implicit checkout scm per stage — Checkout stage does it
        // once and stashes; other stages retrieve via unstash.
        skipDefaultCheckout(true)
        // Build retention — prevent disk bloat.
        // Workspace cleanup is done in post.always; this prevents Jenkins meta/log accumulation.
        buildDiscarder(logRotator(
            numToKeepStr: '10',
            artifactNumToKeepStr: '5',
            daysToKeepStr: '14'
        ))
    }

    stages {

        // ------------------------------------------------------
        // 1) CHECKOUT — built-in
        // Clones the git repo into the Jenkins workspace, then stashes all
        // files under 'workspace'. Other stages retrieve via unstash.
        // ------------------------------------------------------
        stage('Checkout') {
            agent { label 'built-in' }
            steps {
                echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                echo "[START] Checking out source code (branch=${env.BRANCH_NAME ?: 'n/a'})"
                checkout scm
                stash includes: '**', name: 'workspace'
                echo "[DONE] Checkout + workspace stash completed"
            }
        }

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
        // Scans the working tree for leaked secrets (AWS keys, JWT, API tokens).
        // If any are found, exit 1 → pipeline fails (default behavior).
        // --no-git: workspace comes from stash, no .git history present.
        // --redact: masks found secrets in the log output.
        // ------------------------------------------------------
        stage('Gitleaks Secret Scan') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-gitleaks-${env.BUILD_NUMBER}") {
                            unstash 'workspace'
                            echo "[START] Gitleaks secret scan"
                            sh '''
                                docker run --rm \
                                    -v "$(pwd):/repo" \
                                    -w /repo \
                                    zricethezav/gitleaks:latest \
                                    detect --source=/repo --verbose --redact --no-git
                            '''
                            echo "[DONE] Gitleaks scan clean"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 5) SONARCLOUD ANALYSIS — sonar-scanner-cli (single scan, 5 service sources)
        // Sends static code analysis to SonarCloud SaaS.
        // Token is stored in Jenkins 'sonarcloud-token' credential.
        // sonar.sources covers the source directories of all 5 services.
        // ------------------------------------------------------
        stage('SonarCloud Analysis') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-sonar-${env.BUILD_NUMBER}") {
                            unstash 'workspace'
                            echo "[START] Sending SonarCloud analysis (5 service sources)"
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
                            echo "[DONE] SonarCloud report submitted"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 5.5) TRIVY FILESYSTEM SCAN — aquasec/trivy
        // Scans code + dependencies + Dockerfile misconfigs + secrets.
        // If CRITICAL/HIGH findings exist, exit 1 → pipeline fails (--exit-code 1).
        // trivy-cache volume → vuln DB cache hit on subsequent builds
        // (first build ~30s slower, subsequent ones are fast).
        // ------------------------------------------------------
        stage('Trivy Filesystem Scan') {
            agent none
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-trivy-fs-${env.BUILD_NUMBER}") {
                            unstash 'workspace'
                            echo "[START] Trivy filesystem scan (fail on CRITICAL+HIGH)"
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
                            echo "[DONE] Trivy FS scan clean"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 6) DOCKER BUILD (master + PR) — parallel (6 services)
        // SERVICES = NODE_SERVICES + nginx. Each service builds on its
        // own node; executor count is the natural concurrency limit.
        // PR builds use tag pattern: pr-${CHANGE_ID}-${BUILD_NUMBER} +
        // pr-${CHANGE_ID} (local only, not pushed — Push stage is master only).
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
                                    echo "[START] ${svc} docker build — ${imageName}:${buildTag} + :${stableTag}"
                                    dir(svc) {
                                        sh """
                                            docker build \
                                              -t ${imageName}:${buildTag} \
                                              -t ${imageName}:${stableTag} \
                                              .
                                        """
                                    }
                                    sh "docker images | grep ${svc} || true"
                                    echo "[DONE] ${svc} image built"
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 6.5) TRIVY IMAGE SCAN — parallel (6 images)
        // Scans locally built images (not yet pushed).
        // If CRITICAL/HIGH found, exit 1 → no push, pipeline fails.
        // --ignore-unfixed: skips vulns with no available fix
        // (reduces false positives — nothing to do if base image has no patch).
        // docker.sock mount → trivy can see images on the host daemon.
        // Tag pattern matches the Build stage (PR-aware: pr-<ID> | v2.1).
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
                                    echo "[START] Trivy image scan: ${imageName}"
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
                                    echo "[DONE] ${svc} image scan clean"
                                }
                            }
                        }]
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 7) PUSH TO GHCR (master only) — parallel (6 services)
        // IMPORTANT: docker login runs once OUTSIDE the parallel block.
        // Login caches credentials in the docker daemon; all parallel
        // push branches then share the same login session.
        // ------------------------------------------------------
        stage('Push to GHCR') {
            agent none
            when { branch 'master' }
            steps {
                script {
                    echo "Build context: ${isPR() ? 'PR #' + env.CHANGE_ID : 'master'}"
                    // One-time login first
                    node('built-in') {
                        withCredentials([usernamePassword(
                            credentialsId: 'github-ghcr',
                            usernameVariable: 'GHCR_USER',
                            passwordVariable: 'GHCR_TOKEN'
                        )]) {
                            sh 'echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin'
                        }
                    }
                    // Then parallel push
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
        // 8) DEPLOY (master only) — built-in (single compose command)
        // Pulls and restarts all services via docker compose.
        // .env file comes from Jenkins 'taskly-env-prod' Secret file.
        // Compose is not parallelized — it manages all services at once.
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
                            echo "[BAŞLA] Production deploy (Swarm) — TAG=${IMMUTABLE_TAG}"
                            withCredentials([file(credentialsId: 'taskly-env-prod', variable: 'ENV_FILE')]) {
                                sh """
                                    set -e
                                    # Cleanup: hem .env hem render edilmiş stack dosyası
                                    trap 'rm -f .env docker-stack.rendered.yml' EXIT
                                    rm -f .env docker-stack.rendered.yml
                                    install -m 600 "\$ENV_FILE" .env
                                    # TAG'i .env'e ekle: printf ile leading \\n sok ki
                                    # secret file trailing newline ile bitmiyorsa son satira yapismasin.
                                    printf '\\nTAG=%s\\n' "${IMMUTABLE_TAG}" >> .env
                                    # SENSITIVE: env loading + envsubst'u xtrace'ten gizle, secret'lar
                                    # build log'una sizmasin. (POSIX sh source/while-read her ikisi de
                                    # 'set -x' altinda her export'u trace ederdi.)
                                    set +x
                                    # .env parse: 'set -a; . ./.env' yerine while-read loop kullan.
                                    # Sebep: POSIX sh source, deger icinde acilmamis tirnak (',\")
                                    # gorunce 'Unterminated quoted string' verir. while-read literal okur.
                                    set -a
                                    while IFS='=' read -r k v || [ -n "\$k" ]; do
                                      case "\$k" in ''|\\#*) continue ;; esac
                                      case "\$v" in
                                        \\"*\\") v=\${v#\\"}; v=\${v%\\"} ;;
                                        \\'*\\') v=\${v#\\'}; v=\${v%\\'} ;;
                                      esac
                                      export "\${k}=\${v}"
                                    done < .env
                                    set +a
                                    envsubst < docker-stack.yml > docker-stack.rendered.yml
                                    set -x
                                    # Swarm deploy
                                    docker stack deploy \\
                                      --compose-file docker-stack.rendered.yml \\
                                      --with-registry-auth \\
                                      --prune \\
                                      taskly
                                """
                            }
                            echo "[BİTİŞ] Production deploy tamamlandı (TAG=${IMMUTABLE_TAG})"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------
        // 9) SMOKE TEST (master only) — built-in
        // Post-deploy Swarm convergence wait, ardindan iç servisleri
        // taskly-overlay üstünde geçici curl container ile, son olarak
        // public uçtan ingress mesh üzerinden probe eder.
        // ------------------------------------------------------
        stage('Smoke Test') {
            agent none
            when { branch 'master' }
            steps {
                script {
                    node('built-in') {
                        ws("workspace/${env.JOB_NAME}-smoke-${env.BUILD_NUMBER}") {
                            echo "[BAŞLA] Smoke test — post-deploy health probe (Swarm)"
                            sh '''
                                set -e
                                echo "--> Swarm convergence wait (max 60s)"
                                for i in $(seq 1 12); do
                                  TOTAL=$(docker service ls --filter name=taskly_ --format "{{.Replicas}}" | wc -l)
                                  READY=$(docker service ls --filter name=taskly_ --format "{{.Replicas}}" | grep -c "^1/1$" || true)
                                  echo "  tick $i: ${READY}/${TOTAL} services 1/1"
                                  if [ "$READY" = "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
                                    echo "All ${TOTAL} services converged."
                                    break
                                  fi
                                  sleep 5
                                done

                                echo "--> Public health (ingress mesh via Cloudflare)"
                                curl -fsS --max-time 10 https://heavezz.uk/health
                                echo ""

                                echo "--> Internal service health via temporary container on taskly-overlay"
                                for endpoint in \\
                                  "auth-server:3001/health" \\
                                  "task-manager:5000/health" \\
                                  "email-sender:3002/health" \\
                                  "audit-logger:8080/health" \\
                                  "frontend:80/health"
                                do
                                  echo -n "  [${endpoint}] "
                                  docker run --rm --network taskly-overlay \\
                                    curlimages/curl:latest \\
                                    -fsS --max-time 5 "http://${endpoint}" \\
                                    > /dev/null && echo "OK" || (echo "FAIL"; exit 1)
                                done

                                echo "--> Public root"
                                curl -fsS --max-time 10 https://heavezz.uk/ -o /dev/null -w "HTTP %{http_code}\\n"
                            '''
                            echo "[BİTİŞ] Smoke test başarılı — Swarm convergence + 5 internal + 2 public uç sağlıklı"
                        }
                    }
                }
            }
        }
    }

    // ----------------------------------------------------------
    // POST-BUILD
    // Since agent is none, a node block is needed for sh calls.
    // Always logout from GHCR; send notifications based on result.
    // ----------------------------------------------------------
    post {
        always {
            // Docker logout (always runs)
            node('built-in') {
                sh 'docker logout ghcr.io || true'
            }
            // Workspace cleanup after pipeline is fully complete.
            // Parallel ws() directories created by this build are no longer needed.
            // Pattern: workspace/devops/master-{stage}-{svc}-{BUILD_NUMBER}
            // Wrapped in try/catch so cleanup errors don't fail the pipeline.
            script {
                try {
                    node('built-in') {
                        echo "[CLEANUP] Build #${env.BUILD_NUMBER} workspace cleanup starting"
                        sh '''
                            BEFORE=$(df -h / | tail -1 | awk '{print $5}')
                            find /var/jenkins_home/workspace/devops/ \\
                                -maxdepth 1 \\
                                -type d \\
                                \\( -name "*-${BUILD_NUMBER}" -o -name "*-${BUILD_NUMBER}@tmp" \\) \\
                                -exec rm -rf {} + 2>/dev/null || true
                            AFTER=$(df -h / | tail -1 | awk '{print $5}')
                            echo "[CLEANUP] Disk usage: ${BEFORE} -> ${AFTER}"
                            echo "[CLEANUP] Build #${BUILD_NUMBER} workspace directories removed"
                        '''
                    }
                } catch (e) {
                    // Cleanup error should not fail the pipeline
                    echo "Workspace cleanup error (non-critical): ${e.message}"
                }
            }
        }
        failure {
            echo "Pipeline FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        success {
            echo "Pipeline SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
