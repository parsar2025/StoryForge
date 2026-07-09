# Technical Decisions

This document logs technical decisions made during the development of StoryForge, including rationale and trade-offs.

## Format

Each decision follows this structure:

```markdown
## [YYYY-MM-DD] Decision Title

**Context**: Why this decision was needed
**Decision**: What was chosen
**Consequences**: Impact and trade-offs
```

---

## [2026-07-06] Next.js 16 Middleware → Proxy Convention

**Context**: Next.js 16 deprecated the `middleware.ts` filename in favor of `proxy.ts` to better reflect its role in the request pipeline.

**Decision**: Rename `middleware.ts` → `proxy.ts` and `middleware()` function → `proxy()`

**Consequences**:
- ✅ Eliminates deprecation warning in Next.js 16
- ✅ Aligns with Next.js 16 conventions
- ⚠️ Different from Next.js 13-15 tutorials/examples
- ⚠️ Must remember to look for `proxy.ts` not `middleware.ts` in file tree

**Implementation**: File renamed to `proxy.ts`, export changed to `export async function proxy(request: NextRequest)`. Functionality unchanged — still handles route protection and auth redirects.

---

## [2026-07-06] Next.js 16 with App Router

**Context**: Need to choose a React framework for the application

**Decision**: Use Next.js 16 with App Router (not Pages Router)

**Consequences**: 
- ✅ Modern React patterns (Server Components, Server Actions)
- ✅ Built-in API routes with streaming support (needed for Mentor chat)
- ✅ Turbopack for faster development builds
- ✅ Native middleware for authentication
- ⚠️ App Router is newer, fewer examples/resources than Pages Router
- ⚠️ Some third-party libraries may not support Server Components yet

---

## [2026-07-06] Supabase over Neon + Auth.js

**Context**: Need database and authentication solution. Options: (1) Neon + Auth.js, (2) Supabase bundled solution

**Decision**: Use Supabase for both Postgres and Auth

**Consequences**:
- ✅ Single dashboard/SDK for both concerns (simpler per PRD Section 2)
- ✅ Built-in Auth UI and session management
- ✅ Row-level security policies available if needed
- ✅ Realtime subscriptions available for future features
- ⚠️ Less flexibility than separating concerns
- ⚠️ Migration path available: both Supabase and Neon are vanilla Postgres

**Rationale**: Per PRD Section 2 (Simplicity First), bundling Postgres + Auth removes an entire integration. Migration to Neon is low-friction if database branching becomes important later.

---

## [2026-07-06] Prisma as ORM

**Context**: Need type-safe database access layer

**Decision**: Use Prisma ORM (not Drizzle or raw SQL)

**Consequences**:
- ✅ Excellent TypeScript support with auto-generated types
- ✅ Migrations built-in and version controlled
- ✅ Well-documented and widely adopted
- ✅ Works seamlessly with Supabase Postgres
- ⚠️ Prisma 7.x has new configuration format (adapter-based)
- ⚠️ Generated client adds to bundle size

**Rationale**: PRD constraint (Section 3). Standard, well-supported pattern.

---

## [2026-07-06] Prisma 7.x Configuration

**Context**: Prisma 7 changed connection configuration from schema to client

**Decision**: Remove `url` from datasource, configure connection in `lib/prisma.ts`

**Consequences**:
- ✅ Aligns with Prisma 7.x best practices
- ✅ More flexible connection management
- ⚠️ Different from Prisma 5/6 tutorials online

**Implementation**:
```typescript
// prisma/schema.prisma - no url
datasource db {
  provider = "postgresql"
}

// lib/prisma.ts - connection configured here
new PrismaClient({
  adapter: {
    url: process.env.DATABASE_URL!,
  },
})
```

---

## [2026-07-06] Tailwind v4 Dark Mode

**Context**: Tailwind v4 changed darkMode configuration syntax

**Decision**: Use `darkMode: 'class'` instead of `darkMode: ['class']`

**Consequences**:
- ✅ Correct TypeScript types
- ✅ Simpler syntax
- ⚠️ Different from Tailwind v3 examples

---

## [2026-07-06] Environment Validation

