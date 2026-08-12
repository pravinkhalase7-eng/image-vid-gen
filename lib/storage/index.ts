import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appConfig } from "@/lib/config";

export interface StorageDriver {
  put(key: string, data: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  absolute(key: string): string;
  keyFromAbsolute(abs: string): string;
}

export class LocalStorage implements StorageDriver {
  constructor(private root = appConfig.storage.path) {}

  absolute(key: string) {
    const safe = key.replace(/^\/+/, "").replace(/\.\./g, "");
    return path.resolve(this.root, safe);
  }

  keyFromAbsolute(abs: string) {
    return path.relative(path.resolve(this.root), abs).split(path.sep).join("/");
  }

  async put(key: string, data: Buffer) {
    const abs = this.absolute(key);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, data);
    return this.keyFromAbsolute(abs);
  }

  async read(key: string) {
    return readFile(this.absolute(key));
  }
}

export const storage = new LocalStorage();

export function projectDir(projectId: string) {
  return path.join(appConfig.storage.path, "projects", projectId);
}
