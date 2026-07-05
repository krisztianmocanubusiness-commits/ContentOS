# Database

Schema reference for `prisma/schema.prisma`. First version of this
document, written alongside the Inbox migration — see
`PRODUCT_ROADMAP.md` for which pages read from this schema versus
`src/lib/mock-data.ts` (as of Inbox, only Monetization still does).

- **Engine:** Postgres, via `@prisma/adapter-pg`.
- **Client:** generated to `src/generated/prisma/` (gitignored; run `npx
  prisma generate` after any schema change).
- **Migrations:** `npx prisma migrate dev --name <name>`. Adding a
  required column to a table with existing dev rows will fail with
  "there are N rows in this table, it is not possible to execute this
  step" — this has come up in every migration that added a required
  column (Assets, Social Accounts, Inbox); the fix in this dev
  environment is to clear the affected table (`DELETE FROM
  "TableName";` via `psql`) before re-running, since `prisma/seed.ts`
  regenerates it afterward and none of it is real user data.
- **Seed:** `npx tsx prisma/seed.ts` (idempotent — every row is an
  `upsert` keyed by a fixed seed id).

## Conventions

- Every model has a `String @id` (application-generated `randomUUID()`,
  not a DB serial) except join/config tables that don't need one.
- Every workspace-scoped model has `workspaceId String` with
  `onDelete: Cascade` back to `Workspace`, plus `@@index([workspaceId])`
  at minimum — every query against these tables filters by `workspaceId`
  even when a more specific unique id is also available, so tenant
  isolation doesn't depend on remembering to add the filter.
- Dates that cross into the UI are formatted to display strings
  server-side (`src/lib/format.ts`) before being passed to client
  components — client components generally don't receive raw `Date`
  objects.
- Enums use PascalCase values; a handful map a Prisma-safe identifier to
  a display string with `@map` (e.g. `NeedsReview @map("Needs Review")`,
  `DirectMessage @map("Direct Message")`) where the natural product
  label contains a space.

## Models by domain

### Identity & workspace

