import "server-only";

import { MAX_UPLOAD_BYTES } from "@/lib/asset-types";
import { LocalDiskStorageAdapter } from "@/lib/storage/local-disk-adapter";
import { R2StorageAdapter } from "@/lib/storage/r2-adapter";
import type { StorageAdapter } from "@/lib/storage/types";

export type { StorageAdapter };
export { MAX_UPLOAD_BYTES };

let cachedAdapter: StorageAdapter | null = null;

/**
 * Picks the storage backend from env: R2 (or any S3-compatible bucket)
 * when its credentials are configured, otherwise local disk — the only
 * backend usable in this sandbox, where no real bucket exists. Every
 * caller goes through this instead of constructing an adapter directly,
 * so the rest of the app never branches on which backend is active.
 */
export function getStorageAdapter(): StorageAdapter {
  if (cachedAdapter) return cachedAdapter;
  cachedAdapter = process.env.R2_ACCOUNT_ID ? new R2StorageAdapter() : new LocalDiskStorageAdapter();
  return cachedAdapter;
}
