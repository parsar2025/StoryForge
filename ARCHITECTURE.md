# Architecture

This document outlines the high-level architecture of StoryForge.

## System Overview

StoryForge is a single-user RPG-style application built on Next.js 16 with App Router, using Supabase for authentication and database, and Prisma as the ORM layer.

## Folder Structure

```
storyforge/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Authentication route group
│   │   └── login/              # Login page
│   ├── (protected)/            # Protected route group
│   │   └── dashboard/          # Dashboard (requires auth)
│   ├── api/                    # API route handlers
│   │   ├── auth/sign-out/      # Sign-out endpoint
│   │   ├── character/          # GET/PATCH character (auto-provisioned)
│   │   ├── skill-trees/        # GET the 11 skill trees
│   │   ├── quests/             # Quest CRUD + [id]/complete (XP flow)
│   │   ├── activity-log/       # Manual time-entry CRUD + tag filter
│   │   └── resources/          # Resource CRUD
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Root page (redirects)
│   └── globals.css             # Global styles
├── components/                 # React components
│   └── ui/                     # shadcn/ui components
├── lib/                        # Shared utilities
│   ├── ai/                     # AI integration (Phase 3+)
│   │   ├── client.ts           # Shared AI client
│   │   └── config.ts           # AI configuration
│   ├── api/                    # API-layer helpers
│   │   ├── session.ts          # Auth + character resolution per request
│   │   ├── errorResponse.ts    # Consistent error JSON + codes
│   │   └── logger.ts           # Structured error logging
│   ├── game/                   # Deterministic game mechanics (config-driven)
│   │   ├── skillTrees.ts       # The 11 tree definitions + sub-skill tags
│   │   ├── xpEngine.ts         # XP formula + config
│   │   ├── xpDistribution.ts   # Fair XP split across trees
│   │   ├── levelFormula.ts     # xpToNextLevel = round(100 * level^1.4)
│   │   ├── titles.ts           # Character title lookup by level
│   │   ├── streakCalculator.ts # Consecutive-logged-day streak
│   │   └── noveltyDetector.ts  # Tree-neglect (14-day) novelty bonus
│   ├── services/               # Business logic over Prisma
│   │   ├── characterProvisioning.ts # Idempotent character + 11 trees
│   │   ├── questCompletion.ts  # Atomic XP award + level-ups
│   │   ├── activityLog.ts      # Manual time entries + streak cache
│   │   └── validation.ts       # Tree IDs, sub-skill tags, resource types
│   ├── supabase/               # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   ├── env.ts                  # Environment validation
│   ├── prisma.ts               # Prisma singleton
│   └── utils.ts                # Utility functions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Prisma migrations
├── proxy.ts                    # Auth middleware (Next.js 16 convention)
└── [config files]
```

## Data Model

The complete data model is defined in `prisma/schema.prisma`. Key models:

### Core Models

- **User** - Authentication user record
- **Character** - Player profile (1:1 with User)
- **SkillTree** - The 11 leveled skill trees (CORE and SUPPORT categories)
- **Quest** - Tasks and activities to complete; multi-step initiatives are EPIC quests grouping sub-quests via `parentQuestId` (there is no separate Project model)

### Supporting Models

- **Resource** - Learning materials (books, courses, etc.)
- **ActivityLog** - Time tracking and reflections
- **StoryChapter** - AI-generated narrative excerpts
- **StatusEffect** - Buffs and debuffs (deterministic rules)
- **Achievement** - Legendary skill unlocks
- **MentorConversation** / **MentorMessage** - Chat history

See PRD Section 4 for complete schema details.

## Authentication Flow

### 1. Unauthenticated Access
- User lands on `/` → middleware checks session → redirects to `/login`
- Login page displays email/password form

### 2. Login
- User submits credentials → Supabase Auth validates
- On success: session cookie set → redirect to `/dashboard`
- On failure: error message displayed

### 3. Authenticated Access
- User accesses `/dashboard` → middleware validates session → shows dashboard
- Dashboard displays user email and Phase 0 placeholder content

### 4. Sign Out
- User clicks sign-out button → `POST /api/auth/sign-out`
- Session cleared → redirect to `/login`

