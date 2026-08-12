type LogFields = {
  job_id?: string;
  project_id?: string;
  scene_id?: string;
  provider?: string;
  model?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  attempt?: number;
  duration?: number;
};

const SECRET_KEYS = /api[_-]?key|secret|password|token|authorization/i;

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    if (SECRET_KEYS.test(value) || value.length > 500) {
      return value.slice(0, 180);
    }
    return value;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.test(k)) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

export function logJob(event: string, fields: LogFields) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...(sanitize(fields) as LogFields),
    }),
  );
}

export function logError(event: string, error: unknown, fields: LogFields = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      error: message.slice(0, 400),
      ...(sanitize(fields) as LogFields),
    }),
  );
}
