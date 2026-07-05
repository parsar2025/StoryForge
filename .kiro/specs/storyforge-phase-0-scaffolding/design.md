# Design Document: StoryForge Phase 0 - Scaffolding

## Overview

Phase 0 establishes the foundational infrastructure for StoryForge - a Next.js 16 application with TypeScript, styled with Tailwind CSS and shadcn/ui, backed by Supabase for authentication and PostgreSQL database access via Prisma ORM. The goal is to create a minimal but complete development environment with a working authentication flow that allows a user to log in and see an empty dashboard.

This phase prioritizes simplicity and follows the constraints outlined in PRD Section 2: we build only what is needed for authentication and basic routing, without adding features from future phases. All git conventions and documentation structure are established from the first commit.

## Architecture

### High-Level Structure

```
storyforge/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication route group
│   │   └── login/
│   │       └── page.tsx          # Login page
│   ├── (protected)/              # Protected route group (requires auth)
│   │   └── dashboard/
│   │       └── page.tsx          # Dashboard shell
│   ├── api/                      # API route handlers
│   │   └── auth/                 # Auth-related endpoints (sign-out)
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root page (redirects based on auth)
├── components/                   # React components
│   └── ui/                       # shadcn/ui components
├── lib/                          # Shared utilities
│   ├── ai/                       # AI integration (placeholder for Phase 3+)
│   │   ├── client.ts            # Shared AI client (empty for Phase 0)
│   │   └── config.ts            # AI configuration constants
│   ├── supabase/                # Supabase integration
│   │   ├── client.ts            # Browser Supabase client
│   │   └── server.ts            # Server Supabase client
│   └── prisma.ts                # Prisma client singleton
├── prisma/
│   └── schema.prisma            # Complete data model from PRD Section 4
├── public/                      # Static assets
├── .env.example                 # Environment variable template
├── .gitignore                   # Git ignore rules
├── components.json              # shadcn/ui configuration
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
├── README.md                    # Project overview and setup
├── ARCHITECTURE.md              # Architecture documentation
├── CONTRIBUTING.md              # Contribution guidelines
├── CHANGELOG.md                 # Version history
├── DECISIONS.md                 # Technical decisions log
└── LICENSE                      # Open-source license
```

### Technology Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (configured but not deployed in Phase 0)

### Authentication Flow

1. **Unauthenticated access**: User lands on `/` → redirected to `/login`
2. **Login**: User provides email/password → Supabase Auth validates → sets session cookie
3. **Authenticated access**: User accesses `/dashboard` → middleware validates session → shows dashboard
4. **Sign out**: User clicks sign-out → clears session → redirects to `/login`

### Route Protection Strategy

Use Next.js middleware (`middleware.ts`) to check authentication status:
- Public routes: `/login`, `/` (redirects based on auth status)
- Protected routes: `/dashboard` and all future routes
- If unauthenticated user attempts protected route → redirect to `/login`
- If authenticated user accesses `/login` → redirect to `/dashboard`

## Components and Interfaces

### Core Components

#### 1. Login Page (`app/(auth)/login/page.tsx`)

**Purpose**: Provides email/password authentication interface using Supabase Auth.

**Interface**:
```typescript
interface LoginPageProps {}

export default function LoginPage(props: LoginPageProps): JSX.Element
```

**Behavior**:
- Renders a centered login form with email and password fields
- On form submission, calls Supabase Auth `signInWithPassword()`
- On success, redirects to `/dashboard`
- On error, displays error message to user
- Uses shadcn/ui components (Card, Input, Button) for styling

#### 2. Dashboard Page (`app/(protected)/dashboard/page.tsx`)

**Purpose**: Main application view for authenticated users (empty shell in Phase 0).

**Interface**:
```typescript
interface DashboardPageProps {}

export default function DashboardPage(props: DashboardPageProps): JSX.Element
```

**Behavior**:
- Fetches current user from Supabase Auth
- Displays user email address
- Shows "Phase 0 Dashboard Shell" placeholder text
- Includes sign-out button that calls `/api/auth/sign-out`
- Protected by middleware (only accessible when authenticated)

#### 3. Root Layout (`app/layout.tsx`)

**Purpose**: Wraps all pages with common HTML structure and global styles.

**Interface**:
```typescript
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout(props: RootLayoutProps): JSX.Element
```

