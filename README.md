# RealLife

<p align="center"><a href="./README.ko.md">한국어</a></p>

**RealLife** is a web app that turns everyday to-dos into game quests. The final goal is a mobile app; the web comes first so the core can be finished in time. You register a to-do as a quest and get gold and XP when you do it. Put it off and you lose gold and XP. The gold you collect buys real-life rewards you set yourself (one round of a game, a cup of coffee).

The aim is to keep you doing the things that are easy to put off alone, through game rules that show the reward and the cost right away.

- **Quests** — a deadline quest is registered on its own. A routine repeats on chosen weekdays and, on each of those days, writes one all-at-once quest due that day. You pick a category, a difficulty and a title template. A deadline is steady or all at once. Steady records the days you worked on it with "check today". All at once has no check today, and its reward and penalty stay on the daily column however long the gap is
- **Rewards** — a base amount set by difficulty and duration, multiplied by the share of checked days, the job multiplier, the streak multiplier and a bonus for a completion note. The register form shows the expected amount; the result shows what was applied
- **Critical hits** — each completion has a 10% chance to double the gold, and a tenth of those triple it. Bigger critical hits get bigger effects and sounds
- **Streak** — completing at least one quest a day keeps it going, and a longer streak raises the reward multiplier
- **Penalties and lethargy** — missing a quest whose due date has passed costs gold and XP and turns on lethargy, whether a routine wrote it or not. Lethargy ends when any quest is completed. Settlement runs just after midnight in Seoul and when you open the app
- **Wallet and debt** — gold can go down to -30 (debt), paid back automatically from the next rewards. On a day you gave in and enjoyed a reward before buying it in the shop, you take the gold off yourself with a post-hoc deduction
- **Levels and titles** — XP raises your level, and every level-up gives a gacha ticket. Every tenth level gives a title
- **Stats** — stamina, intellect and sense grow with the categories of the quests you complete, shown as a radar chart
- **Jobs** — student, office worker or freelancer, each earning more in its own categories. More jobs will come
- **AI monsters** — registering a deadline quest or a routine turns the to-do into one monster in the background. The kind is one of eight, the picture key matches the kind, and AI writes the name and the description. The title stays as entered while that runs, and if it fails. Gold and XP are set by the rules, not by AI
- **AI bosses** — a big goal becomes a boss. Confirming a goal, a due date and a category creates the deadline subquests, the subroutines and the boss HP in one step. At most three bosses are in progress. Completing a subquest cuts HP by the difficulty score. The first settlement after the due date clears the boss at 80% of max HP and fails it otherwise. The name is written with a boss prompt. If that fails, the title stays the goal
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

A deadline quest is registered with a category, a title, a difficulty and a due date. The title is 1 to 50 characters. A routine is registered on its own, with the weekdays it repeats.

- **Categories** are exercise, daily life, study, work, creative and mind. Each category has two title templates, which can be edited after picking
- **Difficulty** is easy, normal or hard. A recommendation needs a title and a category. The server counts this user's quests in that category over the last 14 Seoul days, today included: how many were completed, and how many were missed (not completed, and due from the start of those 14 days through yesterday). It sends the title, the category and those two counts. AI returns one of the three difficulties and one line of reason. It does not set an amount. An empty title is 400. Then the two counts. Then the limit on calls made inside the request; if it is full, 503. Then AI
- A **main quest** is a boss for a big goal. The user sends a goal, a due date and a category. Subquests are routines and deadline quests. A deadline subquest counts as one time. A routine counts the days it is scheduled from the confirm day through the boss due date, including both ends. Easy is 1, normal is 2 and hard is 3. Boss HP is the sum of times × that score. A deadline subquest cannot end after the boss. There are at most 10 subquests, and eleven is rejected. A suggestion uses only as many as needed, usually 3 to 7. A deadline before today in Seoul, or after the boss deadline, is left out. If none remain, the suggestion is rejected. Confirming creates the boss, the deadline subquests and the subroutines in one transaction, and stores that HP on the boss. The request does not send times or HP. If the write fails, nothing is created. At most three bosses are in progress, and another confirm is rejected. After confirm, one task picks a boss kind and writes a name and a description with a boss prompt. The kinds are minotaur, hydra, cerberus, kraken, chimera, vampire, giant and abyss_lord. If that fails, the title stays the goal. A boss is not a quest: it is not in the quest list, it is not completed or deleted as a quest, and it is not charged a deadline penalty. Its subquests are. A subquest points at the boss. The list includes the boss title (the goal) and the boss name (the monster name when the boss has one, otherwise null). A subroutine points at the boss too. `POST /api/quests` registers a deadline quest only. Updating, pausing, resuming or deleting a subroutine is 400, so its HP stays on the days counted at confirm. Completing a subquest cuts the boss HP by the difficulty score: easy 1, normal 2, hard 3. HP stops at 0. A boss that already has a result is not cut. The first settlement after the due date judges it. Dealt HP of 80% or more of the max is a clear, and anything less is a failure. Clear gold and XP are the dealt HP times 10. Clear tickets are 1, plus 1 for every 40 dealt HP, and they stop at 5. A level-up from that XP adds its own tickets on the same wallet entry. Failure and abandon gold and XP are the HP still short of that 80% line times 5. The job multiplier and the streak multiplier are not applied. 10 and 5 are placeholders, before balance. Clear XP is also added to the boss category's stat. Gold still stops at -30 and XP at 0 within the current level. `POST /api/bosses/:id/abandon` leaves the boss row and records the result as abandoned. It deletes the subroutines and the subquests that are not finished. A boss that is already finished is 409. `GET /api/bosses` returns only bosses still in progress. Each boss has `subquests`, one row per item put in at confirm (at most 10). A routine row has `done` (how many spawned quests were completed), `missed` (spawned, not completed, and due before today in Seoul) and `remaining` (scheduled days from the confirm day through the boss due date, minus scheduled days through yesterday, minus 1 when today's spawned quest was completed or deleted). A deadline row has `status` `open`, `done` or `missed`. Each row has `expectedGold` and `expectedXp`, the same calculation as `GET /api/quests`; a routine is one spawned day quest. Order is remaining, then done, then missed; within a group, confirm order. `GET /api/bosses/unseen` items include `boss` (name, picture key and the rest, only when ready) and `bossStatus`. The result is shown once, the first time it is opened after judgment. Past bosses are read by page.

