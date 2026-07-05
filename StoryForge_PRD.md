# StoryForge — PRD v1 (Build-Ready Spec)

> Written for consumption by an agentic coding tool (Claude Code, Cursor, etc.). Every feature has a data model, an API contract, and an acceptance criterion so the agent can implement, self-check, and move on without stopping to ask.

---

## 0. How to use this document (instructions for the agent)

1. Build in the phase order in **Section 12**. Do not skip ahead.
2. Each phase ends with an **Acceptance Criteria** checklist — that's the definition of done.
3. Where a decision isn't specified, make a reasonable choice and log it in `DECISIONS.md` rather than stopping to ask.
4. **Section 2 is not optional decoration — read it before touching any other section.** If you (the agent) are about to add a feature, table, or AI role not described in this document, stop and don't. Simplicity is a hard constraint here, not a preference.
5. All AI calls go through **one shared service module** (`lib/ai/client.ts`).
6. Follow **Section 13 (Git & Versioning)** and **Section 14 (Documentation)** from the very first commit, not retroactively.
7. This is a single-user app. Do not build multi-tenancy, scaling, or auth complexity beyond what's specified.

---

## 1. Vision

**StoryForge** turns one person's entrepreneurial journey into an RPG: real actions (customer calls, shipped features, reading) become quests, XP, skill growth, and a narrated story.

**Tagline:** Become the protagonist of your own entrepreneurial journey.

**v1 constraint:** single user, one active campaign ("Become Entrepreneur"), text-first UI with a terminal/typing aesthetic (Section 11).

---

## 2. Design Constraint: Simplicity First

RPG design docs naturally accumulate attributes, reputation systems, factions, equipment, companions, talent trees, an economy, and a prestige/endgame system. All of that is legitimately interesting. **None of it is in v1, and most of it may never need to exist.**

The test for whether something belongs in this document: **does it serve the daily loop of "pick a quest → do the work → log it → see XP/story update"?** If not, it's out of scope, no matter how good the idea is.

**Explicitly cut from v1**:
- Reputation/faction meters, equipment/inventory bonuses, companions/NPCs as game objects, an in-game economy or "gold," talent-point allocation trees, multiclassing, prestige/reset mechanics.
- Ninety independently-leveled skills. Section 5 explains the two-tier design (leveled trees + tag-only sub-skills) that keeps the depth you want without the maintenance cost.
- Cross-tree XP multipliers (e.g. "Wisdom boosts everything") — see Section 5.3.
- Any AI role beyond the four in Section 6. Not "Analyst," not a fifth role someone thinks of later — fold new needs into Mentor conversations before adding a new automated system.

**The entire "smart"/automated surface area of v1 is four things** (Section 6): one thing that runs once a day, one thing that fires on a milestone, one button that generates quests, and one chat window. If a future idea doesn't fit into one of those four, it's a Post-MVP idea (Section 12), not a v1 idea.

You are building this slowly, for yourself, to actually use — not to demo. A smaller thing you open every morning beats a richer thing you dread opening.

---

## 3. Tech Stack (locked for v1)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js 16** (App Router, Turbopack default) + TypeScript | Stable as of 16.2.x; skip Cache Components/`"use cache"` for v1 — opt-in, adds a caching-mental-model cost you don't need yet for a single-user app. |
| Styling | Tailwind CSS + shadcn/ui | Terminal-inspired theme (Section 11) |
| Backend | Next.js Route Handlers (`app/api/**`) | Supports streamed `ReadableStream` responses, needed for Mentor chat (Section 6.4). |
| Database + Auth | **Supabase** (Postgres + Auth) | Chosen over Neon specifically for the simplicity constraint in Section 2 — bundles Postgres + Auth behind one dashboard/SDK, removing a whole integration (Auth.js) rather than adding one. Neon remains the better pure-Postgres/branching engine if you ever need that; migration is low-friction since both are vanilla Postgres. |
| ORM | Prisma, pointed at Supabase's Postgres connection string | Standard, well-supported pattern. |
| AI | **OpenAI API** (`response_format: json_schema` for structured roles, streaming for chat) | One client module, four prompt roles (Section 6) |
| Deployment | Vercel | |

Env var: `OPENAI_API_KEY`, plus Supabase project URL/keys. Model name lives in one config constant (`lib/ai/config.ts`).

---

## 4. Data Model (Prisma schema)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  character Character?
}

