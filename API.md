# API

Content OS has two API surfaces: **Server Actions** (the primary one —
every domain mutation and most on-demand reads) and a small number of
**HTTP route handlers** (`src/app/api/`, needed only where a Server
Action can't fit: authentication, unauthenticated signup, and streaming
file bytes). First version of this document, written alongside the
Inbox migration.

Every Server Action:

- Takes `workspaceSlug` as its first argument and calls
  `requireWorkspaceAccess(workspaceSlug)` itself — never trust a
  client-supplied workspace id (see `ARCHITECTURE.md`).
- Returns `ActionResult<T>` (`src/lib/action-result.ts`), except pure
  on-demand reads (named `get*Action`) which return the data directly, or
  `null` if not found.
- Checks `hasPermission(role, permission)` before mutating; the
  permission required is listed below.

## Content (`src/lib/content-actions.ts`)

| Action | Permission | Effect |
| --- | --- | --- |
| `addCommentAction(workspaceSlug, contentItemId, body)` | `createContent` | Appends a `ContentComment`; audit `ContentCommented` |
| `submitForReviewAction(workspaceSlug, contentItemId)` | `createContent` | `Draft`/`Needs Review` → `Needs Review`; audit `ContentSubmitted` |
| `approveContentAction(workspaceSlug, contentItemId)` | `approveContent` | `Needs Review` → `Published`; audit `ContentApproved` |
| `requestChangesAction(workspaceSlug, contentItemId, note)` | `approveContent` | `Needs Review` → `Draft`; audit `ContentChangesRequested` |

Status transitions use an atomic compare-and-swap (`updateMany` with the
expected `fromStatus` in the `WHERE`) so two reviewers acting on a stale
view get `code: "conflict"` instead of silently clobbering each other.

## Calendar (`src/lib/calendar-actions.ts`)

| Action | Permission | Effect |
| --- | --- | --- |
| `createEventAction(workspaceSlug, input)` | `publishContent` | Creates a `CalendarEvent`; audit `CalendarEventCreated` |
| `updateEventAction(workspaceSlug, eventId, input)` | `publishContent` | Updates title/platform; audit `CalendarEventUpdated` |
| `rescheduleEventAction(workspaceSlug, eventId, scheduledAt)` | `publishContent` | Updates `scheduledAt`; audit `CalendarEventRescheduled` |
| `deleteEventAction(workspaceSlug, eventId)` | `publishContent` | Deletes the row; audit `CalendarEventDeleted` |

## Team (`src/lib/team-actions.ts`)

| Action | Permission | Effect |
| --- | --- | --- |
| `inviteMemberAction(workspaceSlug, email, role)` | `manageTeam` | Creates (or reuses) a `User` + `Invited` `WorkspaceMembership`; audit `TeamMemberInvited`. See `TECH_DEBT.md` — no real invite-acceptance flow yet |
| `changeRoleAction(workspaceSlug, membershipId, role)` | `manageTeam` | Updates `role`; blocked for self and for demoting the last `Owner`; audit `TeamMemberRoleChanged` |
| `removeMemberAction(workspaceSlug, membershipId)` | `manageTeam` | Deletes the membership; blocked for self and the last `Owner`; audit `TeamMemberRemoved` |

## Assets (`src/lib/asset-actions.ts`, `src/lib/asset-data.ts`)

| Action | Permission | Effect |
| --- | --- | --- |
| `getAssetDetailAction(workspaceSlug, assetId)` | — (read) | Returns `AssetDetail` (including `usedIn` content) or `null` |
| `renameAssetAction(workspaceSlug, assetId, name)` | `createContent` | Renames; audit `AssetRenamed` |
| `moveAssetAction(workspaceSlug, assetId, folder)` | `createContent` | Changes `folder`; audit `AssetMoved` |
| `updateAssetTagsAction(workspaceSlug, assetId, tags)` | `createContent` | Replaces `tags`; audit `AssetTagsChanged` |
| `deleteAssetAction(workspaceSlug, assetId)` | `createContent` | Soft-delete (`status: Deleted`); audit `AssetDeleted` |
| `restoreAssetAction(workspaceSlug, assetId)` | `createContent` | `status: Active`; audit `AssetRestored` |

Upload isn't a Server Action — see the route handler below (Server
Actions have a body-size ceiling not well suited to file uploads in this
Next.js version).

## Social Accounts (`src/lib/social-account-actions.ts`)

| Action | Permission | Effect |
| --- | --- | --- |
| `connectAccountAction(workspaceSlug, { platform, handle, displayName? })` | `manageSocialAccounts` | Creates a `Connected` account with simulated scopes/token; audit `SocialAccountConnected` |
| `disconnectAccountAction(workspaceSlug, accountId)` | `manageSocialAccounts` | `status: NotConnected`, clears token/scopes; audit `SocialAccountDisconnected` |
| `reconnectAccountAction(workspaceSlug, accountId)` | `manageSocialAccounts` | `status: Connected`, refreshes token; audit `SocialAccountReconnected` |
| `renameAccountAction(workspaceSlug, accountId, displayName)` | `manageSocialAccounts` | Renames; audit `SocialAccountRenamed` |
| `simulateConnectionIssueAction(workspaceSlug, accountId)` | `manageSocialAccounts` | Demo/QA-only: `Connected` → `NeedsReauth`; audit `SocialAccountStatusChanged` |
| `getAccountDetailAction(workspaceSlug, accountId)` | — (read) | Returns `SocialAccountDetail` (including recent posts on that platform) or `null` |

`manageSocialAccounts` is Owner/Admin only — notably not Manager, unlike
most other workspace-management permissions.

## Inbox (`src/lib/inbox-actions.ts`)

Reads are open to any workspace member; every mutation requires
`manageInbox` (Owner/Admin/Manager).

