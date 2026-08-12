# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_NAME="StoryMotion AI"
ARG NEXT_PUBLIC_APP_URL="http://localhost:4000"
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV DATABASE_URL="file:./prisma/build.db"
ENV MOCK_VIDEO_GENERATION="true"
ENV ENABLE_VIDEO_GENERATION="false"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/data/prod.db"
ENV STORAGE_PATH="/app/storage"
ENV ENABLE_VIDEO_GENERATION="false"
ENV MOCK_VIDEO_GENERATION="false"
ENV JOB_RUNNER="inline"

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data /app/storage

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder /app/scripts/jenkins_smoke.js ./scripts/jenkins_smoke.js
RUN chmod +x ./scripts/docker-entrypoint.sh

EXPOSE 4000
CMD ["./scripts/docker-entrypoint.sh"]