**Behavior**:
- Sets up HTML document structure
- Loads global Tailwind CSS
- Applies dark theme by default
- Sets monospace font for terminal aesthetic
- Includes metadata (title, description)

#### 4. Middleware (`middleware.ts`)

**Purpose**: Protects routes and manages authentication-based redirects.

**Interface**:
```typescript
export function middleware(request: NextRequest): NextResponse
```

**Behavior**:
- Reads Supabase session from cookies
- If session exists and user accesses `/login` → redirect to `/dashboard`
- If no session and user accesses protected routes → redirect to `/login`
- Allows unauthenticated access to public assets and API routes
- Updates session cookies on each request for session refresh

### Utility Modules

#### 1. Supabase Browser Client (`lib/supabase/client.ts`)

**Purpose**: Provides Supabase client for client-side components.

**Interface**:
```typescript
export function createBrowserClient(): SupabaseClient<Database>
```

**Behavior**:
- Creates a singleton Supabase client for browser environment
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Returns typed client with Database schema

#### 2. Supabase Server Client (`lib/supabase/server.ts`)

**Purpose**: Provides Supabase client for server components and route handlers.

**Interface**:
```typescript
export function createServerClient(): SupabaseClient<Database>
```

**Behavior**:
- Creates Supabase client for server environment
- Reads/writes session cookies
- Uses the same environment variables as browser client
- Returns typed client with Database schema

#### 3. Prisma Client (`lib/prisma.ts`)

**Purpose**: Provides singleton Prisma client for database operations.

**Interface**:
```typescript
export const prisma: PrismaClient
```

**Behavior**:
- Creates a single PrismaClient instance
- Reuses instance in development to avoid connection exhaustion
- Properly handles hot reloading in Next.js development mode
- Connects to Supabase PostgreSQL using `DATABASE_URL`

#### 4. AI Client Placeholder (`lib/ai/client.ts`)

**Purpose**: Reserved location for shared AI client (empty in Phase 0).

**Content**:
```typescript
// Placeholder for Phase 3+
// All AI calls (Daily Briefing, Historian, Dungeon Master, Mentor)
// will go through this shared module

export const AI_CONFIG = {
  model: 'gpt-5.5', // Default model, can be changed
  temperature: 0.7,
};

// Export OpenAI client setup here in Phase 3
```

## Data Models

The Prisma schema includes all models from PRD Section 4, establishing the complete data structure even though most tables won't be used until Phase 1+. This allows us to run `prisma migrate` once and have the database ready for future phases.

### Key Models for Phase 0

Only the `User` model is actively used in Phase 0 for authentication:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  character Character?
}
```

**Note**: Supabase Auth manages the actual authentication state. The `User` model in Prisma serves as a profile record that will be extended with the `Character` relationship in Phase 1.

### Database Migrations

Phase 0 includes running the initial migration to create all tables:

```bash
npx prisma migrate dev --name init
```

This creates all tables from the schema even though most are unused. Future phases will add data but should not require schema changes unless PRD decisions are logged in `DECISIONS.md`.

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file with these variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# OpenAI Configuration (unused in Phase 0, required for Phase 3+)
OPENAI_API_KEY=sk-...
```

### Environment Variable Validation

Create a validation module (`lib/env.ts`) that checks for required variables at startup:

```typescript
function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'OPENAI_API_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check .env.example for required configuration.'
    );
  }
}
```

Call this function in `next.config.js` to fail fast during build/dev if configuration is incomplete.

## Styling and Theme

### Tailwind Configuration

Extend the default Tailwind config to support the terminal-inspired dark theme:

```typescript
// tailwind.config.ts
export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Terminal-inspired color palette (dark by default)
        background: 'hsl(220, 15%, 8%)',    // Dark background
        foreground: 'hsl(210, 40%, 98%)',   // Light text
        primary: 'hsl(142, 76%, 56%)',      // Terminal green
        secondary: 'hsl(210, 40%, 20%)',    // Subtle backgrounds
        accent: 'hsl(47, 100%, 66%)',       // Highlights/warnings
        destructive: 'hsl(0, 85%, 60%)',    // Errors
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### Typography Rules

- **AI-voiced text** (Daily Briefings, Historian excerpts, Mentor chat): Monospace font (`font-mono`)
- **UI chrome** (buttons, navigation, quest lists, skill bars): Sans-serif font (`font-sans`)
- **Code blocks**: Monospace with syntax highlighting (Phase 2+)

### Dark Mode

Dark mode is the default and only theme in Phase 0. The `class` strategy allows future light mode support, but it's not built in Phase 0.

## Git Conventions and Versioning

### Commit Message Format

All commits follow Conventional Commits:

```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `chore:` Tooling, dependencies, config
- `test:` Test additions or modifications

