# Architecture

<p align="center"><a href="./ARCHITECTURE.ko.md">한국어</a></p>

A web app where you register to-dos as quests and receive gold and XP when you complete them. A quest is registered as a routine or a deadline quest. If a routine's scheduled day or a deadline quest's due date passes without completion, settlement deducts gold and XP.

## Core design

1. Penalties are settled for all missed days at once. The last settled date is stored, and settlement is called when the home page opens and right before a completion. The server also settles every user just after midnight in Seoul. Why: so that wallet and stats values are correct the same day even for users who do not open the app. Overlapping calls never apply the same penalty twice, because of the last settled date and a per-user lock.
2. A completion commits settlement first, then starts the completion. They are separate transactions. Why: accumulated penalties must be applied first for the balance and XP to be right, and settlement should stay even if the completion fails.
3. The gold floor is -30. Why: to keep debt from growing without end.
4. XP is deducted only down to 0 within the current level, and the level never drops. Why: to avoid losing levels.
5. Days are counted on the Seoul calendar. Why: to match the day the user actually lives.
6. After a Google account is created, or after a session is created, the server checks: only when the user exists, the email is not verified yet, and a Google account is linked, it marks the email verified and clears the password of the email (credential) account. It does not check whether a password exists. Why: to stop someone who signed up first with an unverified email from later getting into that account.
7. Every balance change leaves a kind (completion, penalty, post-hoc deduction) and an amount in the wallet history. The history does not record which quest caused it.
8. Sign-in is Better Auth, and sessions are stored in the `session` table.

## System (development)

![System](img/dev_env_architecture.png)

### Not shown in the diagram

- The browser gets the Google ID token from Google directly and sends it to the server's `/api/auth`.
- Email sign-in needs email verification.
- In development, Vite's dev server proxies `/api` requests to the server.
- The production Compose starts postgres and server; web is not in Compose.

## Code structure

### Server (`server/src/`)

```
auth/                           sign-up, sign-in (Better Auth), email verification, onboarding, account deletion
  auth.ts                       Better Auth configuration
  job-class.guard.ts            global guard that blocks app APIs for accounts without a job
quests/                         every quest rule
  quests.service.ts             register, list, check today, routine pause/resume, give up
  quest-completion.service.ts   completion: settle → compute reward → update wallet and progress
  quest-penalty.service.ts      settle missed days (missed routines, passed deadlines)
  quest-settlement.scheduler.ts settle everyone at 00:01 Seoul
  quest-crit.roller.ts          critical-hit roll (CRIT_FORCE)
  quest-calendar.ts             Seoul date helpers
wallet/                         balance, history, post-hoc deduction
progress/                       level, XP, titles, streak, gacha tickets
stats/                          stat totals
job-change/                     job change
database/schema/                Drizzle tables (one file per table)
common/filters/                 filter that turns exceptions into HTTP responses
```

### Shared (`shared/src/`)

```
quest-completion.ts   reward table amounts, job and streak multipliers, final amount, level-up
quest-penalty.ts      penalty amounts, gold and XP floors
constants/            reward table, penalty table, critical-hit odds, jobs and other constants
types/                response types exchanged by the server and the web
```

### Web (`web/src/`)

```
routes/        pages (the file name is the URL): home, quests, stats, wallet, job, sign-up/sign-in/onboarding
components/    a folder per page (home, quest, wallet, stats, job, settings, auth) and shared ui/
lib/           server calls (quests, wallet, home, stats, jobChange), display calculation (questReward), confetti, sounds, saved settings
composables/   useApi (the single entry for server calls), useQuestBoard (quest list, completion and check-in state)
stores/        sign-in state and account API calls (Pinia)
auth/          Better Auth client
i18n/          Korean and English copy
```

### Rules the code keeps

- Gold, XP and penalty amounts are computed only by functions in `shared`. The server pays with them; the web uses the same functions only to show estimates.
- Controllers only take the request and call a service. Rules live in services.
- Every server call from the web goes through `useApi`. Feature calls such as quests and wallet are collected in `lib/`; account APIs are called from `stores/auth.ts`.

## Inside the server

Main call relations:

- A quest completion calls settlement, then adds gold to the wallet.
- Settlement deducts gold from the wallet.
- A job change adds no gold. It only resets level and XP to 1 and 0, and the job cannot change again until 7×24 hours after the last change.

## Quest completion flow

<a href="img/quest_complete_flow.png"><img src="img/quest_complete_flow.png" alt="Quest completion flow" width="500"></a>

### Worth noting

