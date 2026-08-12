# Video generation pipeline

## User journey

1. Enter title, topic, script, settings
2. **Create My Video** → safety + analysis + movie plan (cheap)
3. Review plan → **Generate Movie** (expensive, confirmed)
4. Watch scene-by-scene progress
5. Play the assembled film

## Stages

```
SCRIPT
  → SAFETY CLASSIFIER
  → STORY ANALYSIS
  → CHARACTER BIBLE
  → WORLD BIBLE + STYLE BIBLE
  → SCENE BREAKDOWN (5–12 clips, ≥30s total)
  → [user confirms]
  → FOR EACH SCENE:
        prompt build → generateVideos → poll → download → store
        retry ≤ 3 with exponential backoff
  → TTS narration (faithful to user script)
  → background music bed
  → FFmpeg assembly (transitions, ducking, aspect crop)
  → thumbnail
  → COMPLETED
```

## Duration math

Veo 3.1 cannot emit a 30-second clip. The planner:

- Estimates narration length at ~140 words/minute (child-friendly pace)
- Targets the user duration (30 / 60 / 90)
- Splits into clips of **4, 6, or 8 seconds**
- If the script is short: **does not invent plot**. Adds establishing shots, reaction shots, environmental pauses, and slower camera moves.

Minimum assembled length: **30 seconds**.

## Scene generation

Each scene is independent on disk. Failure of scene 4 does not delete scenes 1–3.

Status example:

```
scene_01 completed
scene_02 completed
scene_03 generating
scene_04 pending
```

Regenerate scene N → only that clip + reassemble.

## Prompt construction

`VideoPromptBuilder` is the only place scene prompts are assembled. API routes never concatenate huge strings.

## Assembly

`VideoAssembler` (FFmpeg only):

1. Normalize each clip (scale, fps, duration pad/trim)
2. Concat with optional crossfade
3. Mix: narration 100%, music 12–18% with sidechain ducking, optional Veo ambience at ~20%
4. Write H.264 + AAC MP4
5. Extract poster frame

## Mock mode

`MOCK_VIDEO_GENERATION=true`:

- Heuristic story analysis (no Google calls)
- FFmpeg color/gradient clips with scene titles
- Synthetic narration tone + music bed
- Same job states and UI as production

## Timeouts

Video polling uses `operations.get` every ~10s with heartbeats so a crashed worker can resume. Max 3 attempts per scene.
