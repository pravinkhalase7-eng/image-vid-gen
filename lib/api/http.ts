import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { logError } from "@/lib/logging";

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.userMessage ?? error.message } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "invalid", message: "Please check the title, topic, and story, then try again." } },
      { status: 400 },
    );
  }

  const raw = error instanceof Error ? error.message : String(error);

  if (/not a constructor|GOOGLE_AI_API_KEY is not configured/i.test(raw)) {
    return NextResponse.json(
      {
        error: {
          code: "ai_config",
          message: "Google AI isn't configured correctly. Check GOOGLE_AI_API_KEY in .env and restart the studio.",
        },
      },
      { status: 500 },
    );
  }

  if (/no longer available|NOT_FOUND|is not found/i.test(raw)) {
    return NextResponse.json(
      {
        error: {
          code: "ai_model",
          message: "That Google AI model isn't available on your key. Try Create again — the studio now uses a current model.",
        },
      },
      { status: 502 },
    );
  }

  if (/database|sqlite|ECONNREFUSED|does not exist|P1001|P2021|P2022/i.test(raw)) {
    return NextResponse.json(
      {
        error: {
          code: "database",
          message: "The studio database isn't ready yet. Please wait a moment and refresh.",
        },
      },
      { status: 503 },
    );
  }

  logError("api", error);
  return NextResponse.json(
    { error: { code: "internal", message: "Something unexpected happened. Please try again in a moment." } },
    { status: 500 },
  );
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
