# StoryMotion AI

Turn a kids' story into a cinematic animated movie.

Title + topic + script → story analysis → movie plan → Google Veo scene generation → FFmpeg assembly → player.

## Quick start (mock mode, no API credits)

```bash
cp .env.example .env
docker compose up -d
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

See `docs/architecture.md` and `docs/video-generation-pipeline.md`.

Jobs are Postgres-backed. `instrumentation.ts` starts an in-process worker. For production, run:

```bash
npm run worker
```

with `JOB_RUNNER=worker`.

## Tests

```bash
npm test
```
