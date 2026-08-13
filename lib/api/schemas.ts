import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1).max(120),
  topic: z.string().min(1).max(200),
  script: z.string().min(1).max(12000),
  language: z.string().default("auto"),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  resolution: z.enum(["720p", "1080p"]).default("720p"),
  duration: z.union([z.literal(0), z.literal(30), z.literal(60), z.literal(90)]).default(0),
  sceneCount: z.number().int().min(0).max(8).default(0),
  voice: z.enum(["male", "female", "child_friendly"]).default("child_friendly"),
  style: z.enum(["cinematic_3d", "watercolor", "storybook", "educational"]).default("cinematic_3d"),
  enableNarration: z.boolean().default(true),
  enableMusic: z.boolean().default(true),
});

export const generateSchema = z.object({
  confirm: z.literal(true),
});