### Route Protection Strategy

**Proxy** (`proxy.ts`) handles all route protection:
- Public routes: `/login`, static assets
- Protected routes: `/dashboard` and all future app routes
- Redirects:
  - Unauthenticated + protected route → `/login`
  - Authenticated + `/login` → `/dashboard`

## The 11 Skill Trees

StoryForge uses a two-tier skill system:

### Leveled Trees (11 total)

**Core (8):**
1. 🔍 Opportunity Hunter
2. ⚒️ Builder
3. ⚔️ Sales
4. 📣 Marketing
5. 🤝 Negotiation & Influence
6. ♟️ Strategy
7. 💰 Finance
8. 🧠 Personal Mastery

**Support (3):**
9. ❤️ Health
10. 🌱 Relationships
11. 📚 Wisdom

### Sub-skill Tags

Each tree has a fixed list of sub-skills (e.g., "Cold outreach," "Copywriting" under Sales). These are tags for analytics, not independently leveled. XP always rolls up to the parent tree.

See PRD Section 5 for complete taxonomy.

## AI Roles (Phase 3+)

Four AI roles, all sharing `lib/ai/client.ts`:

| Role | Trigger | Type | Phase |
|------|---------|------|-------|
| **Daily Briefing** | First page load after game-day rollover | Automatic | Phase 5 |
| **Historian** | Milestones (boss defeated, level-up, tree thresholds) | Automatic | Phase 4 |
| **Dungeon Master** | "Generate Quests" button | Manual | Phase 3 |
| **Mentor** | Chat window | Manual | Phase 6 |

- **Daily Briefing** & **Historian** return structured JSON
- **Dungeon Master** returns quest arrays as JSON
- **Mentor** streams plain text responses

All AI calls go through the shared Anthropic client in `lib/ai/client.ts` (`@anthropic-ai/sdk`), with the model set in `lib/ai/config.ts` (`claude-opus-4-8`). A custom endpoint can be set via the `ANTHROPIC_BASE_URL` env var (the SDK's `baseURL` option); it defaults to `https://api.anthropic.com`. Structured roles use the Messages API; Mentor uses streaming. The client itself is wired in Phase 3 — Phase 1 only ships the config/placeholder.

## Deterministic Systems

Several systems use pure rule-based logic (never AI-judged):

- **XP Engine** (`lib/game/xpEngine.ts` - Phase 1) - Difficulty, duration, reflection bonuses
- **Status Effects** (`lib/game/statusEffects.ts` - Phase 2) - Streak bonuses, inactivity debuffs
- **Legendary Unlocks** (`lib/game/legendaryUnlocks.ts` - Phase 4) - Multi-tree combo requirements
- **Focus Signal** (Phase 2) - Lowest-leveled core tree or least recent XP

See PRD Sections 7 & 9 for formulas.

## Technology Choices

### Why Supabase over Neon + Auth.js?

Per PRD Section 2 (Simplicity First): Supabase bundles Postgres + Auth behind one dashboard/SDK, removing an entire integration. Neon is a better pure-Postgres engine if database branching becomes important, but the migration is low-friction (both are vanilla Postgres).

### Why Prisma 7?

Prisma provides type-safe database access with migrations. Version 7 changes the connection config (moved from schema to client), but the migration is handled in `lib/prisma.ts`.

### Why Next.js 16 App Router?

- Server Components for auth checks without client-side flicker
- Route Handlers with streaming support (needed for Mentor chat)
- Turbopack for faster development builds
- Modern React patterns (RSC, Server Actions)

## Future Architecture (Post-v1)

Potential additions documented in PRD Section 12:
- GitHub PR-based XP integration
- Calendar sync for automatic quest completion
- Voice reflection capture
- Kindle highlights import
- Cross-tree XP multipliers (Wisdom boosts)

These are explicitly deferred to keep v1 focused.

## Development vs Production

- **Development**: Hot reload with `npm run dev`, detailed error messages
- **Production**: Optimized build with `npm run build && npm start`, generic user-facing errors

Environment differences handled via `process.env.NODE_ENV` checks.
