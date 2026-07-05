/** Shared return shape for every Server Action in the app. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: "forbidden" | "not_found" | "invalid" | "conflict" };
