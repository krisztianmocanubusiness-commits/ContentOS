# Content OS

The operating system for your content workflow — plan, create, and analyze content across every channel from one workspace.

This repository contains the **foundation** of the app: authentication screens, the dashboard shell, and placeholder pages for each core section. Social integrations and real data are not wired up yet — everything is powered by mock data in `src/lib/mock-data.ts`.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) components (hand-authored under `src/components/ui`)
- [next-themes](https://github.com/pacocoursey/next-themes) for dark/light mode

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the login page, from which any sign-in action drops you into `/dashboard`.

## Structure

- `src/app/(auth)` — login and signup pages, shared split-screen auth layout
- `src/app/(dashboard)` — dashboard shell (sidebar + topbar) and one page per section: Dashboard, Content, Calendar, Analytics, Assets, Team, Settings
- `src/components/layout` — sidebar, workspace switcher, topbar, theme toggle, user menu
- `src/components/ui` — shadcn/ui primitives
- `src/lib/mock-data.ts` — all mock data used across the app
