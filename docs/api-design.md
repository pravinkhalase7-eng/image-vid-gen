# API design

All routes are Next.js Route Handlers. Long work is a job. Responses never include credentials.

## Projects

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/projects` | Create project, enqueue ANALYZE, return `{ job_id, project_id, status }` |
| `GET` | `/api/projects` | Library list |
| `GET` | `/api/projects/:id` | Full project (plan, characters, scenes, status) |
| `PATCH` | `/api/projects/:id` | Edit title/topic/script/settings while not generating |
| `POST` | `/api/projects/:id/analyze` | Re-run analysis |
| `GET` | `/api/projects/:id/plan` | Movie plan |
| `PATCH` | `/api/projects/:id/plan` | Edit plan (titles/durations) before generate |
| `POST` | `/api/projects/:id/generate` | Confirm and enqueue GENERATE |
| `GET` | `/api/projects/:id/status` | Poll-friendly progress payload |
| `POST` | `/api/projects/:id/cancel` | Cancel running job |
| `GET` | `/api/projects/:id/video` | Final video metadata + media URL |
| `GET` | `/api/projects/:id/scenes` | Scene list |
| `POST` | `/api/projects/:id/scenes/:sceneId/regenerate` | One scene + reassemble |
| `POST` | `/api/projects/:id/retry` | Retry failed job from last incomplete scene |

## Media

`GET /api/media/[...path]` streams files from the storage driver.

## Errors

JSON `{ error: { code, message } }` with **friendly** `message`. HTTP 400 validation, 404 missing, 409 duplicate generate, 422 unsafe script.