**Context**: Need to ensure required environment variables are present

**Decision**: Create `lib/env.ts` module that validates on import, integrated into `next.config.ts`

**Consequences**:
- ✅ Fails fast during build/dev if config incomplete
- ✅ Clear error messages pointing to `.env.example`
- ⚠️ Must be temporarily disabled for initial setup
- ⚠️ Adds build-time dependency on all env vars

**Note**: Commented out in `next.config.ts` for Phase 0 setup. Uncomment once `.env.local` is configured.

---

## [2026-07-06] Single-User Architecture

**Context**: PRD specifies this is a single-user application

**Decision**: No multi-tenancy, no user management UI, no role-based access control

**Consequences**:
- ✅ Dramatically simpler database schema
- ✅ Fewer auth edge cases to handle
- ✅ No need for organization/team features
- ⚠️ Future multi-user support would require significant refactoring
- ⚠️ User creation must be done via Supabase dashboard

**Rationale**: Per PRD Section 2, simplicity is a hard constraint. Build for one user first, assess later if multi-user is needed.

---

## [2026-07-06] MIT License

**Context**: Need to choose open-source license

**Decision**: MIT License (permissive)

**Consequences**:
- ✅ Maximum flexibility for others to use/modify
- ✅ Simple and well-understood
- ✅ Compatible with most dependencies
- ⚠️ No copyleft protection (others can close-source derivative works)

**Rationale**: PRD suggested MIT as default. Permissive licensing aligns with "built for learning" ethos.

---

## Future Decisions

Decisions deferred to later phases:

- **XP Engine thresholds** (Phase 1) - Base XP values, level-up formula constants
- **Milestone triggers** (Phase 4) - Tree level thresholds (default: 5, 10, 20)
- **Legendary unlock thresholds** (Phase 4) - Tree level combos for legendary skills
- **Status effect rules** (Phase 2) - Streak day counts, inactivity debuffs
- **AI model choice** (Phase 3) - Default: gpt-4o, may adjust based on cost/performance
- **Test framework** (Phase 1) - Jest vs Vitest, property-based testing library

These will be logged here as they're decided.

## [2026-07-06] Vercel Deployment — Transaction Pooler vs Session Pooler

**Context**: Vercel Route Handlers run as short-lived serverless functions. Supabase offers three connection types: Direct, Session pooler, and Transaction pooler.

**Decision**: Use different `DATABASE_URL` values for local dev and Vercel:
- **Local `.env.local`**: Session pooler string (standard port 5432) — fine for a single persistent dev process.
- **Vercel environment variables**: Transaction pooler string (port 6543, `?pgbouncer=true` appended) — built for short-lived serverless connections.

**Consequences**:
- ✅ Avoids connection exhaustion on Supabase's free tier under serverless traffic
- ✅ Each Vercel function invocation borrows a connection from the pool instead of opening a dedicated one
- ⚠️ The two `DATABASE_URL` values are intentionally different — this is expected, not a misconfiguration
- ⚠️ The Transaction pooler does not support `prisma migrate dev/deploy` — run migrations manually from local machine before deploying schema changes: `npx prisma migrate deploy`

**Rationale**: PRD Section 12.1 explicitly calls this out. Wiring migrations into Vercel's build step is intentionally avoided — a failed mid-deploy migration is a worse failure mode than a deliberate manual step for a single-user app.

---

## [2026-07-06] Preview Deployments Share Production Database

**Context**: Vercel auto-deploys preview URLs per PR/branch. There is only one Supabase database in v1.

**Decision**: Accept that preview deployments talk to the same production Supabase database.

**Consequences**:
- ✅ No extra cost or setup for a staging database
- ⚠️ A preview build with a bug that writes bad data corrupts real journal/XP, not a sandbox
- ⚠️ If this becomes a problem: create a second free Supabase project for staging and set separate env vars per Vercel environment (Production vs Preview)

**Rationale**: Single-user app, no other users affected. PRD Section 12.1 explicitly notes this trade-off is acceptable until it's actually a problem.

---

## [2026-07-07] Character Level Computation: Cumulative XP

