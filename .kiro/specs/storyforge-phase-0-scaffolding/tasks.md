# Implementation Plan: StoryForge Phase 0 - Scaffolding

## Overview

This plan breaks down Phase 0 scaffolding into discrete implementation steps, building from project initialization through authentication flow to documentation. Each task builds incrementally, ensuring that the system remains in a working state at each checkpoint. The goal is to deliver a complete authentication-enabled application with an empty dashboard shell, tagged as v0.1.0.

## Tasks

- [-] 1. Initialize Next.js 16 project with TypeScript and Tailwind CSS
  - Create new Next.js 16 application with App Router using `create-next-app`
  - Configure TypeScript with strict mode enabled
  - Set up Tailwind CSS with dark theme configuration
  - Configure Turbopack as the development bundler
  - Create `.gitignore` file with required entries: `node_modules/`, `.next/`, `.env`, `.env.local`, `.ai-dev-log/`
  - Initialize git repository with initial commit using Conventional Commits format
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 7.1_

- [ ] 2. Set up shadcn/ui component library
  - Install and initialize shadcn/ui
  - Create `components.json` configuration file
  - Install at least one component (Button) to verify setup
  - Configure component path and theming
  - _Requirements: 2.3, 2.4, 2.5_

- [ ] 3. Configure Supabase and Prisma
  - [ ] 3.1 Install Supabase client SDK and Prisma dependencies
    - Add `@supabase/supabase-js` and `@supabase/ssr` packages
    - Add Prisma packages: `prisma`, `@prisma/client`
    - _Requirements: 3.1, 4.1_
  
  - [ ] 3.2 Create Prisma schema with complete data model
    - Create `prisma/schema.prisma` file
    - Configure PostgreSQL as the database provider
    - Add all models from PRD Section 4 (User, Character, SkillTree, Quest, Project, Resource, ActivityLog, StoryChapter, StatusEffect, Achievement, MentorConversation, MentorMessage)
    - _Requirements: 3.2, 3.4_
  
  - [ ] 3.3 Create environment configuration files
    - Create `.env.example` with documented required variables
    - Create environment validation module (`lib/env.ts`)
    - Configure validation to check for `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`
    - Integrate validation into `next.config.js` for startup checks
    - _Requirements: 3.3, 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 3.4 Create Supabase client utilities
    - Create `lib/supabase/client.ts` for browser client
    - Create `lib/supabase/server.ts` for server client with cookie handling
    - Create `lib/prisma.ts` for singleton Prisma client
    - Configure proper TypeScript types for database schema
    - _Requirements: 3.3_

- [ ] 4. Checkpoint - Verify configuration
  - Ensure all dependencies install without errors
  - Verify TypeScript compilation passes with zero errors
  - Verify environment validation works (test with missing variable)
  - Run `npx prisma migrate dev --name init` to create database tables
  - Confirm all tables exist in Supabase database
  - _Requirements: 3.5, 9.1, 9.5_

- [ ] 5. Implement authentication flow
  - [ ] 5.1 Create login page
    - Create `app/(auth)/login/page.tsx`
    - Build login form with email and password fields using shadcn/ui components
    - Implement form submission handler calling `supabase.auth.signInWithPassword()`
    - Add error display for invalid credentials
    - Handle successful login with redirect to `/dashboard`
    - _Requirements: 4.2_
  
  - [ ] 5.2 Create authentication middleware
    - Create `middleware.ts` for route protection
    - Implement session validation using Supabase cookies
    - Redirect unauthenticated users from protected routes to `/login`
    - Redirect authenticated users from `/login` to `/dashboard`
    - Configure middleware matcher for appropriate routes
    - _Requirements: 4.5_
  
  - [ ]* 5.3 Write property test for authentication flow
    - **Property 1: Complete Authentication Flow**
    - Test that valid credentials authenticate and redirect to dashboard with email displayed
    - **Validates: Requirements 4.3, 4.4, 9.3**
  
  - [ ]* 5.4 Write property test for route protection
    - **Property 2: Route Protection**
    - Test that unauthenticated access to protected routes redirects to login
    - **Validates: Requirements 4.2, 4.5**

