# Content OS — Production Roadmap

Tracks progress against the CTO review roadmap: V1 (mock-data prototype) to
a production-grade, multi-tenant content operating system.

## Phase 0 — Stop the Bleeding ✅ Complete

Closed the critical security/data-hygiene gaps found in the V1 review.

- Scrubbed committed PII/credentials from mock data, seed script, and README
- Enforced real tenant isolation via `WorkspaceMembership` (server-side, not client-trusted)
- Added DB indexes on every `workspaceId` foreign key
- Added baseline security headers (CSP, HSTS, X-Frame-Options, etc.)
- Added rate limiting to signup and login
- Removed the dead global search input
- Stood up CI (lint, typecheck, tests, build) and a first real test suite

## Phase 1 — Make the Data Real (in progress)

Moving every page off `mock-data.ts` onto Postgres/Prisma, one page at a time,
behind real workspace-scoped access control.

- [x] Workspace-in-URL routing foundation (`/w/[workspaceSlug]/...`), replacing
      client-only active-workspace state so two tabs/shared links can point at
      different workspaces; `requireWorkspaceAccess` enforces membership
      server-side on every request
- [x] Content list migrated to Server Components + Prisma (`src/lib/content-data.ts`,
      `src/app/(dashboard)/w/[workspaceSlug]/content/page.tsx`), with loading
      skeleton, empty state, and an error boundary with retry
- [x] Content detail sheet, comments, and review actions (approve / request
      changes / submit for review) migrated to real Server Actions
      (`src/lib/content-actions.ts`), backed by Postgres instead of
      client-local optimistic state:
      - Every action re-verifies workspace membership and role server-side
        (`requireWorkspaceAccess` + `hasPermission`) and re-scopes the
        content item by `workspaceId`, so a foreign or guessed content id
        can't be mutated even if the client is compromised
      - Status transitions (`submitForReviewAction`, `approveContentAction`,
        `requestChangesAction`) use an atomic compare-and-swap
        (`updateMany` gated on the expected current status) inside a
        `prisma.$transaction`, so two reviewers acting on the same stale
        view can't silently clobber each other — the loser gets a
        "someone else updated this" conflict with a one-click Refresh
        action instead of overwriting the winner's change
      - A new `AuditLog` table (append-only, `AuditAction` enum:
        submitted/approved/changes-requested/commented) records every
        state-changing action with actor, timestamp, and metadata,
        independent of the mutable domain rows the UI renders
      - Comments are optimistic (instant append, rolled back on failure);
        review actions show a pending state and only update the UI once
        the database confirms, since silently un-approving something on
        conflict would be more confusing than a short wait
      - 20 Vitest integration tests against a real Postgres instance cover
        authorization (per-role forbidden cases), tenant isolation
        (cross-workspace access blocked), validation, conflict handling,
        and a genuine concurrency race (two simultaneous submits — exactly
        one wins, exactly one `ReviewEvent` row is created)
      - CI now runs a real Postgres service container and applies
        migrations before the test step, so these integration tests
        actually execute on every push, not just locally
