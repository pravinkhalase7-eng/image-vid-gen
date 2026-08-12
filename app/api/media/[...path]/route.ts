import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { storage } from "@/lib/storage";
import type { MediaRoute } from "@/lib/api/context";

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_req: Request, ctx: MediaRoute) {
  const { path: parts } = await ctx.params;
  const key = parts.join("/");
  const abs = storage.absolute(key);
  try {
    await stat(abs);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const data = await readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
