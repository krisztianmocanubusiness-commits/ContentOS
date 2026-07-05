import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { StorageAdapter } from "@/lib/storage/types";

// turbopackIgnore comments below stop Turbopack's file tracer from
// following this dev-only path and bundling the whole project — this
// resolves purely to a directory path, never a module to load.
const ROOT = path.resolve(
  process.env.LOCAL_STORAGE_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".storage")
);

/** Resolves a key to an absolute path, rejecting anything that would escape ROOT (e.g. via "../"). */
function resolvePath(key: string): string {
  const resolved = path.resolve(ROOT, key);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

/**
 * Default backend for local dev and this sandbox, where no real bucket
 * credentials exist. Same interface as the R2 adapter, so switching to a
 * real bucket in another environment is just setting env vars (see
 * src/lib/storage/index.ts) — no application code changes.
 */
export class LocalDiskStorageAdapter implements StorageAdapter {
  async put(key: string, data: Buffer): Promise<{ byteSize: number }> {
    const filePath = resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return { byteSize: data.byteLength };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(resolvePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(resolvePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}