- **`User`** — `id`, `name`, `email` (unique), `passwordHash`,
  `initials`. One row per real login-capable account. (Invited-but-
  never-logged-in members still get a `User` row with a placeholder hash
  — see `TECH_DEBT.md`'s "no invite-acceptance flow" entry.)
- **`Workspace`** — `id`, `name`, `slug` (unique, used in every
  `/w/[workspaceSlug]/...` route), `plan` (`Free`/`Pro`/`Team`),
  `initials`.
- **`WorkspaceMembership`** — join row between `User` and `Workspace`:
  `role` (`TeamRole`), `status` (`Active`/`Invited`). `@@unique([userId,
  workspaceId])`. This is the row `requireWorkspaceAccess` looks up to
  decide if a caller can see a workspace at all, and its `role` is what
  `hasPermission` checks. Conversations assign to a
  `WorkspaceMembership`, not a `User` directly (`assignedConversations`
  back-relation) — assignment is inherently workspace-scoped.

### Content

- **`ContentItem`** — a post: `status` (`Draft`/`Scheduled`/`Published`/
  `Needs Review`), `platform`, `scheduledAt`, free-text `authorName`/
  `authorInitials` (display-only; the audit trail is the FK-backed source
  of truth for who actually did what), `body`, `tags String[]`.
- **`ContentComment`** — threaded comments on a `ContentItem`.
- **`ReviewEvent`** — the approval history for a `ContentItem`
  (`submitted`/`approved`/`changes_requested`), with an optional note.

### Calendar

- **`CalendarEvent`** — `scheduledAt`, `title`, `platform`. Distinct from
  `ContentItem` (a calendar event doesn't necessarily correspond to a
  piece of content in the library).

### Assets

- **`Asset`** — real file metadata: `type` (`Image`/`Video`/`Audio`/
  `Document`), `folder`, `tags String[]`, `storageKey`/`thumbnailKey`
  (point at objects in the configured storage backend —
  `src/lib/storage/` — never at bytes in this table), `mimeType`,
  `byteSize`, `status` (`Active`/`Deleted` — soft delete, `deletedAt`),
  `metadata Json?` (unused today; reserved for future derived data like
  transcripts or embeddings). Many-to-many with `ContentItem` (an asset
  can be used in several posts).

### Social accounts

- **`SocialAccount`** — one connected channel: `platform`, `handle`,
  `displayName`, `avatarUrl`, `followersLabel`, `status`
  (`Connected`/`Not Connected`/`Needs Reauth` — see the doc-comment on
  `SocialStatus` for why `NeedsReauth` is a distinct state from a
  user-initiated disconnect), `scopes String[]`, `tokenExpiresAt`,
  `connectedSince`, `lastSyncedAt`. OAuth is fully simulated (see
  `TECH_DEBT.md`) but the shape matches what a real integration would
  store.

### Inbox

- **`Conversation`** — one inbox item of any kind, on any platform:
  - `type` (`InboxItemType`: `Comment`/`Direct Message`/`Mention`/
    `Notification`) — the provider-agnostic discriminator; see
    `ARCHITECTURE.md`'s "provider-agnostic pattern" section.
  - `contactName`/`contactHandle`/`contactInitials` — who the workspace
    is talking to (or about, for a Mention/Notification).
  - `externalId String?` and `metadata Json?` — reserved, unused today,
    for a real provider integration (webhook dedup key and raw payload
    bucket respectively).
  - `status` (`ConversationStatus`: `Open`/`Resolved`) — a triage state,
    orthogonal to `archived`.
  - `unread Boolean`, `archived Boolean` — the inbox list defaults to
    `archived: false`; archiving doesn't change `status`.
  - `assignedToMembershipId String?` → `WorkspaceMembership`
    (`onDelete: SetNull` — an assignee leaving the team unassigns the
    conversation rather than blocking the delete).
  - `updatedAt` (`@updatedAt`) — the sort key for the conversation list
    (`orderBy: [{updatedAt: "desc"}, {id: "desc"}]`); a reply explicitly
    bumps it even though only a child `InboxMessage` row was inserted,
    so the conversation resurfaces at the top like a real inbox would.
  - `@@index([workspaceId])`, `@@index([workspaceId, archived])`,
    `@@index([workspaceId, status])`, `@@index([assignedToMembershipId])`
    — one per the filter axes `getWorkspaceConversations` actually
    queries by.
- **`InboxMessage`** — one message in the thread: `from`
  (`MessageSender`: `them`/`you`), `body`. Ordered by `createdAt` for
  display; the most recent one (by `createdAt desc`, `take: 1`) is what
  the conversation list preview shows.
- **`ConversationNote`** — an internal, team-only annotation on a
  conversation. Deliberately a separate model from `InboxMessage` (not a
  third `from` value) — a note can never be sent to the contact by
  construction, and a real platform integration's synced messages can
  never accidentally include one.

### Monetization

- **`Deal`** — `brand`, `title`, `valueLabel`, `status` (`DealStatus`:
  `Negotiating`/`In Progress`/`Signed`/`Paid`/`Completed`), `dueDate`.
  Still backed by `src/lib/mock-data.ts`, not this table, as of the
  Inbox migration — the model exists but nothing reads/writes it yet.

### Audit

- **`AuditLog`** — one row per mutation across every domain above:
  `actorId`/`actorName` (who), `action` (`AuditAction`, one enum value
  per mutation type — see the full list in `prisma/schema.prisma`),
  `metadata Json?` (action-specific detail, e.g. `{ from, to }` for a
  status change), and one nullable FK per auditable entity type
  (`contentItemId`, `calendarEventId`, `workspaceMembershipId`,
  `assetId`, `socialAccountId`, `conversationId`), each `onDelete:
  SetNull` with its own index. See `ARCHITECTURE.md` for why this is one
  wide table rather than a table per domain.

## Enums reference

| Enum | Values |
| --- | --- |
| `Plan` | `Free`, `Pro`, `Team` |
| `TeamRole` | `Owner`, `Admin`, `Manager`, `Editor`, `Moderator`, `Analyst`, `Viewer` |
| `MemberStatus` | `Active`, `Invited` |
| `Platform` | `Instagram`, `TikTok`, `X`, `LinkedIn`, `YouTube`, `Facebook`, `Threads`, `Pinterest` |
| `ContentStatus` | `Draft`, `Scheduled`, `Published`, `Needs Review` |
| `ReviewAction` | `submitted`, `approved`, `changes_requested` |
| `AssetType` | `Image`, `Video`, `Audio`, `Document` |
| `AssetStatus` | `Active`, `Deleted` |
| `SocialStatus` | `Connected`, `Not Connected`, `Needs Reauth` |
| `MessageSender` | `them`, `you` |
| `InboxItemType` | `Comment`, `Direct Message`, `Mention`, `Notification` |
| `ConversationStatus` | `Open`, `Resolved` |
| `DealStatus` | `Negotiating`, `In Progress`, `Signed`, `Paid`, `Completed` |
| `AuditAction` | see `prisma/schema.prisma` — grouped by domain (Content, Calendar, Team, Asset, SocialAccount, Conversation) |

See `API.md` for the Server Actions and route handlers that read and
write these tables.
