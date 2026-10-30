# The Skills Planner

A full-stack skills, curriculum, and weekly execution tracker built for the **Six-Month Build Plan (Nov 2, 2026 – May 2, 2027)** using **Next.js (App Router)**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, and persistent **SQLite** storage.

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Core Stack & Architecture

- **Framework:** Next.js 15 (App Router) with strict TypeScript (`src/app/page.tsx`, `src/app/api/planner/route.ts`).
- **Design System & Theming:** Tailwind CSS v4 + shadcn/ui components (`src/components/ui/`) with default dark theme powered by `next-themes` (`src/components/theme-provider.tsx`).
- **Persistent SQLite Database:** Uses Node's built-in `node:sqlite` (`src/lib/db.ts`) storing data in `data/skills-planner.sqlite` (automatically created and pre-seeded from `src/lib/seed-data.ts` on first run).

## Features Included

1. **Dashboard & Analytics (`src/components/planner/dashboard-view.tsx`)**
   - **KPI Cards:** Overall curriculum milestone completion, skill target mastery %, weekly core rhythm (out of 32h), and knowledge base counts.
   - **26-Week Build Plan Flight Track:** Interactive phase timeline (Setup, Phase 1 Foundations, Phase 2 Planner App, Phase 3 Python + RAG, Phase 4 AI Tutor + Launch).
   - **Weekly Rhythm & Friday Review Tracker:** Log hours across the 5 core buckets (Build 14h, Study 8h, Design 4h, Reps 2h, Review 4h) + Creative Labs (8–16h), check off daily 20-minute JS/TS reps, and save weekly Friday Review takeaways.
   - **Monthly Hours Breakdown:** Aggregated Core vs. Creative Lab hours across the 6-month plan.

2. **Skills Matrix & Proficiency Tracker (`src/components/planner/skills-view.tsx`)**
   - Pre-seeded with all 15 core skills and Creative Labs from the Six-Month Build Plan.
   - Interactive 1–5 level dots with target proficiency rings, hour steppers (`-0.5h`, `+0.5h`, `+1h`), category filters, and expandable teach-back/study notes per skill.

3. **Course Management & Expanded Curriculum Notes (`src/components/planner/courses-view.tsx`)**
   - Add and filter both **Video Courses** and **Text / Documentation Titles**.
   - Every curriculum milestone features an expandable rich text area for study notes, code takeaways, and artifact links (GitHub repo, PR, Figma, Demo).

4. **Global Fuzzy Search (`src/components/planner/global-search-modal.tsx`)**
   - Powered by **Fuse.js** (`⌘K` / `Ctrl+K` or header search button).
   - Instant weighted search across all study notes, video course titles, text titles, skills, and scheduled items with one-click deep-linking.

5. **Scheduling & Calendar (`src/components/planner/schedule-view.tsx`)**
   - Uses shadcn/ui's `Calendar` component (`src/components/ui/calendar.tsx`) with visual dot indicators on dates with scheduled items.
   - Dedicated workflow columns for **Immediate To-Dos**, **Upcoming To-Dos** (with one-click promotion to Immediate), and **Calendar Events & Reviews**.
