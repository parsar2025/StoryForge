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
