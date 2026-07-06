# StoryForge

**Become the protagonist of your own entrepreneurial journey.**

StoryForge is an RPG-style application that gamifies your entrepreneurial journey. Real actions (customer calls, shipped features, reading) become quests, XP, skill growth, and a narrated story.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🎮 **RPG-style progression** - Level up across 11 skill trees
- 🎯 **Quest system** - Track and complete entrepreneurial tasks
- 🤖 **AI-powered storytelling** - Daily briefings and milestone narratives (Phase 3+)
- 📊 **Skill tracking** - Monitor growth across Core and Support skills
- 🎨 **Terminal aesthetic** - Dark theme with typewriter effects

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **AI**: OpenAI API (Phase 3+)
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- A Supabase account ([supabase.com](https://supabase.com))
- OpenAI API key (for Phase 3+)

## 🚀 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/parsar2025/StoryForge.git
cd StoryForge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key (safe for browser)
- `DATABASE_URL` - Your Supabase Postgres connection string (use Session Pooler, not Direct)
- `OPENAI_API_KEY` - Your OpenAI API key (not used in Phase 0)

Get these from:
- **Supabase keys**: Click the **Connect** button at the top of your Supabase project dashboard, or go to Project Settings → API Keys
- **Database URL**: Click **Connect** button → Choose "Session pooler" tab (not Direct connection)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
```

This creates all the necessary tables in your Supabase database.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create your first user

Since this is a single-user app, create your account directly in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Users
3. Click "Add user" → "Create new user"
4. Enter your email and password
5. Use these credentials to log in to StoryForge

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design decisions
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [DECISIONS.md](./DECISIONS.md) - Technical decision log

## 🗺️ Roadmap

- **Phase 0** (v0.1.0) ✅ - Scaffolding & authentication
- **Phase 1** (v0.2.0) - Core CRUD + Skill Tree seeding
- **Phase 2** (v0.3.0) - Dashboard with progress bars
- **Phase 3** (v0.4.0) - Dungeon Master quest generation
- **Phase 4** (v0.5.0) - Historian & milestones
- **Phase 5** (v0.6.0) - Daily Briefing system
- **Phase 6** (v0.7.0) - Mentor chat
- **Phase 7** (v1.0.0) - Polish & v1 release

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built with inspiration from Civilization VI's era score system and classic RPG progression mechanics.

---

**Current Version**: Phase 0 (v0.1.0) - Scaffolding Complete
