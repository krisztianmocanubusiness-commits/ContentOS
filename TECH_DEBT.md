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

## Social account OAuth is fully simulated

**Introduced:** Social Accounts migration.

There is no real OAuth integration with any platform. `connectAccountAction`
and `reconnectAccountAction` (`src/lib/social-account-actions.ts`)
populate `SocialAccount.scopes` and `tokenExpiresAt` with plausible fake
values (a fixed scope list, a 60-day expiry) instead of performing a
real provider handshake — no redirect to TikTok/Instagram/YouTube/X/
Facebook/Threads/LinkedIn/Pinterest ever happens, and `followersLabel`
is never actually synced from a real API (it's `"0"` on connect and
never updates itself). `simulateConnectionIssueAction` exists
specifically because there's no real webhook or health check that could
ever organically flip an account to `NeedsReauth`.

This is a deliberate, explicit scope boundary for this migration (per
its own requirements: "keep OAuth mocked/simulated unless real platform
APIs already exist") — the schema (`displayName`/`avatarUrl`/`scopes`/
`tokenExpiresAt`/`status`) already matches what a real integration would
store, so wiring in a real provider later is additive, not a rewrite.

**Closing it:** for each platform, a real OAuth 2.0 flow (authorize
redirect → callback route → token exchange → store real
scopes/expiry/avatar/follower count), plus a background job to refresh
follower counts and detect real token expiry/revocation instead of the
manual "Simulate issue" affordance.

## Inbox conversations/messages are seeded, not synced from any real provider

**Introduced:** Inbox migration.

Like Social Accounts, there is no real integration syncing DMs, comments,
mentions, or notifications from any platform into `Conversation`/
`InboxMessage`. The schema (`InboxItemType`, `externalId`, `metadata Json?`
on `Conversation`) is deliberately shaped so a real provider's webhook or
polling job could insert rows in this same shape later, but today the only
way rows exist is `prisma/seed.ts` and the in-app reply/note actions —
there's no inbound webhook receiver, no polling job, and `externalId`/
`metadata` are populated for exactly zero rows.

**Closing it:** per platform, a webhook receiver (or polling job for
platforms without webhooks) that upserts `Conversation`/`InboxMessage`
rows keyed by `externalId` for idempotency, populating `metadata` with
whatever the provider's payload looks like — additive to the current
schema, not a rewrite.

## No real-time updates for a shared team inbox

**Introduced:** Inbox migration.

The inbox is a genuinely multiplayer surface — unread state, assignment,
and resolution are shared across the whole team — but the UI only
reflects another teammate's action after a manual reload or the next
filter/pagination fetch. Two people can have the same conversation open
and neither sees the other's reply, read, or assignment change appear
live.

**Closing it:** a WebSocket or polling subscription scoped to the
workspace's conversations, invalidating/refetching the affected
conversation (and, if it's currently open in the thread pane, the detail
view) when another actor's mutation lands — the same
`revalidatePath`-triggered Server Actions already in place would just
need a broadcast step added alongside them.

## No cross-currency conversion in Monetization summaries

**Introduced:** Monetization migration.

`MonetizationEntry.currency` is a real per-entry field (any of
`SUPPORTED_CURRENCIES` in `src/lib/monetization-types.ts`), and every row
displays in its own currency. But the summary cards, category breakdown,
and revenue timeline (`src/lib/monetization-data.ts`) only sum entries in
`PRIMARY_CURRENCY` ("USD") — an entry recorded in EUR or GBP shows up in
the entries table but is silently excluded from every aggregate. This is
correct-but-incomplete rather than wrong: a workspace that only ever
transacts in USD (true of the seed data) never notices, but a workspace
with real multi-currency income would see totals that don't match what
they can see in the table.

**Closing it:** either restrict entry currency to a single
workspace-level setting (simplest — remove the per-entry choice), or add
a real FX-rate source (a daily-rate API, cached) and convert every
non-primary-currency entry to the primary currency at aggregation time,
storing the rate used on the entry so historical aggregates don't shift
as rates change.

## Monetization data is 100% manually entered

**Introduced:** Monetization migration.

Like Social Accounts and Inbox, there's no real integration populating
`MonetizationEntry` rows — `MonetizationProvider` (YouTube, TikTok,
Patreon, Stripe, Lemon Squeezy) exists as a schema value today only so a
manually-created entry can note where the money *conceptually* came from;
every entry is created through the New Entry form or `prisma/seed.ts`,
and `externalId`/`metadata` are populated for exactly zero rows.

**Closing it:** per provider, a real API/webhook integration (YouTube
Analytics/AdSense reporting, TikTok Creator Fund API, Patreon's API,
Stripe/Lemon Squeezy payment webhooks) that upserts `MonetizationEntry`
rows keyed by `externalId` for idempotency — additive to the current
schema, not a rewrite, following the same pattern already used for
Inbox's simulated providers.

## No approval workflow for high-value Monetization entries

**Introduced:** Monetization migration.

Any Owner can create, edit, mark Paid, or delete any entry outright —
there's no maker/checker step, no threshold above which a second person
must confirm, and no way to flag an entry as disputed short of editing or
deleting it. For a single-owner creator workspace this matches how the
rest of the app's Owner-only `manageMonetization` permission already
works, but a larger team tracking real revenue may want a review step
before a large entry is marked Paid or before one is deleted outright.

**Closing it:** an optional approval state on high-value entries (a
configurable threshold), reusing the same `ReviewEvent`-style pattern
Content already has for submit/approve/request-changes, gated on a
second permission tier (e.g. only an Owner, not an Admin, can approve
above the threshold) rather than a single flat `manageMonetization` gate.
