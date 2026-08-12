pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    string(name: 'IMAGE_NAME', defaultValue: 'storymotion-ai', description: 'Docker image name')
    string(name: 'APP_PORT', defaultValue: '4000', description: 'Host port mapped to the container')
    string(name: 'APP_URL', defaultValue: 'http://YOUR_VPS_IP:4000', description: 'Public URL baked into NEXT_PUBLIC_APP_URL')
    string(name: 'APP_NAME', defaultValue: 'StoryMotion AI', description: 'Public app name')
    string(name: 'VPS_HOST', defaultValue: '', description: 'VPS hostname or IP')
    string(name: 'VPS_USER', defaultValue: 'deploy', description: 'SSH user on the VPS')
    string(name: 'VPS_APP_DIR', defaultValue: '/opt/storymotion', description: 'App directory on the VPS')
    string(name: 'SSH_CREDENTIALS_ID', defaultValue: 'vps-ssh', description: 'Jenkins SSH username-with-private-key credential ID')
    booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run unit tests before building the image')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy the image to the VPS after a successful build')
  }

  environment {
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    COMPOSE_FILE = 'docker-compose.prod.yml'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      when {
        expression { return params.RUN_TESTS }
      }
      steps {
        sh '''
          set -eu
          docker build --target test -t ${IMAGE_NAME}:test-${IMAGE_TAG} .
        '''
      }
    }

    stage('Build image') {
      steps {
        sh '''
          set -eu
          docker build \
            --build-arg NEXT_PUBLIC_APP_NAME="${APP_NAME}" \
            --build-arg NEXT_PUBLIC_APP_URL="${APP_URL}" \
            -t ${IMAGE_NAME}:${IMAGE_TAG} \
            -t ${IMAGE_NAME}:latest \
            .
        '''
      }
    }

    stage('Deploy to VPS') {
      when {
        expression { return params.DEPLOY }
      }
      steps {
        script {
          if (!params.VPS_HOST?.trim()) {
            error('Set VPS_HOST (and SSH credentials) before deploying.')
          }
        }
        sshagent(credentials: [params.SSH_CREDENTIALS_ID]) {
          sh '''
            set -eu
            ssh -o StrictHostKeyChecking=accept-new ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_APP_DIR}"
            scp -o StrictHostKeyChecking=accept-new ${COMPOSE_FILE} ${VPS_USER}@${VPS_HOST}:${VPS_APP_DIR}/${COMPOSE_FILE}

            ssh -o StrictHostKeyChecking=accept-new ${VPS_USER}@${VPS_HOST} "
              set -eu
              cd ${VPS_APP_DIR}
              if [ ! -f .env ]; then
                cat > .env <<EOF
GOOGLE_AI_API_KEY=
GEMINI_API_KEY=
GOOGLE_TEXT_MODEL=gemini-3.6-flash
ENABLE_VIDEO_GENERATION=false
MOCK_VIDEO_GENERATION=false
JOB_RUNNER=inline
STORAGE_DRIVER=local
STORAGE_PATH=/app/storage
DATABASE_URL=file:/data/prod.db
NEXT_PUBLIC_APP_NAME=${APP_NAME}
NEXT_PUBLIC_APP_URL=${APP_URL}
EOF
                echo 'Created ${VPS_APP_DIR}/.env — add GOOGLE_AI_API_KEY on the VPS before the first request.'
              fi
            "

            echo "Copying image ${IMAGE_NAME}:${IMAGE_TAG} to ${VPS_HOST}..."
            docker save ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest | gzip | ssh -o StrictHostKeyChecking=accept-new ${VPS_USER}@${VPS_HOST} "gunzip | docker load"

            ssh -o StrictHostKeyChecking=accept-new ${VPS_USER}@${VPS_HOST} "
              set -eu
              cd ${VPS_APP_DIR}
              export STORYMOTION_IMAGE=${IMAGE_NAME}:${IMAGE_TAG}
              export APP_PORT=${APP_PORT}
              export NEXT_PUBLIC_APP_URL=${APP_URL}
              export NEXT_PUBLIC_APP_NAME='${APP_NAME}'
              docker compose -f ${COMPOSE_FILE} up -d --remove-orphans
              docker image prune -f
              docker compose -f ${COMPOSE_FILE} ps
            "
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Build ${IMAGE_TAG} succeeded. App should be at ${params.APP_URL}"
    }
    failure {
      echo 'Build or deploy failed. Check the stage logs above.'
    }
  }
}
