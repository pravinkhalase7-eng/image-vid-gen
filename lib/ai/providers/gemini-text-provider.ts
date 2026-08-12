import { GoogleGenAI } from "@google/genai";
import { appConfig } from "@/lib/config";
import { parseJson } from "@/lib/ai/json";
import type { TextProvider, TextGenerateJsonOptions } from "./text-provider";

export class GeminiTextProvider implements TextProvider {
  readonly name = "gemini-text";
  readonly model = appConfig.google.textModel;
  private client: GoogleGenAI;

  constructor(apiKey = appConfig.google.apiKey) {
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateJson<T>(options: TextGenerateJsonOptions): Promise<T> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: options.prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
        ...(options.schemaName === "safety"
          ? {
              responseSchema: {
                type: "object",
                properties: {
                  safe: { type: "boolean" },
                  categories: { type: "array", items: { type: "string" } },
                  reason: { type: "string" },
                },
                required: ["safe", "categories", "reason"],
              },
            }
          : {}),
      },
    });
    const text =
      response.text ||
      response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ||
      "";
    if (!text.trim()) {
      throw new Error(`Empty JSON response from ${this.model} (${options.schemaName})`);
    }
    return parseJson<T>(text);
  }
}
