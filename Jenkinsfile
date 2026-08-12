pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 60, unit: 'MINUTES')
  }

  parameters {
    choice(
      name: 'DEPLOY_ENV',
      choices: ['staging', 'production'],
      description: 'Target environment for deploy'
    )
    booleanParam(
      name: 'SKIP_DEPLOY',
      defaultValue: false,
      description: 'Build and test only — skip deploy stage'
    )
    booleanParam(
      name: 'FORCE_RECREATE',
      defaultValue: false,
      description: 'Force recreate containers on deploy'
    )
    string(
      name: 'PUBLIC_APP_URL',
      defaultValue: 'http://187.127.138.86:4000',
      description: 'Browser-facing app URL baked into the web image'
    )
    string(
      name: 'ENV_CREDENTIAL_ID',
      defaultValue: 'storymotion-env-file',
      description: 'Jenkins Secret file credential ID (only used when USE_ENV_CREDENTIAL=true)'
    )
    booleanParam(
      name: 'USE_ENV_CREDENTIAL',
      defaultValue: false,
      description: 'OFF by default. Turn ON only after you create the Jenkins Secret file credential.'
    )
    booleanParam(
      name: 'USE_REPO_ENV_EXAMPLE',
      defaultValue: true,
      description: 'Use storymotion.env.example from the repo when no credential is loaded'
    )
  }

  environment {
    APP_NAME             = 'storymotion'
    APP_IMAGE            = "storymotion-ai:${env.BUILD_NUMBER}"
    APP_IMAGE_LATEST     = 'storymotion-ai:latest'
    COMPOSE_PROJECT_NAME = 'storymotion'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh '''
          echo "Branch: ${GIT_BRANCH:-unknown}"
          echo "Commit: ${GIT_COMMIT:-unknown}"
          git rev-parse --short HEAD || true
          echo "=== Workspace files ==="
          ls -la
          test -f docker-compose.yml || { echo "ERROR: docker-compose.yml missing"; exit 1; }
          test -f Dockerfile || { echo "ERROR: Dockerfile missing"; exit 1; }
          test -f package.json || { echo "ERROR: package.json missing"; exit 1; }
          test -f scripts/jenkins_smoke.js || { echo "ERROR: jenkins_smoke.js missing"; exit 1; }
        '''
      }
    }

    stage('Detect Tools') {
      steps {
        sh '''
          echo "=== Agent tools ==="
          docker --version
          docker compose version
          echo "WORKSPACE=${WORKSPACE}"
          echo "PWD=$(pwd)"
        '''
      }
    }

    stage('Prepare Env') {
      steps {
        script {
          def usedEnv = false
          def credId = (params.ENV_CREDENTIAL_ID ?: 'storymotion-env-file').trim()

          if (params.USE_ENV_CREDENTIAL) {
            withCredentials([file(credentialsId: credId, variable: 'ENV_FILE')]) {
              sh '''
                echo "Secret file path bound: $ENV_FILE"
                test -f "$ENV_FILE" || { echo "ERROR: credential file path missing"; exit 1; }
                cp -f "$ENV_FILE" .env.deploy
                echo "Copied credential file → .env.deploy"
              '''
              usedEnv = true
              echo "Loaded Jenkins credential ID: ${credId}"
            }
          } else {
            echo "USE_ENV_CREDENTIAL=false — skipping Jenkins secret lookup (this is OK)."
          }

          if (!usedEnv) {
            sh '''
              echo "=== Looking for env files ==="
              ls -la storymotion.env.example storymotion.env .env \
                /var/jenkins_home/storymotion.env /var/jenkins_home/secrets/storymotion.env 2>/dev/null || true
            '''
            def candidates = []
            if (params.USE_REPO_ENV_EXAMPLE) {
              candidates.add('storymotion.env.example')
            }
            candidates.addAll([
              'storymotion.env',
              '.env',
              '/var/jenkins_home/secrets/storymotion.env',
              '/var/jenkins_home/storymotion.env',
            ])
            for (p in candidates) {
              if (fileExists(p)) {
                sh "cp -f '${p}' .env.deploy"
                usedEnv = true
                echo "Using env file: ${p} → .env.deploy"
                break
              }
            }
          }

          if (!usedEnv) {
            sh '''
              cat > .env.deploy <<'EOF'
APP_HOST_PORT=4000
GOOGLE_AI_API_KEY=
GEMINI_API_KEY=
GOOGLE_TEXT_MODEL=gemini-3.6-flash
ENABLE_VIDEO_GENERATION=false
MOCK_VIDEO_GENERATION=false
JOB_RUNNER=inline
DATABASE_URL=file:/data/prod.db
STORAGE_PATH=/app/storage
NEXT_PUBLIC_APP_NAME=StoryMotion AI
NEXT_PUBLIC_APP_URL=http://187.127.138.86:4000
EOF
            '''
            usedEnv = true
            echo "Wrote built-in default .env.deploy with VPS IP 187.127.138.86"
          }

          if (params.PUBLIC_APP_URL?.trim()) {
            def url = params.PUBLIC_APP_URL.trim()
            sh """
              if grep -q '^NEXT_PUBLIC_APP_URL=' .env.deploy; then
                sed -i.bak 's|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${url}|' .env.deploy
              else
                echo 'NEXT_PUBLIC_APP_URL=${url}' >> .env.deploy
              fi
              echo "PUBLIC_APP_URL applied: ${url}"
            """
          }

          sh '''
            echo "=== .env.deploy key check (values hidden) ==="
            missing=0
            for key in NEXT_PUBLIC_APP_URL; do
              val=$(grep -E "^${key}=" .env.deploy | head -n1 | cut -d= -f2- || true)
              if [ -n "$val" ]; then
                echo "$key=SET"
              else
                echo "$key=MISSING"
                missing=1
              fi
            done
            app_url=$(grep -E "^NEXT_PUBLIC_APP_URL=" .env.deploy | head -n1 | cut -d= -f2- || true)
            echo "NEXT_PUBLIC_APP_URL value: ${app_url}"
            case "$app_url" in
              *YOUR_VPS_IP*|*your_vps_ip*|*YOUR_DOMAIN*|*your_domain*)
                echo "ERROR: NEXT_PUBLIC_APP_URL still contains a placeholder hostname."
                echo "Set PUBLIC_APP_URL=http://187.127.138.86:4000 and rebuild."
                exit 1
                ;;
            esac
            if [ "$missing" = "1" ] && [ "${SKIP_DEPLOY}" != "true" ]; then
              echo "ERROR: env file is missing required keys (NEXT_PUBLIC_APP_URL)."
              exit 1
            fi
          '''
            echo "Prepared .env.deploy for ${params.DEPLOY_ENV}"
        }
      }
    }

    stage('Clean') {
      steps {
        sh '''
          set +e
          echo "=== Clean previous StoryMotion containers/images (keep sqlite/storage volumes) ==="
          docker compose -f docker-compose.yml down --remove-orphans || true
          docker rm -f storymotion-app 2>/dev/null || true
          docker rmi -f storymotion-ai:latest 2>/dev/null || true
          docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | awk '/^storymotion-ai:/{print $2}' | sort -u | xargs -r docker rmi -f
          echo "=== Remaining storymotion images ==="
          docker images | grep storymotion || echo "(none)"
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          set -e
          set -a
          # shellcheck disable=SC1091
          . ./.env.deploy
          set +a

          echo "Building StoryMotion image (NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL})..."
          docker build \
            --build-arg "NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME:-StoryMotion AI}" \
            --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}" \
            -t ${APP_IMAGE} -t ${APP_IMAGE_LATEST} \
            .

          docker images | grep storymotion | head -n 20 || docker images | head -n 12
        '''
      }
    }

    stage('Smoke Test') {
      steps {
        sh '''
          set -e
          docker run --rm \
            --entrypoint node \
            -e DATABASE_URL=file:./smoke.db \
            -e ENABLE_VIDEO_GENERATION=false \
            ${APP_IMAGE} \
            scripts/jenkins_smoke.js
        '''
      }
    }

    stage('Deploy') {
      when {
        expression { return !params.SKIP_DEPLOY }
      }
      steps {
        sh '''
          set -e
          export IMAGE_TAG=${BUILD_NUMBER}
          export APP_HOST_PORT=${APP_HOST_PORT:-4000}
          cp -f .env.deploy .env

          set -a
          # shellcheck disable=SC1091
          . ./.env
          set +a

          echo "Runtime check: NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY:+SET}"

          echo "Freeing previous StoryMotion containers (if any)..."
          docker compose -f docker-compose.yml down --remove-orphans || true
          docker rm -f storymotion-app 2>/dev/null || true

          free_port() {
            PORT="$1"
            CID="$(docker ps --format '{{.ID}} {{.Ports}}' | awk -v p=":${PORT}->" 'index($0,p){print $1; exit}')"
            if [ -n "$CID" ]; then
              echo "Port ${PORT} is used by container ${CID} — stopping it"
              docker stop "$CID" || true
              docker rm "$CID" || true
            fi
          }
          free_port "${APP_HOST_PORT}"

          echo "Starting stack from the images just built (no compose rebuild)..."
          docker compose -f docker-compose.yml up -d --no-build --force-recreate

          echo "Waiting for app healthy (via docker exec — works with Jenkins-in-Docker)..."
          for i in $(seq 1 45); do
            if docker exec storymotion-app wget -qO- http://127.0.0.1:4000 >/tmp/storymotion_health.html 2>/dev/null; then
              echo "App healthy"
              docker compose -f docker-compose.yml ps
              exit 0
            fi
            STATUS="$(docker inspect -f '{{.State.Health.Status}}' storymotion-app 2>/dev/null || echo unknown)"
            echo "attempt ${i}: health=${STATUS}"
            if [ "$STATUS" = "healthy" ]; then
              docker exec storymotion-app wget -qO- http://127.0.0.1:4000 >/dev/null || true
              echo
              exit 0
            fi
            sleep 3
          done
          echo "App health check failed"
          docker compose -f docker-compose.yml ps || true
          docker compose -f docker-compose.yml logs --tail=120
          exit 1
        '''
      }
    }

    stage('Post-Deploy Check') {
      when {
        expression { return !params.SKIP_DEPLOY }
      }
      steps {
        sh '''
          set -e
          echo "=== Container status ==="
          docker compose -f docker-compose.yml ps || true
          echo "=== App responds ==="
          docker exec storymotion-app wget -qO- http://127.0.0.1:4000 >/tmp/storymotion_web.html 2>/dev/null \
            || docker exec storymotion-app wget -qO- http://127.0.0.1:4000/ >/tmp/storymotion_web.html 2>/dev/null \
            || true
          if [ -s /tmp/storymotion_web.html ]; then
            echo "web_ok bytes=$(wc -c </tmp/storymotion_web.html)"
          else
            echo "WARN: could not fetch HTML from inside container (image may still be starting)"
            docker logs storymotion-app --tail=40 || true
          fi
        '''
      }
    }
  }

  post {
    success {
      echo "StoryMotion ${params.DEPLOY_ENV} build #${env.BUILD_NUMBER} succeeded"
      echo "UI: http://187.127.138.86:4000"
    }
    failure {
      echo "StoryMotion build #${env.BUILD_NUMBER} failed — check stage logs"
      sh 'docker compose -f docker-compose.yml logs --tail=120 || true'
    }
    always {
      sh 'rm -f .env.deploy.bak || true'
    }
  }
}
