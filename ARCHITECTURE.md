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
│   │   └── auth/sign-out/      # Sign-out endpoint
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Root page (redirects)
│   └── globals.css             # Global styles
├── components/                 # React components
│   └── ui/                     # shadcn/ui components
├── lib/                        # Shared utilities
│   ├── ai/                     # AI integration (Phase 3+)
│   │   ├── client.ts           # Shared AI client
│   │   └── config.ts           # AI configuration
│   ├── supabase/               # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   ├── env.ts                  # Environment validation
│   ├── prisma.ts               # Prisma singleton
│   └── utils.ts                # Utility functions
├── prisma/
│   └── schema.prisma           # Database schema
├── middleware.ts               # Auth middleware
└── [config files]
```

## Data Model

The complete data model is defined in `prisma/schema.prisma`. Key models:

### Core Models

- **User** - Authentication user record
- **Character** - Player profile (1:1 with User)
- **SkillTree** - The 11 leveled skill trees (CORE and SUPPORT categories)
- **Quest** - Tasks and activities to complete
- **Project** - Collections of related quests

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

**Middleware** (`middleware.ts`) handles all route protection:
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

All use OpenAI API with configurable model in `lib/ai/config.ts`.

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
