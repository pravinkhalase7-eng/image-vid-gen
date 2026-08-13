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
      description: 'Jenkins Secret file credential ID. Must match Manage Jenkins → Credentials → ID (not the uploaded filename).'
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
          test -f scripts/export_env.sh || { echo "ERROR: export_env.sh missing"; exit 1; }
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
          def credIds = []
          def paramId = (params.ENV_CREDENTIAL_ID ?: 'storymotion-env-file').trim()
          credIds.add(paramId)
          ['storymotion-env-file', 'storymotion-env-file.env'].each { id ->
            if (!credIds.contains(id)) {
              credIds.add(id)
            }
          }

          for (id in credIds) {
            if (usedEnv) {
              break
            }
            try {
              withCredentials([file(credentialsId: id, variable: 'ENV_FILE')]) {
                sh '''
                  echo "Secret file path bound: $ENV_FILE"
                  test -f "$ENV_FILE" || { echo "ERROR: credential file path missing"; exit 1; }
                  cp -f "$ENV_FILE" .env.deploy
                  echo "Copied Jenkins secret file → .env.deploy"
                '''
                usedEnv = true
              }
              echo "Loaded Jenkins credential ID: ${id}"
            } catch (err) {
              echo "Could not load credential ${id}: ${err}"
            }
          }

          if (!usedEnv) {
            sh '''
              echo "=== Looking for fallback env files (not leftover workspace .env) ==="
              ls -la /var/jenkins_home/secrets/storymotion.env /var/jenkins_home/storymotion.env storymotion.env 2>/dev/null || true
            '''
            def candidates = [
              '/var/jenkins_home/secrets/storymotion.env',
              '/var/jenkins_home/storymotion.env',
              'storymotion.env',
            ]
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
            error('''No env source found.
Create Jenkins credential:
  Kind: Secret file
  ID: storymotion-env-file
  Scope: Global
  File contents: copy of storymotion.env.example with GOOGLE_AI_API_KEY filled in
The credential ID is the ID field in Jenkins — not the uploaded filename (storymotion-env-file.env).
Then rebuild.''')
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
            set -e
            # Accept common aliases people put in Google Cloud / Jenkins files
            if ! grep -qE '^GOOGLE_AI_API_KEY=.+' .env.deploy; then
              alias_val=$(grep -E '^(GEMINI_API_KEY|GOOGLE_API_KEY)=' .env.deploy | head -n1 | cut -d= -f2- || true)
              alias_val=$(printf '%s' "$alias_val" | tr -d '"' | tr -d "'" | tr -d '\\r' | tr -d ' ')
              if [ -n "$alias_val" ]; then
                if grep -q '^GOOGLE_AI_API_KEY=' .env.deploy; then
                  sed -i.bak "s|^GOOGLE_AI_API_KEY=.*|GOOGLE_AI_API_KEY=${alias_val}|" .env.deploy
                else
                  echo "GOOGLE_AI_API_KEY=${alias_val}" >> .env.deploy
                fi
                echo "Copied GEMINI_API_KEY/GOOGLE_API_KEY → GOOGLE_AI_API_KEY"
              fi
            fi

            echo "=== .env.deploy key check (values hidden) ==="
            google=$(grep -E '^GOOGLE_AI_API_KEY=' .env.deploy | head -n1 | cut -d= -f2- || true)
            google=$(printf '%s' "$google" | tr -d '"' | tr -d "'" | tr -d '\\r' | tr -d ' ')
            if [ -n "$google" ]; then
              echo "GOOGLE_AI_API_KEY=SET"
            else
              echo "GOOGLE_AI_API_KEY=MISSING"
              echo "ERROR: the Jenkins secret file was loaded but GOOGLE_AI_API_KEY is empty."
              echo "Edit the secret file so it contains: GOOGLE_AI_API_KEY=your_gemini_key"
              echo "Credential ID must be storymotion-env-file (or set ENV_CREDENTIAL_ID to match)."
              exit 1
            fi
            app_url=$(grep -E '^NEXT_PUBLIC_APP_URL=' .env.deploy | head -n1 | cut -d= -f2- || true)
            echo "NEXT_PUBLIC_APP_URL value: ${app_url}"
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
          # shellcheck disable=SC1091
          . ./scripts/export_env.sh
          load_env ./.env.deploy

          APP_NAME="${NEXT_PUBLIC_APP_NAME:-StoryMotion AI}"
          APP_URL="${NEXT_PUBLIC_APP_URL}"
          echo "Building StoryMotion image (NEXT_PUBLIC_APP_URL=${APP_URL})..."
          docker build \
            --build-arg NEXT_PUBLIC_APP_NAME="${APP_NAME}" \
            --build-arg NEXT_PUBLIC_APP_URL="${APP_URL}" \
            -t "${APP_IMAGE}" -t "${APP_IMAGE_LATEST}" \
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

          # shellcheck disable=SC1091
          . ./scripts/export_env.sh
          load_env ./.env

          echo "Runtime check: NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY:+SET}"
          if [ -z "${GOOGLE_AI_API_KEY}" ] && [ -z "${GEMINI_API_KEY}" ]; then
            echo "ERROR: GOOGLE_AI_API_KEY is empty after loading .env — refusing to deploy"
            exit 1
          fi

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
          echo "=== Google key present inside container (value hidden) ==="
          docker exec storymotion-app sh -c 'if [ -n "$GOOGLE_AI_API_KEY" ] || [ -n "$GEMINI_API_KEY" ]; then echo google_key=SET; else echo google_key=MISSING; exit 1; fi'
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
