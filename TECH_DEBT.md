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
