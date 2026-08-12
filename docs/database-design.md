# Database design

PostgreSQL via Prisma 7 (`prisma.config.ts` holds `DATABASE_URL`; the schema has no URL).

## Status machine (`VideoProject.status`)

`DRAFT → ANALYZING → PLANNING → READY_TO_GENERATE → GENERATING → ASSEMBLING → COMPLETED`

Failures: `FAILED`. User cancel: `CANCELLED`.

## Core tables

| Model | Purpose |
|---|---|
| `User` | Optional owner (P2 accounts). MVP uses a guest user. |
| `VideoProject` | Title, topic, script, settings, status, style bible, final paths |
| `VideoSettings` | Aspect, resolution, duration, voice, language, style |
| `Story` | Cached analysis (arc, events, emotions, objects, locations) |
| `Character` | Character bible + optional reference still |
| `World` | Environment bible |
| `Scene` | Structured scene JSON + clip paths + start offset |
| `SceneGeneration` | attempt_count, last_error, provider_status, prompt |
| `GenerationJob` | Async job (analyze / generate / regenerate / assemble) |
| `GenerationAttempt` | Per-try log (no secrets) |
| `VideoAsset` / `AudioAsset` | Stored files |

## Caching

Story analysis, character bible, world bible, and scene plan are rows. Regenerating one scene does not re-run analysis.

## Logging fields on jobs

`job_id`, `project_id`, `scene_id`, `provider`, `model`, `status`, `started_at`, `completed_at`, `error`, `attempt`, `duration`. Never API keys or full scripts in logs (script lives on the project row only).
