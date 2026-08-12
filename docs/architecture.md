# Architecture

StoryMotion AI turns a children's story (title, topic, script) into a cinematic animated video. The product hides the pipeline. The architecture keeps video generation replaceable.

## Goals

- Title + topic + script → analyzed movie plan → generated scenes → assembled film → player
- Never block the browser on video generation
- Never expose API keys to the client
- Survive scene failures without losing completed work
- Run fully in mock mode without Google credits
- Allow the worker to move to a separate Python service later

## System overview

```
Browser (Next.js App Router)
    │  POST /api/projects  → job_id
    │  GET  /api/projects/:id/status  (poll)
    ▼
Next.js Route Handlers
    │  enqueue job (PostgreSQL)
    │  after() / instrumentation starts worker
    ▼
Job Worker (Node, same repo)
    │  ANALYZE → GENERATE → ASSEMBLE
    ▼
Provider abstractions
    ├── TextProvider      (Gemini structured JSON)
    ├── VideoGenerationProvider  (Veo / mock)
    ├── TTSProvider       (Gemini TTS / mock)
    └── MusicProvider     (library / generated bed)
    ▼
Storage abstraction (local now, GCS/S3 later)
    ▼
FFmpeg VideoAssembler + audio ducking
    ▼
PostgreSQL (Prisma)  — source of truth for job/project state
```

## Runtime processes

| Process | Role |
|---|---|
| `next dev` / `next start` | UI + APIs. In `JOB_RUNNER=inline`, also runs the in-process worker. |
| `npm run worker` | Dedicated poller. Use in production or when generation exceeds HTTP timeouts. |
| `postgres` | Job status, bibles, scenes, assets. |

A Python FastAPI worker is **not** required for the MVP. The Node worker already isolates provider + FFmpeg logic behind interfaces. A future `services/video-worker` can implement the same `VideoGenerationProvider` contract.

## Provider abstraction

`VideoGenerationProvider` is the only module that talks to Google video APIs.

Verified against official Gemini docs (August 2026):

| Capability | Source of truth |
|---|---|
| Video models | Veo 3.1 via `client.models.generateVideos` (`veo-3.1-fast-generate-preview`, `veo-3.1-generate-preview`). Gemini Omni Flash (`gemini-omni-flash-preview`) via Interactions API is an alternative. |
| Clip duration | Veo 3.1: **4, 6, or 8 seconds** per generation. Omni Flash: 3–10s. A 30s+ film is **N clips + FFmpeg concat**. |
| Aspect ratio | Native **16:9** and **9:16**. **1:1 is cropped in FFmpeg** from 16:9. |
| Resolution | 720p and 1080p (model-dependent). |
| Audio | Veo 3.1 can emit native audio. Kids narration is still generated with Gemini TTS and mixed so the script stays audible. |
| Consistency | Character/world bibles in every prompt. Optional reference images when `ENABLE_CHARACTER_REFERENCES=true`. |
| People | Veo blocks generation of children. Prompts require **stylized animal / fantasy characters**, never photorealistic kids. |
| Auth | `GOOGLE_AI_API_KEY` / `GEMINI_API_KEY` server-side only. |

Model IDs are env-configurable. Nothing obsolete is hard-coded as the only option.

## Job queue

`JobQueue` is an interface. `DatabaseJobQueue` is the MVP implementation (Postgres row + `QUEUED`/`RUNNING` claim).

The same interface can later be backed by:

- Redis lists
- Google Cloud Tasks
- Celery
- Pub/Sub

Claiming is optimistic: `UPDATE ... WHERE status = QUEUED`. Stale `RUNNING` jobs (missed heartbeat) are re-queued.

## Storage

`StorageDriver` writes/reads bytes by key.

- `local` → `./storage` (gitignored), served by `/api/media/...`
- `gcs` / `s3` stubs are ready; implement when buckets are configured

## Safety

Before any video call, the script is classified. Unsafe stories never reach Veo. The UI shows: *This story isn't suitable for our kids' video generator.*

## Consistency strategy

Every scene prompt includes:

1. Global style bible
2. Character bible (appearance, clothing, accessories)
3. World bible (palette, lighting, time of day)
4. Previous scene context
5. Current scene
6. Next scene intent
7. Story fidelity rules
8. Camera / lighting / motion

Completed scenes are never regenerated unless the user asks.

## What stays out of the browser

- API keys
- Provider payloads
- FFmpeg
- Raw error stacks (mapped to friendly copy)
