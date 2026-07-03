# Content OS

The operating system for your content workflow — plan, create, and analyze content across every channel from one workspace.

Authentication and the underlying data model are backed by a real PostgreSQL database via Prisma. Every other page — Content, Calendar, Analytics, Assets, Social Accounts, Inbox, Monetization, Team — still reads from mock data in `src/lib/mock-data.ts`; migrating each one to the database is future, page-by-page work.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) components (hand-authored under `src/components/ui`)
- [next-themes](https://github.com/pacocoursey/next-themes) for dark/light mode
- [Prisma](https://prisma.io) + PostgreSQL for the database
- [Auth.js (NextAuth v5)](https://authjs.dev) with the Credentials provider for email/password auth

## Getting started

1. Start a local PostgreSQL server and create a database, or point `DATABASE_URL` at one you already have.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET` (generate a secret with `openssl rand -base64 32`).
3. Install dependencies, run migrations, and seed the database:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the login page. The seed script creates a real account you can sign in with:

- Email: `demo@contentos.dev`
- Password: `ContentOS-Demo-2026`

This is a seed-only demo account for local development — rotate or remove it before this repository is ever public, and never reuse this password anywhere real.

Or use "Sign up" to create a new account and workspace from scratch.

## Structure

- `src/app/(auth)` — login and signup pages, shared split-screen auth layout
- `src/app/(dashboard)` — dashboard shell (sidebar + topbar) and one page per section: Dashboard, Content, Calendar, Analytics, Assets, Team, Settings
- `src/app/api` — the NextAuth route handler and the signup endpoint
- `src/auth.ts` — Auth.js configuration (Credentials provider, JWT sessions)
- `src/proxy.ts` — route protection (this Next.js version renames `middleware.ts` to `proxy.ts`)
- `src/components/layout` — sidebar, workspace switcher, topbar, theme toggle, user menu
- `src/components/ui` — shadcn/ui primitives
- `src/lib/mock-data.ts` — mock data still used by every page besides auth
- `src/lib/prisma.ts` — Prisma client singleton
- `prisma/schema.prisma` — the full data model (covers every entity in `mock-data.ts`, even though only auth reads/writes it so far)
- `prisma/seed.ts` — seeds the database with data equivalent to `mock-data.ts`
