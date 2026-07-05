/**
 * Plain, client-safe module — no "server-only", no Prisma imports — so
 * client components (filters, upload dialog, icon map) can share the
 * AssetType union with the server-only asset-data/asset-actions modules
 * without pulling Prisma into the client bundle.
 */
export type AssetType = "Image" | "Video" | "Audio" | "Document";

export const ASSET_TYPES: AssetType[] = ["Image", "Video", "Audio", "Document"];

/** 50MB — shared by the client (pre-flight validation) and the upload route handler (authoritative check). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
