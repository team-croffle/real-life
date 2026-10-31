# RealLife

<p align="center"><a href="./README.ko.md">한국어</a></p>

**RealLife** is a web app that turns everyday to-dos into game quests. The final goal is a mobile app; the web comes first so the core can be finished in time. You register a to-do as a quest and get gold and XP when you do it. Put it off and you lose gold and XP. The gold you collect buys real-life rewards you set yourself (one round of a game, a cup of coffee).

The aim is to keep you doing the things that are easy to put off alone, through game rules that show the reward and the cost right away.

- **Quests** — registered as a routine (repeats on chosen weekdays) or a deadline (done by a due date). You pick a category, a difficulty and a title template. A deadline is steady or all at once. Steady records the days you worked on it with "check today". All at once has no check today, and its reward and penalty stay on the daily column however long the gap is
- **Rewards** — a base amount set by difficulty and duration, multiplied by the share of checked days, the job multiplier, the streak multiplier and a bonus for a completion note. The register form shows the expected amount; the result shows what was applied
- **Critical hits** — each completion has a 10% chance to double the gold, and a tenth of those triple it. Bigger critical hits get bigger effects and sounds
- **Streak** — completing at least one quest a day keeps it going, and a longer streak raises the reward multiplier
- **Penalties and lethargy** — missing a scheduled routine or a deadline costs gold and XP. A missed routine also puts you in a lethargy state. Settlement runs just after midnight in Seoul and when you open the app
- **Wallet and debt** — gold can go down to -30 (debt), paid back automatically from the next rewards. On a day you gave in and enjoyed a reward before buying it in the shop, you take the gold off yourself with a post-hoc deduction
- **Levels and titles** — XP raises your level, and every level-up gives a gacha ticket. Every tenth level gives a title
- **Stats** — stamina, intellect and sense grow with the categories of the quests you complete, shown as a radar chart
- **Jobs** — student, office worker or freelancer, each earning more in its own categories. More jobs will come
- **AI monsters and bosses (planned)** — AI turns a to-do into a monster, writes a battle log from your completion note, and suggests a difficulty. A big goal such as an exam or a race becomes a boss, and AI suggests a plan up to the deadline. Each planned quest you complete wears down the boss's HP, and the boss is judged on the deadline. Gold and XP are set by the rules, not by AI
- **Shop and character (planned)** — buy real-life rewards with gold, and dress up a cat character with accessories from the gacha
- **Notifications (planned)** — due soon, a streak about to break, level-ups, friend and raid news, each one switchable
- **Friends and raids (planned)** — take on a shared goal with friends and wear down a boss's HP with the quests each of you completes. Later, public raids anyone can join
- **Admin (planned)** — manage accounts, notices and reward multipliers
- **Mobile (planned)** — looking first at using it like an app on a phone (PWA)

v0.2 (game feel) is done. Progress by version is in [ROADMAP.md](./ROADMAP.md).

## Account and jobs

Sign up with an email and password, or sign in with Google. An email account can sign in only after the verification link in the email (valid for 24 hours) is opened. A Google account counts as verified. A four-digit tag is added to the nickname automatically, as in `nickname#1234`.

After signing up you pick a job before you can use the app. Each job earns more in some categories.

| Job           | Bonus                                      |
| ------------- | ------------------------------------------ |
| Student       | intellect quests ×1.2                      |
| Office worker | intellect quests ×1.1, stamina quests ×1.1 |
| Freelancer    | sense quests ×1.2                          |

The job can be changed once every 7 days. Changing it resets the level and XP to 1 and 0; gold, gacha tickets and titles stay.

## Quests

A quest is registered with a kind (normal or main), a category, a title, a difficulty and a schedule.

- **Categories** are exercise, daily life, study, work, creative and mind. Each category has two title templates, which can be edited after picking
- **Difficulty** is easy, normal or hard
- A **main quest** is for a big goal. For now it behaves like a normal quest; in v0.3 it becomes a boss

The schedule is one of two.