- Settlement is committed first. If the completion fails, settlement stays.
- A routine gets the full daily amount. A steady deadline quest gets the check-in ratio. A same-day deadline quest, and a deadline done all at once, gets the full daily amount with no ratio.
- Only steady deadline quests whose creation day differs from the due date collect check-ins through `POST /api/quests/:id/day-marks`. A deadline done all at once cannot check today.
- For a steady deadline quest, a gap of 1 day or more with no check-ins pays 0 gold and XP. A deadline done all at once pays the full daily amount whether or not there are check-ins. The completion record stays, and that deadline quest can no longer be given up.
- Completing a routine clears the status effect. Completing a deadline quest leaves it.

### Failures

The filter answers with the exception's status code as it is.

| Condition                                | Status |
| ---------------------------------------- | ------ |
| The note is longer than 500 characters   | 400    |
| Completed before the creation day        | 400    |
| A routine, and today is not a chosen day | 400    |
| A routine, and this is a rest week       | 400    |
| Outside the deadline period              | 400    |
| No job at the settlement step            | 403    |
| No job at the reward step                | 403    |
| The quest id is malformed                | 404    |
| Not the user's quest                     | 404    |
| The routine was already completed today  | 409    |
| The deadline quest was already completed | 409    |

### Reward calculation

A routine uses a gap of 0 days, which gives the full daily amount.

A steady deadline quest uses the gap between its creation day and the completion day. 0 is the daily table, 1 to 7 is the weekly table, 8 or more is the long-term table. A deadline done all at once uses the daily table and a ratio of 1, so the result's checked days and elapsed days are both 1.

For a steady deadline quest, a gap of 1 or more counts both ends as elapsed days. Check-ins never exceed that count. The reward is the table amount × check-ins / elapsed days. A deadline done all at once pays the full daily amount whether or not there are check-ins.

A multiplier applies by job and the category's stat. Exercise and daily life are stamina, study and work are intellect, creative and mind are sense.

With a streak of 3 days or more, the streak multiplier also applies to gold and XP: `1–2` days is 1, `3–6` is 1.1, `7–29` is 1.2, `30` or more is 1.5. Deadline quests are included. The streak goes up the moment the day's first completion is made, and that completion already uses the new count.

With a note, 10% is added to that result. Without one, nothing is added.

Gold can get a critical hit. Each completion has a 10% chance; a hit is ×2 nine times out of ten and ×3 one time in ten — 9% and 1% overall. XP is not affected. No roll happens when the balance just before completion is below 0. The job multiplier, streak multiplier, note and critical hit are all multiplied, then rounded once at the end.

The completion response's `applied` holds the base amount, check-ins and elapsed days, job multiplier, streak multiplier, note bonus and critical multiplier used in the calculation.

### XP and levels

| Current level | XP to the next level             |
| ------------- | -------------------------------- |
| 1–10          | 100                              |
| 11–30         | 200                              |
| 31–49         | 400                              |
| 50            | no more levels; level XP stays 0 |

Every level gained adds one gacha ticket. Reaching level 10, 20, 30, 40 or 50 gives a title.

## Penalty settlement flow

<a href="img/penalty_flow.png"><img src="img/penalty_flow.png" alt="Penalty settlement flow" width="500"></a>

Yesterday is the day before today on the Seoul calendar. If the last settled date is yesterday or later, nothing is settled. Otherwise every day from the next day up to yesterday is checked one by one. Today is never settled.

### Worth noting

- Gold and XP are deducted for current routines and for deadline quests past their due date. Lethargy turns on only for missed routines.
- A day with no scheduled routine leaves the status effect as it is. If that day had no completion, only the streak goes to 0.
- The streak goes up only on a first completion; settlement only resets past days with no completion to 0.
- Today is never settled.
- Levels do not change in this settlement.
- A deadline quest not completed by its due date is charged once, at the first settlement after the due date. Completed quests are not charged.

### Rules

| Rule                   | Value                                                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Easy penalty           | 5 gold, 5 XP                                                                                                                                                                                                                                                                               |
| Normal penalty         | 10 gold, 10 XP                                                                                                                                                                                                                                                                             |
| Hard penalty           | 20 gold, 20 XP                                                                                                                                                                                                                                                                             |
| Gold floor             | -30, three times the easy daily gold of 10. Any deduction beyond it is dropped                                                                                                                                                                                                             |
| XP floor               | 0 within the current level. The level number never drops                                                                                                                                                                                                                                   |
| Streak                 | Goes up by 1 on the day's first completion. Past days with no completion become 0 at settlement. Settlement never raises it                                                                                                                                                                |
| Lethargy               | Becomes `lethargy` when a routine is missed. A day with no scheduled routine leaves the status effect as it is                                                                                                                                                                             |
| Deadline quest penalty | A steady deadline is chosen by the gap from creation to due date: 0 days is easy 5 · normal 10 · hard 20, `1–7` days is 10 · 20 · 40, 8 or more is 15 · 30 · 60. All at once uses the daily column however long the gap is. Same number for gold and XP. Streak and lethargy do not change |