**Context**: Character leveling needs to track total lifetime XP and derive level from it. Initial implementation used a "remaining XP" approach that subtracted thresholds incrementally, which could lose precision across multiple quest completions.

**Decision**: Store cumulative `totalXp` in Character model and compute level by iterating from level 1, subtracting each threshold (100, 364, 830, ...) until XP is exhausted.

**Consequences**:
- ✅ Level-ups happen at exactly the right cumulative XP values (100, 364, 830, ...) regardless of how XP was gained
- ✅ Matches the exponential formula: `computeLevelFromCumulativeXp()` re-derives level from scratch each time
- ✅ No precision loss or drift across multiple completions
- ✅ Character database field is cumulative total, not current level's residual XP
- ⚠️ Slightly more computation per quest completion (iterates through thresholds), but negligible for realistic levels

**Implementation**: Added `computeLevelFromCumulativeXp()` helper in `questCompletion.ts` that walks forward from level 1 until cumulative XP runs out. Character update stores `totalXp` (cumulative) and recomputes `level` deterministically.

**Related**: Activity log XP distribution also fixed to use fair distribution algorithm matching tree distribution (prevents XP loss due to integer rounding).

## [2026-07-07] Phase 1 Scope: Drop Project, Manual Time Entry, Silent Provisioning

**Context**: Reviewing the Phase 1 spec as game-designer + DB-engineer against how the single user actually works. Three things did not fit: (1) a user-facing "character creation" framing for what is a one-character-per-user app, (2) a Project entity that overlapped with SkillTree/Epic, and (3) a live start/stop timer for a user who records times on paper and transfers them later.

**Decision**:
1. **Silent character provisioning** — exactly one Character per User, auto-provisioned on first login with `name` defaulting to "Founder" (renamed via `PATCH /api/character`). No creation UI/picker. Service renamed `CharacterCreationService` -> `CharacterProvisioningService` (`lib/services/characterProvisioning.ts`).
2. **Remove the Project entity** — deleted `Project` model, `Quest.projectId`, and the projects API. Competency grouping is the SkillTree (vertical); cross-tree initiatives are EPIC quests grouping sub-quests via a new self-relation `Quest.parentQuestId` ("EpicSubQuests"). `phaseOrder` null = unordered sub-quest; `prerequisiteId` = hard dependency (not enforced in Phase 1).
3. **Manual time entry only** — no live timer/pause. `ActivityLog` now has `workedOn DATE` + required `durationMin` (replacing `startTime`/`endTime`). Multi-session and "pause" are just multiple entries, summed by the XP Engine at completion. Streak is now days-with-a-logged-entry (cached on `Character.streakDays`), rewarding the daily-logging habit rather than only completion days.

**Consequences**:
- Simpler data model (one fewer table, one fewer FK) per PRD Section 2 (Simplicity First).
- Time tracking matches the user's real notebook workflow; no orphaned running timers, no clock/timezone drift.
- Requirements/design/tasks/PRD/schema/migration all updated to match. The init migration `20260706005327_init` was regenerated by hand (init-only, pre-production dev DB) to drop Project, add `parentQuestId`/`streakDays`/`workedOn`, and make `durationMin` NOT NULL. **Run `prisma migrate reset` (or `migrate dev`) on next DB spin-up to confirm the DB matches `schema.prisma`.**
- "Pause/resume" was explicitly considered and rejected as cost without new capability (two entries already express it).

**Related**: [[character-level-cumulative-xp]] leveling unaffected; XP distribution across trees unchanged.

## [2026-07-07] Phase 1 API Layer: Implicit M2M, Shared Session Helper, Cached-Streak Writes

**Context**: Implementing the Phase 1 REST endpoints (character, skill-trees, quests, activity-log, resources) surfaced three implementation choices the spec left to the agent (tasks 10.3, design doc "Data Model Notes").

