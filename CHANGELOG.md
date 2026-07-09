# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Character API: `GET`/`PATCH /api/character` (auto-provision, rename)
- Skill trees API: `GET /api/skill-trees` (11 trees, CORE-first ordering)
- Quest API: `GET`/`POST /api/quests`, `PATCH`/`DELETE /api/quests/[id]`, `POST /api/quests/[id]/complete`
- Activity log API: `POST`/`GET /api/activity-log`, `PATCH`/`DELETE /api/activity-log/[id]` (manual time entry, sub-skill tag filter)
- Resource API: `GET`/`POST /api/resources`, `PATCH`/`DELETE /api/resources/[id]`
- ActivityLogService for manual time entries with cached-streak recompute
- Shared API session helper (`lib/api/session.ts`) for auth + character resolution
- XP Engine with reflection quality analysis, difficulty multipliers, and bonus system ([950d246](https://github.com/parsar2025/StoryForge/commit/950d246))
- Fair XP distribution algorithm across skill trees with property-based tests ([879a909](https://github.com/parsar2025/StoryForge/commit/879a909))
- Exponential level formula (100, 364, 830, ...) with convergence tests ([c142296](https://github.com/parsar2025/StoryForge/commit/c142296))
- Skill tree and title progression configuration ([f0cf8e8](https://github.com/parsar2025/StoryForge/commit/f0cf8e8))
- ValidationService for tree IDs, sub-skill tags, difficulty, quest types ([e0aaab7](https://github.com/parsar2025/StoryForge/commit/e0aaab7))
- API error response and logging utilities ([0c121d6](https://github.com/parsar2025/StoryForge/commit/0c121d6))
- Jest and fast-check for unit and property-based testing ([80398df](https://github.com/parsar2025/StoryForge/commit/80398df))

### Fixed
- Character level computation now uses cumulative XP instead of per-level residual ([bcb6c23](https://github.com/parsar2025/StoryForge/commit/bcb6c23))
- Activity log XP distribution now uses fair distribution algorithm ([bcb6c23](https://github.com/parsar2025/StoryForge/commit/bcb6c23))
- Add postinstall script to generate Prisma Client for Vercel builds ([91fa5c1](https://github.com/parsar2025/StoryForge/commit/91fa5c1))
- Remove @apply directives for Tailwind v4 compatibility ([da81ac0](https://github.com/parsar2025/StoryForge/commit/da81ac0))

### Changed
- Phase 1 scope refinement: silent character provisioning (one Character per User, name defaults to "Founder"); renamed `CharacterCreationService` → `CharacterProvisioningService`
- Time tracking is now manual entry only (no live timer/pause): `ActivityLog` uses `workedOn` + required `durationMin`; multi-session = multiple entries summed at completion
- Streak now counts consecutive days with a logged time entry (cached on `Character.streakDays`) rather than completion days
- Regenerated init migration to match the refined Phase 1 model
- Add tsx dependency and wire Prisma seed script for Phase 1 ([87b9a75](https://github.com/parsar2025/StoryForge/commit/87b9a75))
- Add ESLint config, additional shadcn/ui components, Vercel CLI ([416434b](https://github.com/parsar2025/StoryForge/commit/416434b))
- Document Transaction vs Session pooler trade-offs in DECISIONS.md ([416434b](https://github.com/parsar2025/StoryForge/commit/416434b))

### Removed
- `Project` model, `Quest.projectId`, and the `/api/projects` endpoints — cross-tree initiatives are now EPIC quests grouping sub-quests via `Quest.parentQuestId`

## [0.1.0] - 2026-07-06

### Added
- Next.js 16 application with App Router and Turbopack
- TypeScript configuration with strict mode enabled
- Tailwind CSS with terminal-inspired dark theme
- shadcn/ui component library with Button component
- Complete Prisma schema with all 13 models from PRD
- Supabase authentication integration
- Login page with email/password form
- Authentication middleware (`proxy.ts`) for route protection
- Dashboard shell displaying user email
- Sign-out API route
- Environment variable validation module
- Supabase client utilities (browser and server)
- Prisma singleton client
- AI client placeholder modules for Phase 3+
- Git repository with Conventional Commits format
- Comprehensive documentation:
  - README.md with setup instructions
  - ARCHITECTURE.md with system overview
  - CONTRIBUTING.md with development guidelines
  - CHANGELOG.md (this file)
  - DECISIONS.md for technical decisions
- MIT License

### Technical Details
- Database: PostgreSQL via Supabase
- ORM: Prisma 7.x with new configuration format
- Auth: Supabase Auth with cookie-based sessions
- Routing: Protected routes via Next.js middleware
- Styling: Dark theme with custom color palette

### Notes
- Phase 0 acceptance criteria met: Authentication working, empty dashboard shell functional
- All 11 skill trees defined in schema, ready for Phase 1 seeding
- Environment validation temporarily disabled for initial setup

[0.1.0]: https://github.com/parsar2025/StoryForge/releases/tag/v0.1.0
