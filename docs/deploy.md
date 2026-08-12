# Deploy to VPS (Jenkins)

This project follows the same Jenkins → Docker Compose pattern as **auto-reader / AI Teacher**.

Jenkins runs **on the same Docker host** as the app. There is no SSH `docker save | docker load` step.

## What Jenkins does

1. Checkout repo
2. Load secrets from Jenkins credential `storymotion-env-file` (optional; default uses `storymotion.env.example`)
3. Build `storymotion-ai` image
4. Run smoke test (`scripts/jenkins_smoke.js`)
5. `docker compose up -d --no-build --force-recreate` on the VPS agent
6. Health-check via `docker exec storymotion-app wget http://127.0.0.1:4000`

## Jenkins setup

1. Install Docker + Docker Compose on the Jenkins agent (or use Jenkins-in-Docker with Docker socket mount — same as auto-reader).
2. Create a Pipeline job pointing at this repo’s `Jenkinsfile`.
3. Create credential (optional until you turn on `USE_ENV_CREDENTIAL`):
   - **Kind:** Secret file
   - **ID:** `storymotion-env-file` (exact)
   - **Contents:** filled copy of [`storymotion.env.example`](../storymotion.env.example)
4. Set in that file:
   - `GOOGLE_AI_API_KEY`
   - `NEXT_PUBLIC_APP_URL=http://187.127.138.86:4000`
5. Run the job. Optional parameters:
   - `SKIP_DEPLOY` — build + smoke only
   - `FORCE_RECREATE` — recreate containers
   - `PUBLIC_APP_URL` — override browser URL for this build (baked into the image)

## After deploy

| Service | URL |
|---------|-----|
| UI | `http://187.127.138.86:4000` |

Port **4000** is required on this VPS. auto-reader already uses 3000 (web) and 8000 (API).

## Manual deploy (without Jenkins)

```bash
cp storymotion.env.example .env
# edit .env — set NEXT_PUBLIC_APP_URL and GOOGLE_AI_API_KEY

export IMAGE_TAG=manual
docker compose build
docker compose up -d
docker compose ps
docker exec storymotion-app wget -qO- http://127.0.0.1:4000
```

## Notes

- `NEXT_PUBLIC_APP_URL` is baked into the **image at build time**. Change it → rebuild (Jenkins does this every run).
- SQLite lives in the `storymotion_data` volume (`file:/data/prod.db`). Clean stage keeps volumes.
- Video generation stays off (`ENABLE_VIDEO_GENERATION=false`).
- Do not bind-mount Jenkins workspace paths into containers when Jenkins runs inside Docker (same constraint as auto-reader).
