import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_ROOT = path.join(process.cwd(), `.storage-test-${randomUUID()}`);
process.env.LOCAL_STORAGE_DIR = TEST_ROOT;

const { LocalDiskStorageAdapter } = await import("@/lib/storage/local-disk-adapter");

afterAll(async () => {
  delete process.env.LOCAL_STORAGE_DIR;
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

describe("LocalDiskStorageAdapter", () => {
  it("round-trips bytes through put/get", async () => {
    const adapter = new LocalDiskStorageAdapter();
    const key = `${randomUUID()}/original`;
    const data = Buffer.from("hello asset bytes");

    const result = await adapter.put(key, data);
    expect(result.byteSize).toBe(data.byteLength);

    const read = await adapter.get(key);
    expect(read?.toString()).toBe("hello asset bytes");
  });

  it("returns null for a key that was never written", async () => {
    const adapter = new LocalDiskStorageAdapter();
    const read = await adapter.get(`${randomUUID()}/missing`);
    expect(read).toBeNull();
  });

  it("delete is idempotent — deleting a missing key doesn't throw", async () => {
    const adapter = new LocalDiskStorageAdapter();
    await expect(adapter.delete(`${randomUUID()}/never-existed`)).resolves.toBeUndefined();
  });

  it("delete removes the object so a later get returns null", async () => {
    const adapter = new LocalDiskStorageAdapter();
    const key = `${randomUUID()}/original`;
    await adapter.put(key, Buffer.from("bye"));
    await adapter.delete(key);
    const read = await adapter.get(key);
    expect(read).toBeNull();
  });

  it("rejects a key that would escape the storage root", async () => {
    const adapter = new LocalDiskStorageAdapter();
    await expect(adapter.put("../../etc/passwd", Buffer.from("x"))).rejects.toThrow(/Invalid storage key/);
  });
});