### Branching Strategy

- `main` branch: Always deployable, protected
- Feature branches: `feature/short-name` for new work
- Merge via pull requests with squash commits

### Versioning

Phase 0 ends with tag `v0.1.0` when all acceptance criteria are met:

```bash
git tag -a v0.1.0 -m "Phase 0: Scaffolding complete"
git push origin v0.1.0
```

### CHANGELOG.md Format

Follow Keep a Changelog:

```markdown
# Changelog

## [0.1.0] - YYYY-MM-DD

### Added
- Next.js 16 application with TypeScript and Turbopack
- Tailwind CSS and shadcn/ui integration
- Supabase authentication flow
- Prisma ORM with complete schema
- Empty dashboard shell
- Git conventions and documentation structure
```

## Documentation Requirements

### README.md

Must include:
- Project description and tagline
- Tech stack list
- Prerequisites (Node.js version, Supabase account)
- Setup instructions (clone, install, configure `.env.local`, run migrations, start dev server)
- Login instructions (how to create first user in Supabase dashboard)
- License badge

### ARCHITECTURE.md

Must include:
- High-level folder structure
- Data model overview (reference to Prisma schema)
- Authentication flow diagram
- Route protection strategy
- Future phases preview (4 AI roles, skill taxonomy placeholder)

### CONTRIBUTING.md

Must include:
- Local development setup steps
- Coding conventions (TypeScript strict mode, Prettier, ESLint)
- Commit message format
- Branch naming and PR process
- How to run tests (once Phase 1+ adds tests)

### DECISIONS.md

Format:
```markdown
# Technical Decisions

## [YYYY-MM-DD] Decision Title

**Context**: Why this decision was needed
**Decision**: What was chosen
**Consequences**: Impact and trade-offs
```

Start with initial decisions:
- Next.js 16 over other frameworks (following PRD constraint)
- Supabase over separate Postgres + Auth.js (PRD rationale: simplicity)
- Prisma over other ORMs (PRD constraint, well-supported pattern)

## Error Handling

### Authentication Errors

**Login failure scenarios**:
1. Invalid credentials → Display user-friendly error message below form
2. Network error → Display "Unable to connect" message with retry prompt
3. Supabase service unavailable → Display error with status page link

**Session expiration**:
1. Middleware detects expired session → Redirect to `/login`
2. Show toast notification: "Session expired, please log in again"

### Database Connection Errors

**Prisma connection failures**:
1. Invalid `DATABASE_URL` → Fail at build time with clear error
2. Database unreachable → API routes return 503 with retry-after header
3. Migration failures → Provide instructions to reset database

### Environment Configuration Errors

**Missing environment variables**:
1. Detect at application startup (in `next.config.js`)
2. Print helpful error message listing missing variables
3. Reference `.env.example` file location
4. Exit with non-zero code to prevent silent failures

### Development vs Production

- **Development**: Show detailed error messages with stack traces
- **Production**: Log full errors server-side, show generic messages to users
- Use `process.env.NODE_ENV` to differentiate behavior

## Testing Strategy

Phase 0 has minimal testing since it's infrastructure setup. Testing strategy will be defined in Phase 1 when business logic is introduced.

### Manual Testing Checklist for Phase 0

1. **Environment setup**:
   - [ ] `.env.local` populated with valid credentials
   - [ ] `npm install` completes without errors
   - [ ] `npx prisma migrate dev` creates all tables

2. **Development server**:
   - [ ] `npm run dev` starts without errors
   - [ ] Application accessible at `http://localhost:3000`
   - [ ] No TypeScript compilation errors
   - [ ] Hot reload works on file changes

3. **Authentication flow**:
   - [ ] Visiting `/` redirects to `/login` when not authenticated
   - [ ] Login form renders correctly
   - [ ] Invalid credentials show error message
   - [ ] Valid credentials redirect to `/dashboard`
   - [ ] Dashboard shows user email
   - [ ] Sign-out button redirects to `/login`
   - [ ] Visiting `/login` when authenticated redirects to `/dashboard`