| Action | Permission | Effect |
| --- | --- | --- |
| `getConversationsAction(workspaceSlug, filters, cursor?)` | — (read) | Cursor-paginated `{ items, nextCursor, counts }`; see `ARCHITECTURE.md` for the pagination pattern and `ConversationFilters` in `src/lib/inbox-data.ts` for the filter shape (search, type, platform, status, archived, assignedToMembershipId, unreadOnly) |
| `getConversationDetailAction(workspaceSlug, conversationId)` | — (read) | Full thread + internal notes + assignment, or `null` |
| `markConversationReadAction(workspaceSlug, conversationId)` | `manageInbox` | `unread: false`; audit `ConversationMarkedRead` |
| `markConversationUnreadAction(workspaceSlug, conversationId)` | `manageInbox` | `unread: true`; audit `ConversationMarkedUnread` |
| `archiveConversationAction(workspaceSlug, conversationId)` | `manageInbox` | `archived: true`; audit `ConversationArchived` |
| `unarchiveConversationAction(workspaceSlug, conversationId)` | `manageInbox` | `archived: false`; audit `ConversationUnarchived` |
| `resolveConversationAction(workspaceSlug, conversationId)` | `manageInbox` | `status: Resolved`; audit `ConversationResolved` |
| `reopenConversationAction(workspaceSlug, conversationId)` | `manageInbox` | `status: Open`; audit `ConversationReopened` |
| `assignConversationAction(workspaceSlug, conversationId, membershipId \| null)` | `manageInbox` | Sets/clears `assignedToMembershipId` (validated against the same workspace); audit `ConversationAssigned` |
| `addConversationNoteAction(workspaceSlug, conversationId, body)` | `manageInbox` | Creates a `ConversationNote`; audit `ConversationNoteAdded` |
| `replyToConversationAction(workspaceSlug, conversationId, body)` | `manageInbox` | Creates a `from: "you"` `InboxMessage`, bumps `Conversation.updatedAt`; audit `ConversationReplied` |

## Monetization (`src/lib/monetization-actions.ts`)

Reads are open to any workspace member; every mutation requires
`manageMonetization` (Owner-only, unchanged from the pre-migration
permission).

| Action | Permission | Effect |
| --- | --- | --- |
| `getMonetizationEntriesAction(workspaceSlug, filters, cursor?)` | — (read) | Cursor-paginated `{ items, nextCursor, total }`; see `ARCHITECTURE.md` for the pagination pattern and `MonetizationFilters` in `src/lib/monetization-data.ts` for the filter shape (search, type, category, status, provider) |
| `getMonetizationOverviewAction(workspaceSlug)` | — (read) | `{ summary, categoryBreakdown, timeline }` — the client re-fetches this after any mutation instead of `router.refresh()`, which would also reset the entries table's active filters |
| `createMonetizationEntryAction(workspaceSlug, input)` | `manageMonetization` | Creates a `MonetizationEntry` (`type` derived from `category`, `paidAt` stamped if created directly as `Paid`); audit `MonetizationEntryCreated` |
| `updateMonetizationEntryAction(workspaceSlug, entryId, input)` | `manageMonetization` | Updates any subset of fields (`input` is `Partial<MonetizationEntryInput>`), re-deriving `type` if `category` changes; audit `MonetizationEntryUpdated` |
| `updateMonetizationEntryStatusAction(workspaceSlug, entryId, status)` | `manageMonetization` | Transitions `status`; stamps `paidAt` only on the *first* transition into `Paid`, leaving it untouched on later transitions; audit `MonetizationEntryStatusChanged` |
| `deleteMonetizationEntryAction(workspaceSlug, entryId)` | `manageMonetization` | Hard-deletes the row; audit `MonetizationEntryDeleted` carries a `{ title, category, amount, currency }` snapshot in `metadata` since the FK would otherwise `SetNull` immediately |

`src/lib/monetization-data.ts` additionally exports
`getMonetizationSummary`, `getMonetizationByCategory`, and
`getMonetizationTimeline` — not Server Actions themselves, but the
Prisma-level aggregation functions `getMonetizationOverviewAction` and
the Monetization Server Component page call directly.

## HTTP route handlers (`src/app/api/`)

Used only where a Server Action doesn't fit: authentication needs a
provider-shaped endpoint, signup happens before any session exists, and
binary file transfer isn't a good fit for the Server Action body-size
model.

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/[...nextauth]` | (NextAuth internal) | — | Session/credentials auth, handled by NextAuth |
| `/api/signup` | `POST` | none (rate-limited) | Creates a `User` + first `Workspace` + `Owner` membership |
| `/api/workspaces` | `GET` | session | Lists the caller's workspaces (used by the workspace switcher) |
| `/api/workspaces` | `POST` | session | Creates a new `Workspace` + `Owner` membership for the caller |
| `/api/assets/[workspaceSlug]/upload` | `POST` | `requireWorkspaceAccess` + `createContent` | Uploads a file (≤ `MAX_UPLOAD_BYTES`, see `src/lib/asset-types.ts`), writes to the storage adapter, creates the `Asset` row + audit `AssetUploaded` |
| `/api/assets/file/[assetId]` | `GET` | `requireAssetFileAccess` (membership re-derived from the asset's `workspaceId`, since the URL has no slug) | Streams the original file bytes |
| `/api/assets/thumbnail/[assetId]` | `GET` | `requireAssetFileAccess` | Streams the generated thumbnail bytes |

Both asset byte-serving routes proxy through this app server rather than
a CDN/presigned URL — a known, documented simplification (see
`TECH_DEBT.md`).

See `ARCHITECTURE.md` for the conventions behind these signatures and
`DATABASE.md` for the schema they read and write.