model Character {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id])
  name                 String
  campaign             String   @default("Become Entrepreneur")
  level                Int      @default(1)
  totalXp              Int      @default(0)
  currentTitle         String   @default("Novice Builder")
  lastBriefingGameDate DateTime? @db.Date
  skillTrees           SkillTree[]
  quests               Quest[]
  projects             Project[]
  resources            Resource[]
  activityLogs         ActivityLog[]
  chapters             StoryChapter[]
  buffs                StatusEffect[]
  achievements         Achievement[]
  mentorConversations  MentorConversation[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

enum TreeCategory { CORE SUPPORT }

// The 11 leveled trees — see Section 5 for the full seed list.
model SkillTree {
  id            String       @id @default(cuid())
  characterId   String
  character     Character    @relation(fields: [characterId], references: [id])
  key           String       // e.g. "OPPORTUNITY_HUNTER" — matches lib/game/skillTrees.ts
  displayName   String       // e.g. "Opportunity Hunter"
  emoji         String
  category      TreeCategory
  level         Int          @default(1)
  xp            Int          @default(0)
  xpToNextLevel Int          @default(100)
  quests        Quest[]
  resources     Resource[]
  createdAt     DateTime     @default(now())

  @@unique([characterId, key])
}

enum QuestType { DAILY WEEKLY EPIC BOSS MAINTENANCE }
enum QuestStatus { AVAILABLE ACTIVE COMPLETED FAILED ARCHIVED }

model Quest {
  id                 String      @id @default(cuid())
  characterId        String
  character          Character   @relation(fields: [characterId], references: [id])
  projectId          String?
  project            Project?    @relation(fields: [projectId], references: [id])
  title              String
  description        String
  type               QuestType
  status             QuestStatus @default(AVAILABLE)
  difficulty         Int
  estimatedMinutes   Int
  xpReward           Int
  relatedTreeIds     String[]    // SkillTree ids — where XP actually goes
  trees              SkillTree[]
  subSkillTags       String[]    // freeform tags from lib/game/skillTrees.ts's sub-skill lists — analytics only, not leveled
  prerequisiteId     String?
  phaseOrder         Int?
  deadline           DateTime?
  completionCriteria String
  sourceInput        String?
  aiGenerated        Boolean     @default(true)
  createdAt          DateTime    @default(now())
  completedAt        DateTime?
  activityLogs       ActivityLog[]
}

model Project {
  id          String   @id @default(cuid())
  characterId String
  character   Character @relation(fields: [characterId], references: [id])
  name        String
  description String
  quests      Quest[]
  xpEarned    Int      @default(0)
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now())
}

model Resource {
  id           String     @id @default(cuid())
  characterId  String
  character    Character  @relation(fields: [characterId], references: [id])
  type         String     // BOOK, COURSE, VIDEO, ARTICLE, IDEA, MENTOR
  title        String
  author       String?
  url          String?
  treeIds      String[]
  trees        SkillTree[]
  subSkillTags String[]
  progress     Int        @default(0)
  notes        String?
  createdAt    DateTime   @default(now())
}

model ActivityLog {
  id          String   @id @default(cuid())
  characterId String
  character   Character @relation(fields: [characterId], references: [id])
  questId     String?
  quest       Quest?   @relation(fields: [questId], references: [id])
  startTime   DateTime
  endTime     DateTime?
  durationMin Int?
  notes       String?
  mood        String?
  difficulty  Int?
  reflection  String?
  xpAwarded   Int      @default(0)
  createdAt   DateTime @default(now())
}

enum ChapterTrigger { DAILY_BRIEFING MILESTONE MANUAL }

model StoryChapter {
  id             String         @id @default(cuid())
  characterId    String
  character      Character      @relation(fields: [characterId], references: [id])
  chapterNum     Int
  title          String
  excerpt        String         @db.Text
  narrative      String?        @db.Text
  triggerType    ChapterTrigger
  relatedQuestId String?
  relatedTreeIds String[]
  gameDate       DateTime?      @db.Date
  seenAt         DateTime?
  createdAt      DateTime       @default(now())
}

// Buffs/debuffs — deterministic rules only (Section 9), never AI-judged.
model StatusEffect {
  id          String   @id @default(cuid())
  characterId String
  character   Character @relation(fields: [characterId], references: [id])
  type        String   // BUFF or DEBUFF
  name        String
  description String
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
}