4. **Route protection**:
   - [ ] Accessing `/dashboard` without auth redirects to `/login`
   - [ ] After login, protected routes are accessible

5. **Database**:
   - [ ] All tables from Prisma schema exist in database
   - [ ] Can query `User` table via Prisma
   - [ ] Connection pooling works (no "too many connections" errors)

6. **Documentation**:
   - [ ] `README.md` has complete setup instructions
   - [ ] `ARCHITECTURE.md` describes system structure
   - [ ] `CONTRIBUTING.md` has development guidelines
   - [ ] `CHANGELOG.md` documents Phase 0 changes
   - [ ] `DECISIONS.md` logs initial technical choices

7. **Git setup**:
   - [ ] Repository initialized
   - [ ] `.gitignore` excludes sensitive files
   - [ ] Initial commit uses Conventional Commits format
   - [ ] Ready to tag as `v0.1.0`

### Future Testing (Phase 1+)

- **Unit tests**: For XP Engine, deterministic rules (Section 7, 9)
- **Integration tests**: For API routes and database operations
- **Property-based tests**: For correctness properties defined in requirements
- **E2E tests**: For critical user flows (login, quest completion, etc.)

Test framework decisions deferred to Phase 1 when business logic requires testing.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Phase 0 is primarily infrastructure setup, so correctness properties focus on authentication flows, route protection, and configuration validation rather than business logic. Most acceptance criteria are structural checks (file existence, configuration presence) which are verified through examples rather than properties.

### Property 1: Complete Authentication Flow

*For any* user with valid Supabase credentials, when they submit the login form, the system should authenticate them and redirect to the dashboard displaying their email address.

**Validates: Requirements 4.3, 4.4, 9.3**

**Rationale**: This property validates the end-to-end authentication flow, ensuring that valid credentials result in successful authentication, proper session establishment, and correct routing. It subsumes individual checks for authentication and redirect behavior.

### Property 2: Route Protection

*For any* protected route (any route under `/dashboard` or future protected routes), when an unauthenticated user attempts to access it, the system should redirect them to the login page.

**Validates: Requirements 4.2, 4.5**

**Rationale**: This property ensures the security boundary is enforced consistently across all protected routes, preventing unauthorized access regardless of which specific protected route is targeted.

### Property 3: Authenticated Dashboard Access

*For any* authenticated user, when they navigate to the dashboard, the system should display their email address retrieved from their Supabase session.

**Validates: Requirements 5.2, 5.3**

**Rationale**: This property validates that authenticated users can access the dashboard and that their session data is correctly retrieved and displayed, which is fundamental to user identity verification.

### Property 4: Sign-Out Flow

*For any* authenticated user, when they click the sign-out button from the dashboard, the system should clear their session and redirect them to the login page.

**Validates: Requirements 9.4**

**Rationale**: This property ensures that session termination works correctly for all users, allowing them to securely end their authenticated session.

### Property 5: Environment Configuration Validation

*For any* required environment variable that is missing, the system should fail to start and display a clear error message indicating which variable is missing.

**Validates: Requirements 6.1, 6.2, 6.5**

**Rationale**: This property ensures robust configuration validation, preventing the application from starting in an incomplete or insecure state. It applies to all required variables (OPENAI_API_KEY, Supabase credentials, DATABASE_URL).

### Non-Property Acceptance Criteria

The following acceptance criteria are verified through example-based tests or manual verification rather than properties:

**Project Structure and Configuration** (Requirements 1.1-1.5, 2.1-2.5, 3.1-3.4, 7.1, 7.3-7.4, 8.1-8.5, 9.5):
- Next.js 16 with App Router and TypeScript setup
- Tailwind CSS and shadcn/ui configuration
- Prisma schema completeness
- Documentation file existence and structure
- Git repository initialization
- TypeScript compilation success

These are verified once during setup through manual checklists and structure validation, not through repeated property-based testing.

**Database Migration** (Requirement 3.5):
- Verified by running migration and checking database schema

**Process Constraints** (Requirements 7.2, 7.5):
- Conventional commit format and version tagging are enforced through documentation and git hooks, not runtime properties