**Decision**:
1. **Kept Prisma implicit many-to-many** for `Quest.trees`/`relatedTreeIds` and `Resource.trees`/`treeIds` — did NOT fall back to explicit join tables. `relatedTreeIds`/`treeIds` scalar arrays remain the source of truth for XP routing; the `trees` relation is connected in parallel (`connect`/`set`) purely for `include` convenience on reads. Both stay in sync in the same write.
2. **Shared session helper** (`lib/api/session.ts`, `requireCharacter()`) resolves the Supabase user and auto-provisions the character in one call, returning either a context or a ready 401. Every route uses it instead of repeating auth boilerplate.
3. **Streak cache written on every time-entry mutation** — `ActivityLogService` calls `updateCachedStreak()` after create/delete and after an update that changes `workedOn` (Req 18.5). Recompute-on-write chosen over recompute-on-read; per design doc the query cost is negligible at single-user volume.

**Consequences**:
- ✅ No schema migration needed; array + relation dual-write keeps reads ergonomic without a join model.
- ⚠️ The array and the relation must be written together — a future writer that sets only one will drift. Centralized in the quest/resource POST/PATCH handlers to contain this.
- ✅ Auth/provisioning logic lives in one place; routes stay thin.
- ⚠️ Streak recompute runs an extra query per time-entry write; acceptable now, revisit only if profiling shows cost.

**Related**: [[phase-1-scope-refinement]] streak-days model; [[character-level-cumulative-xp]] unaffected.

---

## Manual Acceptance (task 10.2) — Completed on preview

The Phase 1 manual checklist was run against the Vercel **preview** deployment (isolated test Supabase project): auto-provisioned character + 11 trees, quest create → time-entry log → complete with correct XP breakdown (base 55 + reflection 15 + difficulty 20 = 90), even 45/45 two-tree split, tree level-up, and validation 400s. Phase 1 tagged `v0.2.0`. The COMPLETED-quest edit-guard (Req 15.5) was not exercised live (test used a stale id → 404); code path verified by inspection. Integration tests (tasks 2.4, 2.8, 4.4, 5.6, 6.6, 7.5, 10.1) remain unchecked by decision — no isolated test database wired into CI, and they are marked optional in `tasks.md`.

---

## [2026-07-09] AI Provider: Anthropic Claude (not OpenAI)

**Context**: The PRD (Section 3) locked the AI provider as OpenAI, and the Phase 0 scaffolding stubbed `lib/ai/` + `OPENAI_API_KEY` accordingly. Before any AI role is built (Phase 3+), the provider was changed to Anthropic Claude, with a requirement to support a custom API base URL.

**Decision**: Use the Anthropic Claude API as the sole AI provider.
- SDK: `@anthropic-ai/sdk` (replaces the `openai` dependency).
- Model: `claude-opus-4-8`, set in `lib/ai/config.ts`.
- Auth env var: `ANTHROPIC_API_KEY` (replaces `OPENAI_API_KEY`).
- Custom endpoint: optional `ANTHROPIC_BASE_URL` env var → the SDK's `baseURL` client option; defaults to `https://api.anthropic.com`. Verified against the SDK source (`src/client.ts`: `baseURL = readEnv('ANTHROPIC_BASE_URL')`).

**Scope of this change (docs-only for now)**: Only documentation and `.env.example` are updated in this pass, so later phases wire the right code. The code migration — `lib/ai/config.ts` (model), `lib/ai/client.ts` (instantiate `new Anthropic({ apiKey, baseURL })`), `lib/env.ts` (validate `ANTHROPIC_API_KEY`), and swapping the `openai` dependency for `@anthropic-ai/sdk` in `package.json` — is deferred to Phase 3 when the AI client is first used.

**Consequences**:
- ✅ Single provider, matches the four-role design (structured Messages API + streaming for Mentor).
- ✅ Custom base URL supported for gateways/proxies without code changes (env-driven).
- ⚠️ Diverges from PRD Section 3 (OpenAI) — this decision supersedes it.
- ⚠️ Temporary inconsistency until Phase 3: `.env.example` says `ANTHROPIC_API_KEY` while `lib/env.ts` still validates `OPENAI_API_KEY`. Harmless now — env validation is commented out in `next.config.ts` — but must be reconciled when the client is wired.
- ⚠️ Anthropic SDK requires Node.js 20 LTS+ (already required by Next.js 16 / Prisma 7).

**Related**: [[phase-1-api-layer]] shares the `lib/` structure; AI client lands in Phase 3.


