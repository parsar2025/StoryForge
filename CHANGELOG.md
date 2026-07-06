# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-06

### Added
- Next.js 16 application with App Router and Turbopack
- TypeScript configuration with strict mode enabled
- Tailwind CSS with terminal-inspired dark theme
- shadcn/ui component library with Button component
- Complete Prisma schema with all 13 models from PRD
- Supabase authentication integration
- Login page with email/password form
- Authentication middleware for route protection
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
