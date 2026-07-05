/**
 * Storage backends only ever see opaque keys and bytes — no workspace or
 * asset business logic. Content-Type/name/size live in the Asset row,
 * not here, so swapping backends never touches the DB schema.
 */
export interface StorageAdapter {
  put(key: string, data: Buffer): Promise<{ byteSize: number }>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}