// Legendary Skill unlocks — also deterministic (Section 5.4 / Section 9), fires a MILESTONE chapter.
model Achievement {
  id          String   @id @default(cuid())
  characterId String
  character   Character @relation(fields: [characterId], references: [id])
  key         String   // e.g. "FOUNDERS_INTUITION"
  name        String
  description String
  unlockedAt  DateTime @default(now())

  @@unique([characterId, key])
}

model MentorConversation {
  id          String   @id @default(cuid())
  characterId String
  character   Character @relation(fields: [characterId], references: [id])
  title       String?
  messages    MentorMessage[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model MentorMessage {
  id             String   @id @default(cuid())
  conversationId String
  conversation   MentorConversation @relation(fields: [conversationId], references: [id])
  role           String   // "user" | "assistant"
  content        String   @db.Text
  createdAt      DateTime @default(now())
}
```

**Agent note:** if Prisma's implicit many-to-many (`relatedTreeIds` + `trees`) proves awkward, fall back to explicit join tables — log the change in `DECISIONS.md`.

---

## 5. Skill Taxonomy — The 11 Trees

This is the answer to "where do I see what I'm working on and what needs improvement": it's the **SkillTree** progress-bar list on the dashboard, seeded once at character creation from a fixed config file — not something the AI invents or you hand-configure.

### 5.1 Two-tier design: trees (leveled) vs sub-skills (tags)

Ninety independently-leveled skills would work against Section 2's simplicity constraint — that many XP bars, dependency questions, and per-quest tagging decisions turn a dashboard into noise. Instead:

- **The 11 trees are the only things with level/XP.** This is what renders as progress bars — a genuinely at-a-glance list.
- **Each tree has a fixed list of sub-skill tags** (your "Problem discovery," "Cold outreach," "Copywriting," etc.) — these aren't leveled independently. They're labels attached to a quest or resource to say which facet of the tree it exercised. XP still rolls up to the parent tree, but the tags are what let you filter the journal/activity log by "everything I've tagged Cold Outreach this month" — that's your "what am I actually focusing on" view, without 90 separate leveling systems.

### 5.2 Seed data — `lib/game/skillTrees.ts`

**Core (8):**

| Tree | Sub-skill tags |
|---|---|
| 🔍 Opportunity Hunter | Problem discovery, Customer interviews, Observation, Trend spotting, Market research, First-principles thinking, Systems thinking, Idea generation, Validation, Niche discovery |
| ⚒️ Builder | MVP building, AI tools, Programming, Web development, Automation, Product design, UX, Rapid prototyping, Shipping quickly |
| ⚔️ Sales | Prospecting, Cold outreach, Discovery calls, Objection handling, Closing, Follow-up, CRM, Copywriting, Lead qualification |
| 📣 Marketing | Positioning, Branding, Storytelling, Content marketing, SEO, Paid ads, Social media, Community building, Analytics, Email marketing |
| 🤝 Negotiation & Influence | Negotiation, Persuasion, Active listening, Emotional intelligence, Networking, Public speaking, Conflict resolution, Leadership, Hiring |
| ♟️ Strategy | Business models, Competitive advantage, Pricing, Decision making, Risk management, Long-term planning, Prioritization, Execution |
| 💰 Finance | Accounting, Cash flow, Budgeting, Investing, Unit economics, Profitability, Valuation, Taxes |
| 🧠 Personal Mastery | Discipline, Focus, Time management, Deep work, Stress management, Emotional regulation, Learning, Decision making, Writing, Reflection |

**Support (3):**

| Tree | Sub-skill tags |
|---|---|
| ❤️ Health | Strength, Cardio, Nutrition, Mobility, Recovery, Energy |
| 🌱 Relationships | Family, Friends, Mentors, Business network |
| 📚 Wisdom | Psychology, Economics, History, Philosophy, Technology, Communication |

All 11 are seeded for a character at creation time (Phase 1), each starting at Level 1 / 0 XP. Quests reference one or more trees via `relatedTreeIds` (for XP) and optionally tag `subSkillTags` (for analytics — validated client-side against the tree's configured list, not DB-enforced).

### 5.3 Wisdom's "boosts every other tree" — deferred, not cut

This is a genuinely nice narrative idea, but it means every XP award anywhere in the app needs to check a cross-tree multiplier — real bookkeeping complexity for a flavor mechanic. Per Section 2: **Wisdom is a normal tree in v1**, leveled the same as any other. If it still feels worth it after using the app for a while, it's a clean Post-v1 addition (a multiplier lookup in the XP Engine, Section 7).

### 5.4 Legendary Skills — a milestone, not a 9th thing to grind

Vision, Judgment, Taste, Pattern Recognition, Charisma, Founder Intuition, Leadership, Execution Speed, Adaptability, Resilience, Reputation, Leverage — these unlock as **Achievement** records via deterministic combo rules in `lib/game/legendaryUnlocks.ts` (same rule-based bucket as Section 9's buffs/debuffs, never AI-judged). A starter rule set to build against (tune thresholds later, log changes in `DECISIONS.md`):

| Legendary Skill | Unlock condition (example thresholds) |
|---|---|
| Founder Intuition | Opportunity Hunter ≥ Lv10 AND Strategy ≥ Lv10 |
| Vision | Opportunity Hunter ≥ Lv10 AND Marketing ≥ Lv10 |
| Execution Speed | Builder ≥ Lv15 AND Personal Mastery ≥ Lv10 |
| Charisma | Sales ≥ Lv10 AND Negotiation & Influence ≥ Lv10 |
| Leverage | Finance ≥ Lv10 AND Strategy ≥ Lv10 |
| Resilience | Personal Mastery ≥ Lv15 AND Health ≥ Lv10 |

When one fires, it's simply added to the existing **MILESTONE** trigger list (Section 6.2) — the Historian writes a short excerpt for it exactly like a boss defeat or level-up. No new AI role, no new UI system.

### 5.5 Where this actually shows up in the app

- **Dashboard skill screen:** 11 progress bars, grouped Core / Support, exactly answering "what am I working on and what needs improvement."
- **Focus signal:** one deterministic line on the dashboard — lowest-leveled core tree, or the core tree with the least XP gained in the trailing 7 days. Rule-based (Section 9), not AI-generated.
- **Legendary unlocks:** appear via the existing milestone-toast flow, plus a small "Legendary" list on the character sheet.
- **Sub-skill tags:** filterable in the journal (`GET /api/story?...`) and via `GET /api/activity-log?subSkillTag=`, so "what have I actually been doing under Cold Outreach" is a query, not a new feature.

### 5.6 Other dimensions you could consider (not included — your call)

Offered for completeness, each with the trade-off named, since Section 2 means the default answer is "not yet":

- **Craft/Domain Mastery** — if your specific industry has deep technical expertise separate from general Builder (e.g. a specific regulatory or scientific domain). Worth it only if that domain knowledge is genuinely a distinct axis from shipping product.
- **Ops/Systems** — process design, delegation, tooling/automation of your own workflows, as distinct from Strategy's decision-making focus. Tends to matter more once you have a team; may be premature solo.
- **Content/Writing as its own tree** — currently split across Marketing (storytelling) and Personal Mastery (writing). Worth splitting out only if writing becomes a primary lever (e.g. building an audience) rather than a supporting skill.
- **Reputation (lightweight)** — not the faction-meter system cut in Section 2, but a much smaller version: a simple count of public proof points (shipped things, testimonials, talks given) as a single number on the character sheet, no meter/decay logic. Cheap if you want it, easy to skip.

None of these are recommended for v1 — they're here so the option is visible rather than silently missing.

---

## 6. AI Roles — Exactly Four, Two Automatic and Two Manual

| Role | Trigger | Automatic or Manual | Frequency |
|---|---|---|---|
| **Daily Briefing** | First page load after game-day rollover | **Automatic** | Once per game-day (Section 8) |
| **Historian** | A milestone is achieved (boss defeated, level-up, tree threshold, legendary unlock) | **Automatic** | Every time a milestone fires |
| **Dungeon Master** | "Generate Quests" button, with or without freeform input | **Manual** | On demand |
| **Mentor** | Chat window, open anytime | **Manual** | Ongoing conversation, not a single report |

All four share `lib/ai/client.ts`. The three non-conversational roles return only JSON matching a Zod schema (via `response_format: json_schema`); Mentor streams plain text.

### 6.1 Daily Briefing
- **Input context:** previous game-day's completed quests, activity log entries, XP earned per tree, any level-up.
- **Output schema:** `{ title, excerpt (100-200 words), xpSummary, moodNote? }`
- Stored as a `StoryChapter` (`triggerType: DAILY_BRIEFING`). Shown once via the typewriter reveal (Section 11), then it's a normal journal entry.

### 6.2 Historian (milestone excerpts)
- **Trigger conditions**, defined explicitly in `lib/game/milestoneTriggers.ts` — not left to the model:
  - A `BOSS` quest is completed
  - Character levels up
  - A `SkillTree` crosses a configured threshold (default: 5, 10, 20)
  - A Legendary Skill unlocks (Section 5.4)
- **Output schema:** `{ title, excerpt (50-150 words) }` — short, Civ VI era-score-toast style.

### 6.3 Dungeon Master (manual button, two modes)
- **Mode A — no input:** 1–3 quests generated from current state.
- **Mode B — from input:** freeform text becomes structured quests, sequenced via `phaseOrder`/`prerequisiteId` where implied.
- **Output schema:** `{ quests: [{ title, description, type, difficulty, estimatedMinutes, xpReward, relatedTreeKeys, subSkillTags?, completionCriteria, phaseOrder?, prerequisiteIndex? }] }`
- **Endpoint:** `POST /api/quests/generate` — `{ mode: "auto" }` or `{ mode: "from_input", input }`.

### 6.4 Mentor — a real chatbot, not a report generator
- **Interface:** a chat screen (`/mentor`) — message history, input box, streamed replies.
- **Context injected fresh every message:** current tree levels, active projects, recent activity/reflections, recent story chapters.
- **Conversation history** stored in `MentorMessage`, replayed as normal chat turns.
- **No enforced output schema** — natural conversation. Progress review, weakness analysis, and recommendations are things you ask for, not separate modes.
- **Streaming:** Route Handler proxies OpenAI's streamed response as a `ReadableStream`; frontend renders tokens as they arrive.
- **Endpoints:** `POST /api/mentor/conversations`, `GET /api/mentor/conversations`, `POST /api/mentor/conversations/:id/messages` (streams), `GET /api/mentor/conversations/:id/messages`.

---

## 7. XP Engine (deterministic — never delegate this math to the AI)

```
function computeXp(input: {
  baseByDifficulty: Record<1|2|3|4|5, number>, // default {1:10, 2:20, 3:35, 4:55, 5:80}
  durationMinutes: number,
  hasReflection: boolean,       // reflection length > 40 chars
  isHighDifficulty: boolean,    // difficulty >= 4
  currentStreakDays: number,
  isNovelTree: boolean,         // first time this tree touched in 14 days
}): number
```
- Base XP = `baseByDifficulty[difficulty]`
- +15 if `hasReflection`
- +20 if `isHighDifficulty`
- +10 if streak >= 7 days, +20 if >= 30 days
- +10 if `isNovelTree`
- Cap: 150 XP per quest in v1
- Level-up: `xpToNextLevel = round(100 * level^1.4)`; titles are a static lookup in `lib/game/titles.ts`

---

## 8. Daily Briefing Mechanics — Game-Day Boundary

The "day" rolls over at **02:30 UTC**, not midnight.

```
function getGameDate(now: Date): string /* YYYY-MM-DD */ {
  const rollover = new Date(now);
  rollover.setUTCHours(2, 30, 0, 0);
  const effective = now < rollover
    ? new Date(now.getTime() - 24*60*60*1000)
    : now;
  return effective.toISOString().slice(0, 10);
}
```

On dashboard load, `GET /api/daily-briefing`:
1. Compute `currentGameDate = getGameDate(now)`.
2. If `character.lastBriefingGameDate === currentGameDate`, return `{ alreadyShown: true }`.
3. Otherwise, generate the briefing (Section 6.1), store it, set `lastBriefingGameDate`, return content for the typewriter reveal.
4. Once shown, it's a normal `StoryChapter` — no special replay behavior needed.

Idempotent, computed lazily — no cron job needed.

---

## 9. Deterministic Rules — Buffs, Debuffs, and Legendary Unlocks

Kept outside the AI surface, same principle as the XP Engine. Evaluated by pure rule sets, run on dashboard load and on quest completion:

- **`lib/game/statusEffects.ts`** — e.g. streak ≥ 7 days on any tree → "Momentum" buff; no activity in 3+ days → mild "Rusty" debuff.
- **`lib/game/legendaryUnlocks.ts`** — the combo rules from Section 5.4. On unlock: create an `Achievement`, then fire the existing MILESTONE flow so the Historian writes an excerpt.
- **Focus signal** (Section 5.5) — lowest-leveled core tree, or least XP gained in trailing 7 days; a single computed string surfaced on the dashboard.

This keeps all of it simple, explainable, and free of extra AI calls.

---

## 10. API Contract

- `GET /api/character` / `PATCH /api/character`
- `GET /api/skill-trees` — the 11 trees with levels/XP
- `GET /api/quests?status=&type=` / `POST /api/quests`
- `POST /api/quests/generate` — Dungeon Master, `{ mode: "auto" | "from_input", input? }`
- `PATCH /api/quests/:id`
- `POST /api/quests/:id/complete` — runs XP Engine, checks milestone/legendary triggers, re-evaluates status effects
- `GET /api/projects` / `POST /api/projects` / `PATCH /api/projects/:id`
- `POST /api/activity-log/start` / `POST /api/activity-log/:id/stop`
- `GET /api/activity-log?subSkillTag=` — filter by sub-skill tag
- `GET /api/resources` / `POST /api/resources` / `PATCH /api/resources/:id`
- `GET /api/story?search=&tree=&from=&to=` — journal, paginated
- `GET /api/daily-briefing` — idempotent, Section 8 logic
- `POST /api/mentor/conversations` / `GET /api/mentor/conversations`
- `POST /api/mentor/conversations/:id/messages` (streams) / `GET /api/mentor/conversations/:id/messages`
- `GET /api/dashboard` — aggregate: today's quests, active boss, current chapter, 11-tree snapshot, focus signal, XP, buffs/debuffs
- `GET /api/export` — full data dump as JSON

---

## 11. UI/UX — Typing Effect ("Terminal Box") and Chat

Two distinct motion patterns:

1. **Simulated typewriter reveal** — Daily Briefing and Historian milestone toasts, where the text already exists server-side.
   - Component: `components/TypewriterBox.tsx` — props `text`, `speedMs?` (default ~18ms/char), `onComplete?`.
   - Blinking cursor, click-to-skip, respects `prefers-reduced-motion`.
   - Milestone toasts feel like Civilization VI's era-score banner.

2. **Real token streaming** — Mentor chat only. Text renders as it actually arrives from OpenAI, same mechanism as any modern chat UI. No artificial delay.

Overall theme: dark background, monospace for AI-voiced text, regular UI font for structured data (quest lists, the 11 skill-tree bars).

---

## 12. Build Phases

Each phase ends in a tagged commit per Section 13. Resist adding anything not listed in a phase — check Section 2 first.

### Phase 0 — Scaffolding
Next.js 16/TS/Tailwind/shadcn init, Prisma against Supabase Postgres, Supabase Auth login, git repo initialized with Section 13/14 conventions from commit one.
**Acceptance:** log in, see empty dashboard shell. Tag `v0.1.0`.

### Phase 1 — Core CRUD + Skill Tree Seed
Character auto-creation seeds all 11 `SkillTree` rows from `lib/game/skillTrees.ts`. Manual Quest/Project/Resource CRUD (with `relatedTreeIds` + optional `subSkillTags`), Activity Log start/stop, XP Engine wired.
**Acceptance:** new character has exactly 11 trees at Level 1; manually create/start/complete a quest tagged to a tree; XP/level update correctly. Tag `v0.2.0`.

### Phase 2 — Dashboard + Typewriter Component
Dashboard aggregate endpoint + UI: 11 tree progress bars grouped Core/Support, focus signal, `TypewriterBox` built and demoed, status-effect rules wired.
**Acceptance:** dashboard loads in one request; all 11 trees render grouped; a manufactured 7-day streak shows the Momentum buff; typewriter box is click-skippable. Tag `v0.3.0`.

### Phase 3 — Dungeon Master
Both quest-generation modes, "Generate Quests" UI with optional freeform textarea, quests correctly reference real tree keys and (optionally) sub-skill tags.
**Acceptance:** auto mode produces valid quests tied to real trees; from-input mode breaks a multi-step description into phased quests. Tag `v0.4.0`.

### Phase 4 — Historian / Milestones / Legendary Unlocks
`milestoneTriggers.ts` + `legendaryUnlocks.ts`, automatic firing on boss completion / level-up / tree threshold / legendary combo, toast UI, `Achievement` list on character sheet.
**Acceptance:** completing a BOSS quest produces a milestone toast; manually pushing two trees past a legendary threshold in test data unlocks the Achievement and fires a Historian excerpt. Tag `v0.5.0`.

### Phase 5 — Daily Briefing
Game-date logic (Section 8), idempotent endpoint, dashboard-load trigger.
**Acceptance:** first visit of a new game-day shows the briefing once; refreshing the same game-day doesn't re-trigger it; briefing appears in journal afterward. Tag `v0.6.0`.

### Phase 6 — Mentor Chat
Conversation + message models, streaming endpoint, chat UI at `/mentor`, fresh context injection each turn.
**Acceptance:** a real back-and-forth that references your actual tree levels/recent activity unprompted, and remembers earlier turns in the same conversation. Tag `v0.7.0`.

### Phase 7 — Polish + Full Documentation Pass → v1.0.0
One-click quest start, sub-minute completion logging, buffs/debuffs/focus-signal visibly surfaced, `/api/export` working, README/ARCHITECTURE/CONTRIBUTING complete.
**Acceptance:** a full day's loop (open app, see briefing, pick/generate quest, work, complete, reflect, see XP/story update) takes under 2 minutes of app interaction excluding actual work. **Tag `v1.0.0`.**

### Post-v1 (good-to-haves, each its own `v1.x.0`)
GitHub PR-based XP, calendar sync, Telegram/WhatsApp capture, Kindle import, voice reflections, Wisdom's cross-tree multiplier (Section 5.3), any of the optional dimensions in Section 5.6, reputation/faction meters, equipment/inventory bonuses, companions/NPCs, an in-game economy, talent-point trees, multiplayer/guilds, prestige/reset mechanics, procedurally generated boss battles.

---

## 13. Git Workflow & Versioning

- **Branching:** `main` always deployable. Feature work on `feature/<short-name>` branches, merged via PR.
- **Commits:** Conventional Commits — `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
- **Versioning (SemVer):** `v0.y.z` during build-out (Phases 0-6, breaking changes fine); **`v1.0.0`** exactly when Phase 7's acceptance criteria are met; `v1.x.0` per good-to-have after; `v2.0.0` reserved for a genuine architectural shift.
- **CHANGELOG.md:** Keep a Changelog format, updated in the same commit/PR as the change it describes.
- **Tags:** annotated git tags at the end of each phase, pushed with the corresponding commit.

### 13.1 `.gitignore` (baseline)
```
node_modules/
.next/
.env
.env.local
.ai-dev-log/
```

### 13.2 AI Dev Log (gitignored, for you, not for the repo)
Every completed unit of work appends an entry to `.ai-dev-log/` (one file per day): timestamp, phase/task, files created/modified/deleted, a short plain-language summary of what changed and why. Not committed — your personal audit trail, separate from Section 14's public docs.

---

## 14. Documentation (for the public/open-source repo)

- **README.md** — what StoryForge is, a short gif/screenshot of the typing effect and chat, setup instructions, tech stack, license badge.
- **ARCHITECTURE.md** — data model overview, the four-AI-role design (Section 6), the two-tier skill taxonomy (Section 5) and why, folder structure.
- **CONTRIBUTING.md** — local dev setup, coding conventions, branch/PR/commit conventions.
- **CHANGELOG.md** — as above.
- **LICENSE** — open decision, MIT suggested; log final choice in `DECISIONS.md`.
- **docs/gamification.md** (recommended) — XP formula rationale, milestone/legendary-unlock rule lists, game-date boundary logic, and why Section 2's cuts were made.

---

## 15. Non-Functional Requirements

- Single user, single tenant — no multi-tenancy scaffolding.
- AI cost control: Dungeon Master auto-mode caches its last result, no more than one regeneration per hour.
- `/api/export` exists from Phase 7 at the latest.
- No dark patterns: no streak-shaming, no guilt-based copy. Tone is encouraging, never manipulative.

---

## 16. Success Metrics

- You open the app most mornings without being reminded.
- Time spent on self-tagged "meaningful work" trends up over 90 days.
- Journal entries, reread months later, feel true to what actually happened.
- The dashboard actually answers "what should I focus on" at a glance, and you use the Mentor chat instead of avoiding it.

---

## Appendix: Open Decisions for the Agent to Log in DECISIONS.md

1. Exact difficulty→XP base table values (default in Section 7; tune after real use).
2. Exact tree-level thresholds for milestones — default: 5, 10, 20.
3. Exact legendary-unlock thresholds (Section 5.4 gives starting values — these are explicitly a first guess).
4. Exact status-effect rule thresholds beyond the two defaults in Section 9.
5. Final license choice (default suggestion: MIT).