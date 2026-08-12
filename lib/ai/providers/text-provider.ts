import type { SafetyVerdict, StoryAnalysis, CharacterBible, WorldBible, PlannedScene } from "@/lib/ai/types";

export type TextGenerateJsonOptions = {
  prompt: string;
  schemaName: string;
};

export interface TextProvider {
  readonly name: string;
  readonly model: string;
  generateJson<T>(options: TextGenerateJsonOptions): Promise<T>;
}

export type AnalyzeBundle = {
  safety: SafetyVerdict;
  story: StoryAnalysis;
  characters: CharacterBible[];
  world: WorldBible;
  styleBible: string;
  scenes: PlannedScene[];
};
