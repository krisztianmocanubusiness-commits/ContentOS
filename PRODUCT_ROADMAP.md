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
- [ ] Remaining pages still on mock data: Dashboard (recent content/upcoming
      widgets), Calendar, Analytics, Assets, Social Accounts, Inbox,
      Monetization, Team

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

_Last updated: after the 7-role permission expansion and end-to-end role/tenant-isolation verification pass._