- **Routine** — stored on its own, not as a quest. Pick weekdays (all seven means every day), optionally every other week. Each scheduled day writes one all-at-once deadline quest due that day, and that quest is what you complete, once. A missed day cannot be filled in later. A routine can be paused: pausing starts the next day, and resuming starts the same day. At 00:01, and when the quest list is loaded, the order is settlement, then judgment, then removal of subroutines whose boss already has a result, then the write. A subroutine whose boss due date is before today is not written. Registering a routine, or turning it back on, also writes when today is scheduled. Deleting that quest, or turning the routine off and back on the same day, does not write another quest that day. A routine that has not written one today still does, including one just registered or whose weekdays now include today. Deleting the routine leaves the quests it already wrote, and their monsters. The day's quest uses the routine's monster. Changing the title clears the monster and queues a monster task again. The response does not wait. While that task is waiting or running, the routine response is generating and there is no monster.
- **Deadline** — completed once by the due date. From the day after the due date it can no longer be completed; there is no grace period. Each day you work on it before then is recorded with **check today** — once a day, only on that day. Check-ins do not count toward the streak

A quest can be deleted while it is still open and its due date is today or later in Seoul. A completed quest, or one whose due date has passed, cannot be deleted.

Deletion is free only when the quest was registered today, has no check-in today, was not written by a routine, and is not a boss subquest. Any other deletion costs the same gold and XP as missing it. A quest a routine wrote uses the daily penalty. Any other quest uses the deadline penalty for the gap from the day it was created to the due date. All at once stays on the daily column. Gold stops at -30 and XP stops at 0 within the current level. The quest list shows those amounts, and the delete confirmation shows the gold and XP that will be taken off. When both are 0, the confirmation shows that nothing is taken off. Deleting does not turn on lethargy.

Registering a deadline quest or a routine enqueues one monster and returns immediately, with the title that was sent. The kind is one of slime, bat, goblin, wolf, orc, skeleton, golem and dragon, and the picture key is that kind. AI picks the kind and writes the name and the description.

The list reports where that work stands. While the task is waiting or running, the status is generating and there is no monster. When it succeeds, the monster is kept and the status is ready: kind, picture key, name and description. The shown name is the monster name; without a monster it is the registered title. When it fails, or the result is not a valid monster, the status is failed and there is no monster. The title stays as registered. A failed monster can be made again. With no monster and no task, there is no status and no monster. The full quest history is read by numbered pages of 5, 10, 15 or 20, default 20.

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

On completion the result opens first. After the response it shows the amount received, what raised it (job, streak, note, critical hit) and how much it was reduced by missed check-ins, together with the battle log.

The completion record stores a battle log. When there is a note, AI writes 2 or 3 lines within 3 seconds. When there is no note, or it takes longer than 3 seconds, or it fails, or the limit on calls made inside the request is full, the log is two fixed lines. With no monster the name is "이름 모를 몬스터".

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

- **A missed quest** is one still open whose due date falls on a settled day. It costs gold and XP and turns on **lethargy**. A quest a routine wrote costs easy -5, normal -10, hard -20 in both gold and XP. Any other quest uses the table below. Lethargy ends when any quest is completed. A settled day with no missed quest leaves lethargy as it is. A paused routine writes no quest, so it is not missed
- **A missed deadline** is charged once, at the first settlement after the due date. A steady deadline's amount depends on the gap from the day it was created to the due date. One done all at once uses the daily column: easy -5, normal -10, hard -20