- **Routine** — pick weekdays (all seven means every day), optionally every other week. It is completed on the chosen weekdays only, once a day. A missed day cannot be filled in later. A routine can be paused: pausing starts the next day, and resuming starts the same day
- **Deadline** — completed once by the due date. From the day after the due date it can no longer be completed; there is no grace period. Each day you work on it before then is recorded with **check today** — once a day, only on that day. Check-ins do not count toward the streak

A quest can be given up. Giving up deletes it with no reward. A deadline quest that has already been completed cannot be given up.

## Rewards

Completing a quest gives gold and XP. The base amount comes from the difficulty and the duration.

| Difficulty | Daily      | Weekly     | Long-term    |
| ---------- | ---------- | ---------- | ------------ |
| Easy       | 10G / 10XP | 30G / 30XP | 50G / 50XP   |
| Normal     | 20G / 20XP | 50G / 50XP | 100G / 100XP |
| Hard       | 30G / 30XP | 80G / 80XP | 150G / 150XP |

A routine always uses the daily amount. A steady deadline quest picks the column from the gap between the day it was created and the day it was completed: the same day is daily, 1–7 days is weekly, 8 or more is long-term. That amount is multiplied by **checked days ÷ elapsed days**, where elapsed days count both the first and the last day. For example, a normal quest that took 6 days with 3 days checked gives 50G × 3/6 = 25G. A deadline done all at once always uses the daily amount, with no check-in ratio, however long the gap is.

Then, in order:

1. the job multiplier (table above)
2. the streak multiplier (see Streak)
3. ×1.1 when a completion note is written
4. the critical hit (gold only)

Gold and XP are each rounded once, at the end.

The register form shows the expected amount: the job multiplier is included, the note and critical hits are not. For a steady deadline quest it is the amount for checking in every day until the due date. For one done all at once it is the daily amount, the same shape as a routine: expected gold and XP.

On completion the app shows the amount received, what raised it (job, streak, note, critical hit) and how much it was reduced by missed check-ins.

## Critical hits

Every completion has a 10% chance of a critical hit. A hit doubles the gold, and a tenth of hits triple it — 9% double and 1% triple overall. XP does not change. No critical hits happen while the gold balance is negative (in debt).

Double and triple hits get bigger effects than a normal completion, and triple is the biggest.

Only one sound plays at a time, chosen in this order: triple > double > level-up > normal completion.

## Streak

Completing at least one quest a day keeps the streak going. It goes up by one the moment the day's first completion is made, and that completion already uses the new multiplier. When a day passes with no completion, the streak goes back to 0.

| Streak          | Multiplier |
| --------------- | ---------- |
| 1–2 days        | none       |
| 3–6 days        | ×1.1       |
| 7–29 days       | ×1.2       |
| 30 days or more | ×1.5       |

The multiplier applies to both gold and XP, for routines and deadline quests alike.

## Penalties and lethargy

Missing what you had to do costs gold and XP. Settlement runs every day just after midnight in Seoul (00:01), when the home page opens, and right before a completion. It goes through the missed days up to yesterday, one day at a time, and never looks at today. Running it again never charges the same day twice.

- **A missed routine** costs easy -5, normal -10, hard -20 in both gold and XP per quest, and turns on **lethargy**. Lethargy ends when a routine is completed. A paused routine is not counted as missed
- **A missed deadline** is charged once, at the first settlement after the due date. A steady deadline's amount depends on the gap from the day it was created to the due date. One done all at once uses the daily column: easy -5, normal -10, hard -20

| Difficulty | Daily | Weekly | Long-term |
| ---------- | ----- | ------ | --------- |
| Easy       | -5    | -10    | -15       |
| Normal     | -10   | -20    | -30       |
| Hard       | -20   | -40    | -60       |

XP only goes down to 0 within the current level, and the level never drops. Gold never goes below -30.

## Wallet and debt

The wallet shows the balance and the history. Each entry has a kind such as completion, penalty or post-hoc deduction.

Gold can go down to -30. That is **debt**. Debt is not paid back separately; it fills up as the next rewards come in. No critical hits happen while in debt.

On a day you gave in and enjoyed a reward before buying it in the shop, you take the gold off yourself with a **post-hoc deduction**. It takes an amount only, and refuses an amount that would go past the debt limit.