- [ ] 6. Implement dashboard shell
  - [ ] 6.1 Create dashboard page and layout
    - Create `app/(protected)/dashboard/page.tsx`
    - Fetch authenticated user from Supabase Auth
    - Display user email address
    - Add "Phase 0 Dashboard Shell" placeholder text
    - Create sign-out button component
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  
  - [ ] 6.2 Create sign-out API route
    - Create `app/api/auth/sign-out/route.ts`
    - Implement sign-out logic calling `supabase.auth.signOut()`
    - Clear session cookies
    - Return redirect response to `/login`
    - _Requirements: 4.6_
  
  - [ ] 6.3 Create root layout with dark theme
    - Create `app/layout.tsx` with HTML structure
    - Import global Tailwind styles
    - Configure dark theme as default
    - Set up monospace and sans-serif font variables
    - Add metadata (title, description)
    - _Requirements: 5.2_
  
  - [ ]* 6.4 Write property test for dashboard access
    - **Property 3: Authenticated Dashboard Access**
    - Test that authenticated users see dashboard with their email
    - **Validates: Requirements 5.2, 5.3**
  
  - [ ]* 6.5 Write property test for sign-out flow
    - **Property 4: Sign-Out Flow**
    - Test that sign-out clears session and redirects to login
    - **Validates: Requirements 9.4**

- [ ] 7. Checkpoint - Test authentication flow end-to-end
  - Create test user in Supabase dashboard if needed
  - Verify login with invalid credentials shows error
  - Verify login with valid credentials redirects to dashboard
  - Verify dashboard displays user email
  - Verify sign-out button returns to login page
  - Verify accessing `/dashboard` without auth redirects to `/login`
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Create AI client placeholder modules
  - Create `lib/ai/config.ts` with model configuration constants
  - Create `lib/ai/client.ts` with placeholder comment explaining future use
  - Add documentation comment referencing Phase 3+ for AI integration
  - _Requirements: 8.5_

- [ ] 9. Create documentation files
  - [ ] 9.1 Create README.md
    - Add project description and tagline
    - List tech stack
    - Document prerequisites (Node.js version, Supabase account)
    - Write setup instructions (clone, install, env config, migrations, dev server)
    - Explain how to create first user in Supabase dashboard
    - Add license badge
    - _Requirements: 8.1_
  
  - [ ] 9.2 Create ARCHITECTURE.md
    - Document folder structure
    - Describe data model with reference to Prisma schema
    - Draw authentication flow diagram (text or Mermaid)
    - Explain route protection strategy
    - Add placeholder for future phases (4 AI roles, skill taxonomy)
    - _Requirements: 8.2_
  
  - [ ] 9.3 Create CONTRIBUTING.md
    - Document local development setup steps
    - Specify coding conventions (TypeScript strict mode, Prettier, ESLint)
    - Explain commit message format (Conventional Commits)
    - Describe branch naming and PR process
    - Note that testing strategy will be added in Phase 1+
    - _Requirements: 8.3_
  
  - [ ] 9.4 Create CHANGELOG.md
    - Set up Keep a Changelog format structure
    - Add entry for v0.1.0 with all Phase 0 additions
    - List all features added in this phase
    - _Requirements: 7.3_
  
  - [ ] 9.5 Create DECISIONS.md
    - Document initial technical decisions
    - Explain Next.js 16 choice (PRD constraint)
    - Explain Supabase over separate Postgres + Auth.js (simplicity per PRD Section 2)
    - Explain Prisma choice (PRD constraint)
    - _Requirements: 7.4_
  
  - [ ] 9.6 Add LICENSE file
    - Add MIT license (default per PRD suggestion)
    - If different license chosen, document in DECISIONS.md
    - _Requirements: 8.4_

- [ ]* 10. Write property test for environment validation
  - **Property 5: Environment Configuration Validation**
  - Test that missing required environment variables cause graceful startup failure
  - **Validates: Requirements 6.1, 6.2, 6.5**

- [ ] 11. Final verification and tagging
  - Run full manual testing checklist from design document
  - Verify all acceptance criteria are met
  - Ensure development server starts without errors
  - Confirm application is accessible at localhost
  - Verify zero TypeScript compilation errors
  - Create git tag `v0.1.0` with message "Phase 0: Scaffolding complete"
  - Update CHANGELOG.md with release date
  - _Requirements: 9.1, 9.2, 7.5_

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP delivery
- Each checkpoint ensures incremental validation of the system
- All code should follow TypeScript strict mode and use Tailwind CSS for styling
- Environment variables must be configured in `.env.local` before running the application
- The complete Prisma schema from PRD Section 4 is included even though most models won't be used until Phase 1+
- Documentation files establish conventions that will be maintained throughout all phases
