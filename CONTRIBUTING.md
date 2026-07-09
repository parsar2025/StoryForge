# Contributing to StoryForge

Thank you for your interest in contributing to StoryForge! This document provides guidelines for local development and contributions.

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- A Supabase account
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/parsar2025/StoryForge.git
   cd StoryForge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and Anthropic API key (`ANTHROPIC_API_KEY`; the AI roles are wired in Phase 3+).

4. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Coding Conventions

### TypeScript

- **Strict mode enabled** - All TypeScript files must pass strict type checking
- **No `any` types** - Use proper types or `unknown` if truly necessary
- **Prefer interfaces over types** for object shapes
- **Use readonly** for immutable data structures

### Code Style

- **Prettier** - Code formatting is handled automatically
- **ESLint** - Linting rules enforced (run `npm run lint`)
- **File naming**:
  - Components: PascalCase (`ButtonGroup.tsx`)
  - Utilities: camelCase (`formatDate.ts`)
  - Routes: lowercase with hyphens (`user-profile/`)

### Component Patterns

- **Server Components by default** - Use `'use client'` only when needed
- **Prop types** - Always define explicit prop interfaces
- **Error boundaries** - Wrap components that may fail
- **Loading states** - Show loading UI for async operations

### Styling

- **Tailwind CSS only** - No custom CSS unless absolutely necessary
- **shadcn/ui components** - Use existing components before creating new ones
- **Dark theme** - All new UI must work with the dark theme
- **Terminal aesthetic** - Monospace for AI-voiced text, sans-serif for UI

## Git Workflow

### Branching Strategy

- `main` - Always deployable, protected branch
- `feature/<short-name>` - New features
- `fix/<short-name>` - Bug fixes
- `docs/<short-name>` - Documentation updates

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code refactoring (no functional change)
- `chore:` - Tooling, dependencies, config
- `test:` - Test additions or modifications

**Examples:**
```
feat: add quest completion tracking

fix: resolve middleware redirect loop on logout

docs: update setup instructions in README

refactor: extract XP calculation to separate module

chore: upgrade Next.js to 16.2.12
```

**Rules:**
- Subject line: max 50 characters, imperative mood
- Body: wrap at 72 characters, explain what and why
- Keep commits focused - one logical change per commit

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Write clear, focused commits
   - Update tests if applicable
   - Update documentation if needed

3. **Test locally**
   ```bash
   npm run build
   npm run lint
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```
   - Use PR template (if available)
   - Link related issues
   - Request review from maintainers

5. **Address feedback**
   - Make requested changes
   - Keep PR scope focused

6. **Merge**
   - Squash merge preferred for clean history
   - Delete branch after merge

## Testing Strategy

### Phase 0 (Current)
- Manual testing checklist (see design document)
- TypeScript compilation (`npm run build`)

### Future Phases
- Unit tests for XP Engine and deterministic rules
- Integration tests for API routes
- Property-based tests (optional, as defined in requirements)
- E2E tests for critical flows (login, quest completion)

Test framework will be decided in Phase 1 and documented here.

## Database Changes

### Migrations

- **Never edit existing migrations** - Always create new ones
- **Run migrations locally first** before committing
- **Describe changes clearly** in migration name

```bash
npx prisma migrate dev --name descriptive_name
```

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name your_change`
3. Commit both the schema and migration files
4. Update type definitions: `npx prisma generate`

## Deployment

Deployment is handled automatically via Vercel:
- `main` branch → Production
- PR branches → Preview deployments

## Questions or Issues?

- **Bugs**: Open an issue with reproduction steps
- **Features**: Discuss in issues before implementing
- **Questions**: Open a discussion or issue

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on what is best for the project
- Show empathy towards other contributors

Thank you for contributing to StoryForge! 🚀
