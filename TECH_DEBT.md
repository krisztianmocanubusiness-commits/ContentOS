# Technical Debt Register

Known gaps and stopgaps, called out explicitly rather than left silent.
Each entry says what's missing, why it's acceptable for now, and what
closing it would take. Cross-referenced from `PRODUCT_ROADMAP.md` where
the debt was introduced.

## No invite-acceptance / set-password flow

**Introduced:** Team migration (Server Components + Prisma).

`WorkspaceMembership.userId` is a required, non-nullable foreign key to
`User` — there's no `Invitation` model and no nullable "invited email"
field in the schema. So `inviteMemberAction` (`src/lib/team-actions.ts`)
always creates a real `User` row for a brand-new email, with a random,
never-communicated password hash (`bcrypt.hash(randomUUID(), 10)`). That
account exists in the database but nobody can log into it — there's no
email sent, no accept-invite link, and no password-set page.

This mirrors how the seed data already modeled "Invited" members (a real
`User` row with a placeholder password), so it's a pre-existing shape,
not a new inconsistency — but it's still a real product gap: today,
inviting someone by email creates an account they can never actually use
on their own.

**Closing it:** an `Invitation` token flow (or a nullable-password state
on `User` plus a `/accept-invite/[token]` route) that lets a new invitee
set their own password and flips `WorkspaceMembership.status` from
`Invited` to `Active`, plus actually sending the invite email.

## In-memory rate limiting

**Introduced:** Phase 0 (security hardening).

`src/lib/rate-limit.ts` rate-limits signup and login in-process. This
works for a single server instance but resets on restart and doesn't
coordinate across multiple instances — not safe once the app runs behind
a load balancer with more than one process.

**Closing it:** move to a shared store (Redis or equivalent) keyed the
same way, swapping the implementation behind the same call sites.

## Self-role-edit is blocked entirely, not just the dangerous cases

**Introduced:** Team migration (Server Components + Prisma).

`changeRoleAction` and `removeMemberAction` block a caller from changing
their own role or removing themselves, full stop — even an Owner with
several co-owners can't step down through this UI; a teammate has to do
it for them. This was a deliberate simplification (see the Team entry in
`PRODUCT_ROADMAP.md`): it's stricter than strictly necessary (only the
last-Owner case is truly dangerous), but it's simple, easy to reason
about, and avoids a class of "I locked myself out" support requests.

**Closing it, if ever wanted:** allow self-demotion when the caller isn't
the sole remaining Owner, using the same `Serializable`-transaction
final-owner check already in place — the guard-rail logic doesn't change,
just who's allowed to trigger it on themselves.

## Asset bytes are proxied through the app server, not served from a CDN

**Introduced:** Assets migration (object storage).

Both upload (`POST /api/assets/[workspaceSlug]/upload`) and download/
preview (`GET /api/assets/file/[assetId]`, `.../thumbnail/[assetId]`) go
through this app's own Route Handlers rather than a presigned direct-to-
bucket flow. The upload handler reads the whole file into memory
(`Buffer.from(await file.arrayBuffer())`) before handing it to the
storage adapter, capped at 50MB (`MAX_UPLOAD_BYTES` in
`src/lib/asset-types.ts`). This was a deliberate simplification: it
works identically for both the local-disk backend (this sandbox/dev) and
real R2, needs no CSP changes (everything is same-origin), and keeps the
bucket private (every read re-checks workspace membership) — but it
means every asset byte transits this server's memory and bandwidth
instead of going straight to/from the bucket or a CDN in front of it.

**Closing it:** for uploads, a presigned PUT URL flow (a small Server
Action returns a short-lived signed URL, the client `fetch`s the bucket
directly) removes the body-size ceiling and the server-side buffering.
For reads, presigned GET URLs or a CDN in front of a public (or
signed-URL-gated) bucket removes the proxy hop — either needs `img-src`/
`connect-src` widened in `next.config.ts`'s CSP to the bucket/CDN origin,
which the current same-origin approach avoids needing.

## No retention policy for trashed (soft-deleted) assets

**Introduced:** Assets migration (soft-delete/Trash).

`deleteAssetAction` flips `Asset.status` to `Deleted` and nothing else —
the underlying storage object is never removed, and there's no job that
permanently purges old trashed assets or their files. Trash can
accumulate indefinitely; storage cost grows even for content nobody will
ever restore.

**Closing it:** a scheduled job that hard-deletes `Asset` rows (and
calls the storage adapter's `delete`) past some retention window (e.g.
30 days in `Deleted` status), plus a "delete forever" action in the
Trash UI for anyone who wants it sooner.
