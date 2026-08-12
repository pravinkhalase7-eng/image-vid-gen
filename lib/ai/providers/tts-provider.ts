export type TTSRequest = {
  text: string;
  language: string;
  voice: "male" | "female" | "child_friendly";
};

export type TTSResult = {
  path: string;
  durationSeconds: number;
  mimeType: string;
};

export interface TTSProvider {
  readonly name: string;
  readonly model: string;
  synthesize(request: TTSRequest, outputPath: string): Promise<TTSResult>;
}