- [x] End-to-end verification pass: desktop + mobile, all roles, edge cases
      - Expanded the role model from 4 to 7 roles: `Owner`, `Admin`,
        `Manager`, `Editor`, `Moderator`, `Analyst`, `Viewer`, ordered
        most- to least-privileged. Each role's permission set is a subset
        of the role before it (enforced by a monotonicity test) — Manager
        is Admin without team/social-account management, Moderator can
        create content but not publish or approve it, and Analyst is a
        read-only role kept distinct from Viewer for reporting/labeling
        even though the two currently carry identical permissions.
      - Added seeded users for every role in the Keris workspace (Ava/
        Admin, Nadia/Manager, Mila/Editor, Oscar/Moderator, Tara/Analyst,
        Victor/Viewer, alongside the existing Owner) so every role can
        actually be logged into and tested, not just asserted in a unit test.
      - Verified, per role, with real logins (not just the client-side
        "preview as" demo aid): correct UI gating on Content (new content,
        submit/approve/request-changes), Team (invite, role editing),
        Monetization (new deal), Social Accounts (connect/disconnect), and
        Settings (workspace fields) on both desktop and mobile; server-side
        enforcement of the same rules via 22 Server Action integration
        tests (up from 20, adding Manager/Moderator/Analyst cases);
        workspace-switcher scoping (a Keris-only user's switcher shows only
        Keris); and tenant isolation (direct URL to a workspace the user
        isn't a member of 404s regardless of role)
      - No permission, isolation, or UX bugs found — the existing
        `PERMISSIONS` matrix / `hasPermission` / `PermissionButton` /
        `requireWorkspaceAccess` architecture extended to three new roles
        without any structural changes, which is itself a signal the
        original design was sound
- [x] Dashboard migrated to Server Components + Prisma
      (`src/lib/dashboard-data.ts`, fully server-rendered — no client
      component needed at the page level, since every widget on this page
      is read-only). Replaced the old fake analytics tiles (Total Reach /
      Engagement Rate, from mock data unrelated to real content) with real
      content-pipeline stats, and added every widget the redesign called
      for:
      - Status counts (Total / Drafts / In Review / Scheduled / Published)
        via a single `groupBy` on `ContentItem.status`
      - Recent content and Pending approvals — lean, dashboard-specific
        queries selecting only the fields the widget renders (not the
        full content-list shape with comments/review history/assets,
        which would be wasted over-fetching for a 5-row preview)
      - Recent activity (workspace-wide) and Notifications (teammates'
        actions, excluding the signed-in user's own) both read from the
        `AuditLog` table added in the previous slice
      - Team activity: every member's role plus a "last active" timestamp
        computed via a single `auditLog.groupBy(by: ['actorId'], _max:
        {createdAt})` joined in memory against the membership list — not
        one query per member, so it doesn't scale with team size
      - Workspace statistics (plan, team member count, total content) —
        reuses counts already fetched for other widgets rather than
        re-querying
      - Upcoming events, now read from the real `CalendarEvent` table
        (seeded in the Phase 1 foundation, previously unused) instead of
        mock data, without touching the Calendar page itself
      - All 8 independent queries run in parallel via `Promise.all`;
        the whole function is wrapped in React's `cache()` for per-request
        dedup — deliberately *not* a persistent cross-request cache, since
        every widget here changes on nearly every content action and a
        stale "pending approvals" count would read as a bug
      - 8 Vitest integration tests against real Postgres cover status
        counts, pending approvals, the activity/notifications split,
        team last-active, workspace stats, upcoming-event date filtering,
        and — for every one of those — that a second workspace's data
        never leaks in
      - Verified empty states render correctly (no fake data) for a
        workspace with zero content, zero activity, and a single member,
        and that the loading skeleton and error boundary both fire
- [x] Calendar migrated to Server Components + Prisma
      (`src/lib/calendar-data.ts` for reads, `src/lib/calendar-actions.ts`
      for writes). This page had no working create/edit/delete UI at
      all before — the "Schedule post" button was inert and the detail
      sheet could only reschedule date/time — so this slice both moved
      the data and built the missing functionality:
      - `getWorkspaceCalendarEvents` fetches the whole workspace's events
        (not a date range), matching the existing client-side month/week/
        day navigation, which stays instant with no round trip per view
        change — the same tradeoff the Content list already makes
      - Four Server Actions (create/update/reschedule/delete), each
        re-verifying `publishContent` permission and re-scoping the
        target event by `workspaceId` before mutating, so a foreign or
        guessed event id can't be touched
      - Reschedule (drag-and-drop or the sheet's quick date/time change)
        is a distinct, lighter action from a full edit (title/platform/
        date/time via the sheet's form), so the audit trail and toast
        copy both say the right thing for what actually happened
      - `AuditLog` gained a `calendarEventId` column (sibling to the
        existing `contentItemId`, same `onDelete: SetNull` pattern) and
        four new `AuditAction` values — deleting an event keeps its audit
        record with the title preserved in `metadata` even after the FK
        is nulled out
      - Drag-and-drop reschedule stays optimistic (instant move, rolled
        back on failure) since that's the core interaction; create/edit/
        delete show a pending state and wait for confirmation, matching
        the Content actions' convention
      - Fixed a real staleness bug found while doing this: `TODAY` was a
        module-level `new Date(2026, 6, 1)` constant frozen at import
        time — harmless for mock data pinned to that date, but wrong the
        moment the calendar reads real dates. Replaced with `getToday()`,
        called fresh wherever "is this today" actually gets checked.
      - 15 Vitest integration tests against real Postgres cover
        authorization, tenant isolation (an event from another workspace
        can't be read, updated, rescheduled, or deleted), and the delete
        action's audit trail surviving the row it points to
      - Verified all three views (Month with dots, Week agenda, Day) at
        desktop and mobile, drag-and-drop persisting across a reload, the
        full create → edit → delete cycle, a Viewer correctly blocked
        from every mutation client- and server-side, tenant isolation via
        direct URL, and the loading skeleton / error boundary / empty
        state (a workspace with zero events) all rendering correctly
- [x] Analytics migrated to Server Components + Prisma
      (`src/lib/analytics-data.ts`, a reusable service layer other pages
      — Dashboard, future AI/reports — can call directly, not an
      Analytics-only module):
      - Replaced every fake social-performance number (Total Reach,
        Engagement Rate, New Followers, a "Top posts" table ranked by
        made-up reach/engagement) with real, schema-backed operational
        metrics: content status summary, posting frequency, content by
        platform/status/tag, calendar activity, review pipeline,
        approval turnaround, review activity, team contribution, and
        workspace growth — all scoped to `workspaceId` and computed with
        SQL-side `groupBy`/`count` aggregation, not fetch-then-filter
      - The range selector (`7d`/`30d`/`90d`) is a URL search param, not
        client state, so the page stays a pure async Server Component —
        a tiny `"use client"` `<Select>` does `router.push` to
        `?range=...` and the Server Component re-renders with fresh data
        for that window. Its options live in a new neutral module,
        `src/lib/analytics-range.ts` (no `"server-only"`, no Prisma),
        since a client component can't import anything that transitively
        pulls in a `"server-only"`-guarded module even for a plain type
      - Team contribution is keyed off `AuditLog.actorId` (a real FK),
        not the free-text `authorName`/`byName` fields elsewhere in the
        schema, which would silently undercount contributors whenever a
        display name doesn't exactly match the authenticated user's name
      - Approval turnaround pairs each `submitted` event with its next
        terminal decision per content item and averages the elapsed time,
        reporting `null`/zero-sample honestly instead of a fake average
        when a workspace has no completed review cycles yet
      - Every widget has an explicit "Not enough data yet" / "No content
        yet in this period" empty state — verified on the Personal
        workspace (zero content, zero activity) rendering all-zero tiles
        and every empty-state message with no fake numbers anywhere
      - Two reach-specific chart components were generalized into
        reusable, unit-agnostic ones (`BarChart`, `CategoryBreakdown`)
        accepting a `formatValue` prop, since the old hardcoded "reach in
        thousands" formatting was actively wrong for plain counts
      - All 11 sub-metrics for a given range run in parallel via a single
        `Promise.all`, wrapped in React's `cache()` for per-request dedup
      - 13 Vitest integration tests against real Postgres cover every
        exported function's correctness plus tenant isolation for each
      - Verified desktop and mobile layouts, range switching end-to-end
        in the browser, true tenant isolation (a Keris-only user hitting
        `/w/buildible/analytics` gets a 404, not just an authorized
        Owner's legitimate access to both workspaces), and the loading
        skeleton / error boundary both firing correctly
- [x] Team migrated to Server Components + Prisma
      (`src/lib/team-data.ts` for reads, `src/lib/team-actions.ts` for
      writes). This page had zero persistence before — invite, role
      change, and remove all only mutated client-side React state and
      were lost on refresh — so this slice built the real thing, not
      just a data swap:
      - `getWorkspaceTeamMembers` reads real members/roles/status from
        `WorkspaceMembership`, with last-activity keyed off
        `AuditLog.actorId` (the only FK-backed actor identity in the
        schema) in a single `groupBy`, not a per-member query
      - Three new Server Actions — `inviteMemberAction`,
        `changeRoleAction`, `removeMemberAction` — each re-verifying the
        `manageTeam` permission server-side (the client's "viewing as"
        role-preview selector is a demo aid only, never trusted for
        enforcement) and re-scoping the target membership by
        `workspaceId` before mutating
      - Because `WorkspaceMembership.userId` is a required FK, inviting
        someone always creates a real `User` row (reusing one if that
        email already has an account elsewhere) — there's no
        accept-invite/set-password flow yet, so a brand-new invitee's
        account has an unusable placeholder password until that's built
        (tracked in `TECH_DEBT.md`)
      - Final-owner protection: role changes and removals that would
        leave a workspace with zero Active Owners are blocked, checked
        inside a `Serializable`-isolation transaction so two concurrent
        demotions/removals of a workspace's last two Owners can't both
        succeed and leave none — covered by a dedicated concurrency test
      - Self-role-edit protection: changing your own role or removing
        yourself is blocked outright, even for an Owner with co-owners —
        a stronger, simpler rule than only guarding the last-owner case,
        since any self-edit through this endpoint is a conflict of
        interest a teammate should perform instead
      - `AuditLog` gained a `workspaceMembershipId` column (`onDelete:
        SetNull`, same pattern as `contentItemId`/`calendarEventId`) and
        three new `AuditAction` values (`TeamMemberInvited`,
        `TeamMemberRoleChanged`, `TeamMemberRemoved`) — removing a
        member keeps their name/email/role readable in `metadata` after
        the FK nulls out, and the Dashboard's activity feed now narrates
        these events too
      - Remove now has an inline "are you sure" confirmation (desktop:
        the row's action cell swaps to Cancel/Remove; mobile: the same
        pattern already used by the Calendar's delete-post flow) — the
        old mock UI removed a member on a single click with no
        confirmation at all
      - 23 Vitest integration tests against real Postgres cover every
        action's permission gating, tenant isolation, final-owner
        protection (including the two-concurrent-owners race), and
        self-edit blocking; 3 more cover the data layer's correctness
        and isolation
      - Verified desktop and mobile: inviting a member, changing a
        role, removing a member, all persisting across a reload; a
        Viewer sees no management controls; an Owner's own row has no
        editable role/remove control; true tenant isolation (a
        Keris-only user hitting `/w/buildible/team` gets a 404); and the
        loading skeleton / error boundary both firing correctly
- [x] Assets migrated to Server Components + Prisma, with a real object
      storage backend
      (`src/lib/asset-data.ts` for reads, `src/lib/asset-actions.ts` for
      metadata writes, `src/lib/storage/` for file bytes). This is the
      first migration that's genuinely new infrastructure, not just a
      Prisma query swap — the old `Asset` model had no file-related
      columns at all (`sizeLabel` was a made-up string, no bytes existed
      anywhere):
      - New `src/lib/storage/` module: a small `StorageAdapter` interface
        (`put`/`get`/`delete`, keys and bytes only — no workspace/asset
        business logic) with two implementations — `LocalDiskStorageAdapter`
        (default; writes under a gitignored `.storage/` directory, the
        only backend usable in this sandbox since no real bucket exists)
        and `R2StorageAdapter` (Cloudflare R2 via its S3-compatible API,
        selected automatically when `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/
        `R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME` are set — see
        `.env.example`). Swapping backends is an env var change, not a
        code change.
      - `Asset` gained real columns: `storageKey`, `thumbnailKey`,
        `mimeType`, `byteSize`, `status` (`Active`/`Deleted`, for
        soft-delete), `deletedAt`, and a deliberately open `metadata Json?`
        bucket — so a future AI feature (transcripts, embeddings,
        extracted labels) can attach derived data to an asset without
        another migration, reading the file via the same storage
        adapter's `get(storageKey)` any other code path uses.
      - Upload goes through a Route Handler
        (`POST /api/assets/[workspaceSlug]/upload`), not a Server Action —
        Next's Server Actions cap request bodies at 1MB by default, a
        non-starter for video/document uploads. Files are read into
        memory once, capped at 50MB (`MAX_UPLOAD_BYTES`), and handed to
        the storage adapter; see `TECH_DEBT.md` for the scaling
        implications of that tradeoff.
      - Image uploads get a real thumbnail (`sharp`, resized to fit
        400×400, WebP) stored as a sibling object; video/audio/document
        assets fall back to the existing type icon — no thumbnail
        fabricated for types that don't have one.
      - Both the original file and thumbnails are served through
        authenticated Route Handlers
        (`GET /api/assets/file/[assetId]`, `.../thumbnail/[assetId]`)
        that re-derive "does the caller belong to this asset's
        workspace" the same way `requireWorkspaceAccess` does for
        slug-based routes — bytes are never exposed via a public bucket
        URL, so there's no CSP change needed (everything is same-origin).
      - Delete is soft: `status` flips to `Deleted` (with a visible
        Trash view and a Restore action), not a hard row/file delete —
        matching "audit-logged restore" being a real, user-facing
        action. Renaming, moving, and tag edits are separate audited
        actions (`AssetRenamed`, `AssetMoved`, `AssetTagsChanged`),
        distinct from `AssetUploaded`/`AssetDeleted`/`AssetRestored`,
        matching the codebase's existing granular-verb audit style.
      - Fixed a real correctness bug surfaced by this migration:
        `ContentItem.assetIds` (a mock-shaped string-id array) was being
        looked up against the *mock* `assets` array via `assetById` in
        the content detail sheet's "Linked assets" section — since real
        content items reference real (UUID) asset ids, that lookup could
        never match, so this section was silently dead for any
        real content. `content-data.ts` now selects real asset
        name/type through the existing Prisma many-to-many relation and
        `ContentItem.linkedAssets` carries that directly, no id lookup.
      - Manage-asset actions (upload, rename, move, tag edit, delete,
        restore) all gate on the existing `createContent` permission
        (labeled "Create content & assets" already) rather than adding a
        new permission — Owner/Admin/Manager/Editor/Moderator can manage
        assets, Analyst/Viewer cannot, matching the pre-migration UI's
        own gating of the Upload button.
      - 27 Vitest integration tests (data layer, actions, and a
        filesystem-only unit test for the local-disk storage adapter)
        cover filtering, tenant isolation, permission gating, soft-delete/
        restore state transitions, and audit log correctness.
      - Verified desktop and mobile: uploading a real file (with
        progress), a generated thumbnail actually rendering, rename/
        move/tag-edit all persisting, delete moving an asset to Trash
        and restore bringing it back, a Viewer seeing no management
        controls, true tenant isolation (a Keris-only user hitting
        `/w/buildible/assets` gets a 404), and the loading skeleton /
        error boundary both firing correctly.
- [x] Social Accounts migrated to Server Components + Prisma, with
      simulated OAuth
      (`src/lib/social-account-data.ts` for reads, `src/lib/social-account-actions.ts`
      for writes):
      - Extended `Platform` from 5 to 8 values (added Facebook, Threads,
        Pinterest). The new hues in `src/lib/platform.ts` were run
        through the dataviz skill's `validate_palette.js` (per that
        file's own "run the validator before changing these values"
        comment) rather than eyeballed — the 8-color set passes
        lightness/chroma/contrast checks, with the pre-existing 5 colors
        left untouched
      - `SocialAccount` gained real columns: `displayName`, `avatarUrl`,
        `scopes` (simulated OAuth permission strings), `tokenExpiresAt`,
        and a `createdAt` for deterministic ordering (missing before —
        every other model already had one). `SocialStatus` gained a
        third state, `NeedsReauth`, distinct from `NotConnected`: it
        means the token is known-bad (simulated external revocation or
        an actually-lapsed `tokenExpiresAt`), and the fix is Reconnect,
        not Connect — Connect always creates a brand-new account row,
        Reconnect re-activates an existing one
      - "Connection health" (Healthy / Expiring soon / Needs attention /
        Disconnected) is computed from `status` + `tokenExpiresAt` at
        read time, not stored — avoids a second piece of state that
        could drift out of sync with the token expiry it describes
      - Five Server Actions — `connectAccountAction`,
        `disconnectAccountAction`, `reconnectAccountAction`,
        `renameAccountAction`, and `simulateConnectionIssueAction`
        (a demo/QA affordance that flips Connected → NeedsReauth,
        simulating the platform revoking access outside of any user
        action) — each gated on the existing `manageSocialAccounts`
        permission (Owner/Admin only; notably not Manager, unlike most
        other workspace-management permissions) and each paired with
        its own `AuditAction` (`SocialAccountConnected/Disconnected/
        Reconnected/Renamed/StatusChanged`)
      - OAuth itself is simulated end-to-end — connect/reconnect
        populate a plausible fake scope list and a 60-day token expiry
        rather than performing a real provider handshake, tracked as
        tech debt (see `TECH_DEBT.md`) since the schema shape already
        matches what a real integration would store
      - Fixed the same class of bug found during the Assets migration:
        the account detail dialog's "recent posts" list now queries
        `ContentItem` by workspace + platform + status directly instead
        of filtering an in-memory mock array, ordered newest-scheduled-first
        (the old mock had no explicit order)
      - 30 Vitest integration tests (data layer — including 6 pure
        unit tests of the health-computation function's branches — and
        actions) covering filtering, tenant isolation, the Manager-can't-
        manage-social-accounts permission boundary specifically, all
        five state-transition actions, and audit log correctness
      - Verified desktop and mobile: connecting a new account, renaming,
        simulating a connection issue and seeing it reflected as "Needs
        Reauth" / "Needs attention" health, reconnecting, disconnecting,
        a Manager (who can do almost everything else) correctly blocked
        from every mutation, true tenant isolation, and the loading
        skeleton / error boundary both firing correctly
- [ ] Remaining pages still on mock data: Inbox, Monetization

## Phase 2 — Earn Trust at Scale (not started)

Planned: real-time collaboration correctness (optimistic UI + server
reconciliation everywhere, not just Content), structured error
tracking/observability, Redis-backed rate limiting (current in-memory
limiter is a documented single-instance stopgap), background jobs for
scheduled publishing, webhook-based social account sync, an admin-facing
view of the `AuditLog` table added in Phase 1.

## Phase 3 — Ready for 100,000 Creators (not started)

Planned: horizontal scalability review (connection pooling, read replicas),
multi-region considerations, granular audit/compliance features for agency
customers, public API, billing/plan enforcement tied to real usage.

---

_Last updated: after migrating the Social Accounts page to Server Components + Prisma._
