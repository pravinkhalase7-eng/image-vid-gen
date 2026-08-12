# StoryMotion AI

Turn a kids' story into a cinematic animated movie.

Title + topic + script → story analysis → movie plan → Google Veo scene generation → FFmpeg assembly → player.

## Quick start (mock mode, no API credits)

```bash
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:4000](http://localhost:4000).

## VPS deploy (Jenkins + Docker)

Same pattern as auto-reader: Jenkins runs on the VPS, builds the image, then `docker compose up` on that host. Port **4000** (do not use 3000 — auto-reader already binds it).

1. Copy `storymotion.env.example` to a Jenkins Secret file (`storymotion-env-file`) or keep `USE_REPO_ENV_EXAMPLE=true`.
2. Set `NEXT_PUBLIC_APP_URL=http://187.127.138.86:4000` (or your domain).
3. Run the Jenkins pipeline. Stages: Checkout → Detect Tools → Prepare Env → Clean → Docker Build → Smoke Test → Deploy → Post-Deploy Check.

`MOCK_VIDEO_GENERATION=true` is the default. The full pipeline runs with generated placeholder clips so you can test the studio without Google credits.

## Live Google generation

1. Create a Gemini API key.
2. Set in `.env`:

```
MOCK_VIDEO_GENERATION=false
GOOGLE_AI_API_KEY=...
GOOGLE_VIDEO_MODEL=veo-3.1-fast-generate-preview
GOOGLE_TEXT_MODEL=gemini-3.6-flash
GOOGLE_TTS_MODEL=gemini-3.1-flash-tts-preview
```

3. Restart `npm run dev`.

Verified APIs (do not invent methods):

- Text: `models.generateContent` with JSON mime type
- Video: `models.generateVideos` → `operations.get` → `files.download` (Veo 3.1, **4/6/8 second clips**)
- Speech: `models.generateContent` with `responseModalities: ['AUDIO']`

A 30-second film is **multiple clips concatenated with FFmpeg**. Veo does not emit a 30s clip in one call.

**Casting note:** Veo blocks photorealistic children. Prompts require stylized animal/fantasy characters.

## Architecture

See `docs/architecture.md`, `docs/video-generation-pipeline.md`, and `docs/deploy.md`.

Jobs are Postgres-backed. `instrumentation.ts` starts an in-process worker. For production, run:

```bash
npm run worker
```

with `JOB_RUNNER=worker`.

## Tests

```bash
npm test
```
