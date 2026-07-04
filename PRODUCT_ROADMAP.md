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
- [ ] Content detail sheet, comments, and review actions (approve / request
      changes / submit for review) migrated to Server Actions — currently
      still client-local optimistic state that resets on refresh
- [ ] DB-backed integration tests + a Postgres service in CI
- [ ] End-to-end verification pass: desktop + mobile, all roles, edge cases
- [ ] Remaining pages still on mock data: Dashboard (recent content/upcoming
      widgets), Calendar, Analytics, Assets, Social Accounts, Inbox,
      Monetization, Team

## Phase 2 — Earn Trust at Scale (not started)

Planned: real-time collaboration correctness (optimistic UI + server
reconciliation everywhere, not just Content), audit logging for approval
actions, structured error tracking/observability, Redis-backed rate limiting
(current in-memory limiter is a documented single-instance stopgap), background
jobs for scheduled publishing, webhook-based social account sync.

## Phase 3 — Ready for 100,000 Creators (not started)

Planned: horizontal scalability review (connection pooling, read replicas),
multi-region considerations, granular audit/compliance features for agency
customers, public API, billing/plan enforcement tied to real usage.

---

_Last updated: after migrating the Content list to Server Components + Prisma._