| Difficulty | Daily | Weekly | Long-term |
| ---------- | ----- | ------ | --------- |
| Easy       | -5    | -10    | -15       |
| Normal     | -10   | -20    | -30       |
| Hard       | -20   | -40    | -60       |

XP only goes down to 0 within the current level, and the level never drops. Gold never goes below -30.

## Wallet and debt

The wallet shows the balance and the history. Each entry has a kind, a gold amount and a ticket count. The cause is a quest id or a boss id. A purchase stores the reward name instead, with no quest or boss id. Deleting a quest clears the quest id. XP is not stored on the entry. Kinds include completion, penalty, post-hoc deduction, boss clear, boss fail, boss abandon and purchase.

Gold can go down to -30. That is **debt**. Debt is not paid back separately; it fills up as the next rewards come in. No critical hits happen while in debt.

On a day you gave in and enjoyed a reward before buying it in the shop, you take the gold off yourself with a **post-hoc deduction**. It takes an amount only, and refuses an amount that would go past the debt limit.

## Shop

Gold buys a real-life reward. Buying deducts the gold and stops there; there is no inventory. A purchase is allowed only when the balance is at least the price. It does not go into debt.

The catalog is five items, the same for everyone, not stored in the database. Prices are placeholders, before balance:

| Item                     | Gold |
| ------------------------ | ---- |
| 게임 플레이권 1시간      | 100  |
| 유튜브/영상 시청권 1시간 | 100  |
| 디저트 / 커피 구매권     | 300  |
| 배달음식 주문권          | 500  |
| 카페 / 영화권            | 1000 |

You can register up to 20 of your own rewards. A name is 1–50 characters. The kind is one of the five catalog kinds. The price is 1–99,999 gold. The suggested price is the catalog price of that kind. AI does not set it.

## Levels, titles and stats

| Level | XP to the next level |
| ----- | -------------------- |
| 1–10  | 100 XP               |
| 11–30 | 200 XP               |
| 31–49 | 400 XP               |
| 50    | max level            |

Every level gained gives one gacha ticket. Reaching levels 10, 20, 30, 40 and 50 for the first time gives a title. A title already earned is not announced again, even after a job change.

There are three stats: stamina, intellect and sense. Exercise and daily life build stamina, study and work build intellect, creative and mind build sense. Each completion adds its XP to that category's stat. A boss clear adds its XP to the boss category's stat.

## Settings

- **Theme** — light or dark. Until one is picked, it follows the device setting
- **Sound effects** — on or off, volume 0–100. On and 70 by default

Settings are saved in this browser, not in the account.

## Stack

- **Server**: NestJS 12, Drizzle ORM (PostgreSQL), Better Auth, `@nestjs/schedule`, nodemailer, Gemini API (`@google/genai`, AI assistant)
- **Web**: Vue 3, Vite 8, Vue Router 5 (file-based routing), Pinia, vue-i18n, Tailwind CSS v4, canvas-confetti, Howler
- **Shared**: TypeScript. The `shared` workspace holds types, constants, the reward calculation and Seoul calendar helpers used by both the server and the web
- **Tooling**: pnpm workspace, oxlint, oxfmt, husky + lint-staged, Docker Compose
- **Planned**: S3-compatible storage (AWS SDK v3 + MinIO, character images)

## Project structure

```
real-life/
├── server/                # NestJS API server
│   ├── src/
│   │   ├── auth/          # sign-up, sign-in, email verification, onboarding, account deletion (Better Auth)
│   │   ├── quests/        # deadline quests, routines, completion, check today, penalty settlement
│   │   ├── wallet/        # balance, history, debt, post-hoc deduction
│   │   ├── shop/          # catalog, custom rewards, purchase
│   │   ├── progress/      # level, XP, titles, streak, gacha tickets
│   │   ├── stats/         # stat totals
│   │   ├── job-change/    # job change
│   │   ├── ai/            # AI interface and Gemini implementation
│   │   ├── ai-queue/      # AI job queue and worker
│   │   ├── database/      # Drizzle schema
│   │   └── common/        # shared filters
│   └── drizzle/           # migrations
├── web/                   # Vue 3 + Vite client
│   └── src/
│       ├── routes/        # pages (home, quests, bosses, stats, wallet, job, auth)
│       ├── components/    # per-page components (including boss/) and shared UI
│       ├── lib/           # API calls, reward display, confetti, sounds, saved settings
│       ├── composables/   # useApi, useQuestBoard
│       ├── stores/        # sign-in state (Pinia)
│       └── i18n/          # Korean and English copy
├── shared/                # types, constants, reward/penalty calculation and Seoul calendar helpers shared by server and web
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