## Levels, titles and stats

| Level | XP to the next level |
| ----- | -------------------- |
| 1–10  | 100 XP               |
| 11–30 | 200 XP               |
| 31–49 | 400 XP               |
| 50    | max level            |

Every level gained gives one gacha ticket. Reaching levels 10, 20, 30, 40 and 50 for the first time gives a title. A title already earned is not announced again, even after a job change.

There are three stats: stamina, intellect and sense. Exercise and daily life build stamina, study and work build intellect, creative and mind build sense. A stat is the sum of XP received from completions in its categories.

## Settings

- **Theme** — light or dark. Until one is picked, it follows the device setting
- **Sound effects** — on or off, volume 0–100. On and 70 by default

Settings are saved in this browser, not in the account.

## Stack

- **Server**: NestJS 12, Drizzle ORM (PostgreSQL), Better Auth, `@nestjs/schedule`, nodemailer
- **Web**: Vue 3, Vite 8, Vue Router 5 (file-based routing), Pinia, vue-i18n, Tailwind CSS v4, canvas-confetti, Howler
- **Shared**: TypeScript. The `shared` workspace holds types, constants and the reward calculation used by both the server and the web
- **Tooling**: pnpm workspace, oxlint, oxfmt, husky + lint-staged, Docker Compose
- **Planned**: Gemini API (`@google/genai`, AI assistant), S3-compatible storage (AWS SDK v3 + MinIO, character images)

## Project structure

```
real-life/
├── server/                # NestJS API server
│   ├── src/
│   │   ├── auth/          # sign-up, sign-in, email verification, onboarding, account deletion (Better Auth)
│   │   ├── quests/        # register, list, complete, check today, routine pause/resume, penalty settlement
│   │   ├── wallet/        # balance, history, debt, post-hoc deduction
│   │   ├── progress/      # level, XP, titles, streak, gacha tickets
│   │   ├── stats/         # stat totals
│   │   ├── job-change/    # job change
│   │   ├── database/      # Drizzle schema
│   │   └── common/        # shared filters
│   └── drizzle/           # migrations
├── web/                   # Vue 3 + Vite client
│   └── src/
│       ├── routes/        # pages (home, quests, stats, wallet, job, auth)
│       ├── components/    # per-page components and shared UI
│       ├── lib/           # API calls, reward display, confetti, sounds, saved settings
│       ├── composables/   # useApi, useQuestBoard
│       ├── stores/        # sign-in state (Pinia)
│       └── i18n/          # Korean and English copy
├── shared/                # types, constants and reward/penalty calculation shared by server and web
│   └── src/
├── docker/                # Dockerfile, Compose (dev, prod)
└── docs/                  # architecture document and diagrams
```

## Getting started

```bash
pnpm install                          # once, from the repository root

pnpm docker:dev                       # start dev infrastructure (Postgres, MinIO)

cp server/.env.example server/.env    # environment variables (see server/README.md)
cp web/.env.example web/.env          # if needed

pnpm dev                              # run server + web together
# or one at a time
pnpm dev:server
pnpm dev:web
```

- Server: http://localhost:3000
- Client: http://localhost:5173

## Scripts

| Command                                                     | Description                        |
| ----------------------------------------------------------- | ---------------------------------- |
| `pnpm dev`                                                  | run server + web dev servers       |
| `pnpm build`                                                | production build of server + web   |
| `pnpm typecheck`                                            | typecheck every workspace          |
| `pnpm lint` / `pnpm lint:fix`                               | oxlint                             |
| `pnpm format` / `pnpm format:check`                         | oxfmt                              |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle migrations                 |
| `pnpm docker:dev` / `docker:dev:down`                       | dev Docker Compose                 |
| `pnpm docker:prod`                                          | build and start production Compose |

## More

- Design and flows (completion, settlement, reward calculation): [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- Progress by version: [`ROADMAP.md`](./ROADMAP.md)
- Server details (environment variables, Drizzle, API list): [`server/README.md`](./server/README.md)
- Client details (routing, i18n, styles): [`web/README.md`](./web/README.md)
