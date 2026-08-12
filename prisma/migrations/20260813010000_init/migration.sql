-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "video_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'auto',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "actual_duration" REAL,
    "aspect_ratio" TEXT NOT NULL DEFAULT '16:9',
    "resolution" TEXT NOT NULL DEFAULT '720p',
    "style" TEXT NOT NULL DEFAULT 'cinematic_3d',
    "voice" TEXT NOT NULL DEFAULT 'child_friendly',
    "enable_narration" BOOLEAN NOT NULL DEFAULT true,
    "enable_music" BOOLEAN NOT NULL DEFAULT true,
    "style_bible" TEXT,
    "estimated_scenes" INTEGER,
    "thumbnail_path" TEXT,
    "final_video_path" TEXT,
    "error_message" TEXT,
    "safety_result" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "video_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "aspect_ratio" TEXT NOT NULL DEFAULT '16:9',
    "resolution" TEXT NOT NULL DEFAULT '720p',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "voice" TEXT NOT NULL DEFAULT 'child_friendly',
    "language" TEXT NOT NULL DEFAULT 'auto',
    "style" TEXT NOT NULL DEFAULT 'cinematic_3d',
    "enable_narration" BOOLEAN NOT NULL DEFAULT true,
    "enable_music" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "video_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "story_arc" JSONB NOT NULL,
    "events" JSONB NOT NULL,
    "emotions" JSONB NOT NULL,
    "objects" JSONB NOT NULL,
    "locations" JSONB NOT NULL,
    "analysis_json" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "appearance" TEXT NOT NULL,
    "clothing" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "visual_features" JSONB NOT NULL,
    "reference_image_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "characters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "worlds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "color_palette" JSONB NOT NULL,
    "lighting" TEXT NOT NULL,
    "time_of_day" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "background_elements" JSONB NOT NULL,
    "bible" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worlds_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "scene_key" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "script_segment" TEXT NOT NULL,
    "narration" TEXT NOT NULL,
    "character_slugs" JSONB NOT NULL,
    "location" TEXT NOT NULL,
    "time_of_day" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "visual_prompt" TEXT NOT NULL,
    "camera" TEXT NOT NULL,
    "transition" TEXT NOT NULL,
    "shot_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "video_path" TEXT,
    "thumbnail_path" TEXT,
    "start_offset" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scenes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scene_generations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scene_id" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "provider_status" TEXT,
    "provider_job_id" TEXT,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scene_generations_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "scene_id" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "error" TEXT,
    "heartbeat_at" DATETIME,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "generation_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generation_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT,
    "scene_generation_id" TEXT,
    "attempt" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "error" TEXT,
    "duration_ms" INTEGER,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "generation_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "generation_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "generation_attempts_scene_generation_id_fkey" FOREIGN KEY ("scene_generation_id") REFERENCES "scene_generations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration" REAL,
    "scene_id" TEXT,
    "metadata" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audio_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration" REAL,
    "metadata" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audio_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "video_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "video_projects_status_created_at_idx" ON "video_projects"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "video_settings_project_id_key" ON "video_settings"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "stories_project_id_key" ON "stories"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "characters_project_id_slug_key" ON "characters"("project_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "worlds_project_id_key" ON "worlds"("project_id");

-- CreateIndex
CREATE INDEX "scenes_project_id_order_index_idx" ON "scenes"("project_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_project_id_scene_key_key" ON "scenes"("project_id", "scene_key");

-- CreateIndex
CREATE INDEX "generation_jobs_status_created_at_idx" ON "generation_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "generation_jobs_project_id_type_idx" ON "generation_jobs"("project_id", "type");

-- CreateIndex
CREATE INDEX "video_assets_project_id_kind_idx" ON "video_assets"("project_id", "kind");

-- CreateIndex
CREATE INDEX "audio_assets_project_id_kind_idx" ON "audio_assets"("project_id", "kind");

