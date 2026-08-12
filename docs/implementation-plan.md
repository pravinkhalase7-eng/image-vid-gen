# Implementation plan

## Verified Google APIs (do not invent methods)

- Text: `@google/genai` `models.generateContent` with `responseMimeType: application/json`
- Video: `models.generateVideos` + `operations.get` + `files.download` (Veo 3.1)
- TTS: `models.generateContent` with `responseModalities: ['AUDIO']` and `speechConfig`
- Optional later: Omni Flash `interactions.create` behind the same provider interface

## P0 (this MVP)

1. Create form (title, topic, script, settings)
2. Async analyze → movie plan
3. Confirm generate
4. Scene-by-scene Veo (or mock) generation with retries
5. FFmpeg assembly ≥ 30s
6. Player + progress UI + friendly errors
7. `MOCK_VIDEO_GENERATION=true`

## P1 included

Character/world bibles in every prompt, narration, music + ducking, scene regenerate, 16:9 / 9:16 / 1:1 (crop), project library, thumbnails.

## P2 deferred

Auth, sharing, templates, extra animation styles as first-class pipelines, advanced timeline editing.

## Run locally

```bash
cp .env.example .env
docker compose up -d
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000 — mock mode is on by default.
