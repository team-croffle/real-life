# Architecture

<p align="center"><a href="./ARCHITECTURE.ko.md">한국어</a></p>

A web app where you register to-dos as quests and receive gold and XP when you complete them. A deadline quest is registered on its own. A routine writes one all-at-once quest, due that day, on each scheduled day. If that quest or another deadline quest passes its due date without completion, settlement deducts gold and XP.

## Core design

1. Penalties are settled for all missed days at once. The last settled date is stored, and settlement is called when the home page opens and right before a completion. The server also settles every user just after midnight in Seoul. Why: so that wallet and stats values are correct the same day even for users who do not open the app. Overlapping calls never apply the same penalty twice, because of the last settled date and a per-user lock.
2. A completion commits settlement first, then starts the completion. They are separate transactions. Why: accumulated penalties must be applied first for the balance and XP to be right, and settlement should stay even if the completion fails.
3. The gold floor is -30. Why: to keep debt from growing without end.
4. XP is deducted only down to 0 within the current level, and the level never drops. Why: to avoid losing levels.
5. Days are counted on the Seoul calendar. Why: to match the day the user actually lives.
6. After a Google account is created, or after a session is created, the server checks: only when the user exists, the email is not verified yet, and a Google account is linked, it marks the email verified and clears the password of the email (credential) account. It does not check whether a password exists. Why: to stop someone who signed up first with an unverified email from later getting into that account.
7. A wallet entry stores a kind, a gold amount and a ticket count. The cause is a quest id or a boss id. Deleting a quest clears the quest id. XP is not stored on the entry. Kinds include completion, penalty, post-hoc deduction, `boss_clear`, `boss_fail` and `boss_abandon`.
8. Sign-in is Better Auth, and sessions are stored in the `session` table.

## System (development)

![System](img/dev_env_architecture.png)

### Not shown in the diagram

- The browser gets the Google ID token from Google directly and sends it to the server's `/api/auth`.
- Email sign-in needs email verification.
- In development, Vite's dev server proxies `/api` requests to the server.
- The production Compose starts postgres and server; web is not in Compose.
- The monster queue is a Postgres table, and the worker runs inside the server. The server calls the battle log and recommendations directly, without the queue.

## Code structure

### Server (`server/src/`)

```
auth/                           sign-up, sign-in (Better Auth), email verification, onboarding, account deletion
  auth.ts                       Better Auth configuration
  job-class.guard.ts            global guard that blocks app APIs for accounts without a job
quests/                         every quest rule
  quests.service.ts             register a deadline quest, list (settle, then drop judged boss subroutines, then spawn), delete (free only for an untouched quest registered today)
  quests.controller.ts          POST/GET /api/quests, complete, check today, DELETE
  routines.controller.ts        GET/POST /api/routines, PATCH /api/routines/:id, pause, resume, DELETE
  routines.service.ts           routine rules. A new title clears the monster and enqueues again. Updating, pausing, resuming or deleting a boss subroutine is 400
  routine-spawn.service.ts      write today's quest once per routine
  bosses.controller.ts          POST /api/bosses, GET /api/bosses, POST /api/bosses/:id/abandon
  boss-plan.service.ts          confirm a plan into a boss, its deadline subquests and its routines, and list bosses still in progress
  boss-judgment.service.ts      judge due bosses inside settlement, abandon, then drop judged subroutines before spawn
  quest-completion.service.ts   completion: settle → check without a lock → battle log → lock and check again → update wallet, progress (XP and the category stat) and the quest row, cut boss HP by the difficulty score, then clear lethargy
  quest-penalty.service.ts      settle missed days. Lethargy when any quest due that day is still open
  quest-settlement.scheduler.ts at 00:01 Seoul: settle (judgment is inside it), drop judged boss subroutines, then spawn
  quest-crit.roller.ts          critical-hit roll (CRIT_FORCE)
  quest-calendar.ts             Seoul date helpers
  monster-view.ts               map a monster row and a task status to the list fields
wallet/                         balance, history, post-hoc deduction
progress/                       level, XP, titles, streak, gacha tickets
stats/                          stamina, intellect and sense stored on progress at completion
job-change/                     job change
ai/                             monster, battle log, difficulty recommendation, quest plan. The current implementation is Gemini
  ai.ts                         interface. It does not decide gold or XP
  ai-call-limiter.ts            counts direct calls only (battle log, recommendation, quest plan). The queue worker is not counted. It lives in this server's memory, so each extra server adds another full limit
  gemini-ai.ts                  Gemini client. Default model gemini-3.5-flash-lite. Gemini is given a deadline of at least 10 seconds. We cut a battle log at 3 seconds
  difficulty.controller.ts      POST /api/ai/difficulty-recommendations
  difficulty.service.ts         title in, difficulty and one line of reason out
  dto/recommend-difficulty.dto.ts
  quest-plan.controller.ts      POST /api/ai/quest-plans
  quest-plan.service.ts         goal and deadline in, subquests with server-counted times and HP out
  dto/suggest-quest-plan.dto.ts
ai-queue/                       background monster tasks only
  ai-queue.ts                   enqueue, find by quest, routine or boss, dequeue, complete, fail
  postgres-ai-queue.ts          Postgres queue. 12 per minute, retry, FOR UPDATE SKIP LOCKED
  ai-queue.worker.ts            claims one task. A boss task uses the boss prompt. Any other task uses the monster prompt
database/schema/                Drizzle tables (one file per table)
common/filters/                 filter that turns exceptions into HTTP responses
```

### Shared (`shared/src/`)

```
quest-completion.ts   reward table amounts, job and streak multipliers, final amount, level-up
quest-penalty.ts      penalty amounts, gold and XP floors
constants/            reward table, penalty table, critical-hit odds, jobs and other constants
  monsters.ts         eight monster kinds, picture keys and list statuses
  bosses.ts           eight boss kinds, picture keys, active cap of 3, placeholder reward 10 and penalty 5 per HP
boss-hp.ts            HP for one subquest from a counted number of times and a difficulty score
boss-reward.ts        80% clear line, clear reward and fail penalty, with no job or streak multiplier
types/                response types exchanged by the server and the web
  difficulty-recommendation.ts
  boss.ts           boss list item
  routine.ts        routine list item
  quest-plan.ts     suggested plan: subquests, times, HP
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

- A quest completion calls settlement, then adds gold to the wallet. A subquest also cuts the boss HP by the difficulty score.
- Settlement deducts gold for missed quests, then judges bosses whose due date is already past.
- A job change adds no gold. It only resets level and XP to 1 and 0, and the job cannot change again until 7×24 hours after the last change.

## Routine spawn

An active routine writes one quest on each scheduled day. The quest is an all-at-once deadline due that day. It copies the routine's category, title, difficulty, boss and monster. The routine stores that Seoul date, so the day is written once. Deleting the quest, or pausing and resuming the same day, does not write another.

At 00:01 Seoul, for every user who has a job, and on `GET /api/quests`, the order is settlement, then judgment, then removal of subroutines whose boss already has a result, then the write. A subroutine whose boss due date is before today is not written. The write also runs when a routine is registered, when it is resumed, and inside the boss confirm transaction. Deleting a routine leaves the quests it wrote and their monsters.

## Monster task flow

Registering a deadline quest enqueues one monster task for that quest. Registering a routine enqueues one for that routine. Confirming a boss enqueues one for the boss, one for each deadline subquest and one for each subroutine. The task stores exactly one of those ids, and that id is unique. A quest's payload kinds are the eight from `shared/src/constants/monsters.ts`. A routine uses the same eight. A boss uses the eight boss kinds. The response does not wait. If the enqueue fails, the quest, routine or boss stays.

The worker claims one task and calls the AI interface. A boss task uses the boss prompt. A quest or routine task uses the monster prompt. The model picks a kind and writes a name and a description. It does not set gold or XP. On success the result is inserted into `monsters`, and the quest, routine or boss stores that id. A routine's result is also stored on the quests it wrote that do not have one yet. The task is then deleted. On failure the task stays `failed` and no monster row is written. The title stays as registered.

The list reads the monster row and any task still in the queue. It maps them to `monsterStatus` and `monster`:

- A monster row with a known kind, a name and a description: `ready`. For a quest or a routine, `monster.kind` is one of slime, bat, goblin, wolf, orc, skeleton, golem and dragon. For a boss it is one of the eight boss kinds. `imageKey` is that kind. `name` and `description` come from the row.
- No monster row, and the task is `pending` or `running`: `generating`, and `monster` is null.
- No monster row, and the task is `failed`: `failed`, and `monster` is null.
- No monster row and no task: both are null.

A routine response is `generating` and `monster` is null while its task is `pending` or `running`, even when a monster row is still stored. `PATCH /api/routines/:id` that changes the title sets `monster_id` to null, then enqueues a monster task for the new title. The response does not wait. If that enqueue fails, the routine stays with `monster_id` empty. A title that did not change leaves the monster as it is.

## Boss plan flow

`POST /api/ai/quest-plans` calls the AI interface directly, on the direct-call limit. The model returns subquests and does not set times or HP. The server counts both with `bossQuestHp` in `shared`. A deadline before today in Seoul, or after the boss deadline, is dropped. If none remain, the call answers 503 and stores nothing.

`POST /api/bosses` locks the user, then inserts the boss, the deadline subquests and the subroutines in one transaction. The boss is its own row. HP is stored on that row and counted again from the request. A deadline subquest stores the boss id. A subroutine stores it on the routine. There are at most 10 of them. Today's scheduled subroutines write their quest in that same transaction. A deadline that ends after the boss, or HP below 1, is 400 and writes nothing. A fourth boss still in progress is 409. If the transaction fails, nothing is created. Updating, pausing, resuming or deleting a subroutine is 400.

After that commit, one task is enqueued for the boss. The task kind stays `monster`. The payload kinds are the eight boss kinds from `shared/src/constants/bosses.ts`: minotaur, hydra, cerberus, kraken, chimera, vampire, giant and abyss_lord. Each deadline subquest and each subroutine gets its own task with the monster kinds. If an enqueue fails, the boss, the subquests and the subroutines stay. `GET /api/bosses` returns only bosses still in progress. It reads the monster row and any task still in the queue, checking boss kinds. The name comes from the boss prompt. A failed result leaves the title as the goal.

## Boss judgment

Judgment runs at the end of settlement, after the missed days are applied and before that transaction commits. Settlement runs at 00:01 Seoul, when the home page opens, right before a completion, and on `POST /api/quest-penalties/settle`. A boss whose due date is yesterday or earlier, and whose result is still empty, is judged once. Dealt HP of 80% or more of max HP is `cleared`. Anything less is `failed`. The boss row stays, and the result is stored on it.

Clear gold and XP are the dealt HP times 10. Clear tickets are 1, plus 1 for every 40 dealt HP, and they stop at 5. A level-up from that XP adds its own tickets on the same wallet entry. The entry kind is `boss_clear`, with the boss id and no quest id. Clear XP is also added to the boss category's stat. Failure gold and XP are the HP still short of that 80% line times 5. The entry kind is `boss_fail`. Abandon uses the same penalty, and the kind is `boss_abandon`. The job multiplier and the streak multiplier are not applied. 10 and 5 are placeholders, before balance. Gold still stops at -30 and XP at 0 within the current level. A clear can raise the level. A failure only lowers XP inside the current level.

`POST /api/bosses/:id/abandon` answers 200. It leaves the boss row and sets the result to `abandoned`. It deletes the subroutines and the subquests that are not finished. A boss that already has a result is 409. A missing id, or another user's boss, is 404.

After settlement commits, the 00:01 job and `GET /api/quests` delete subroutines whose boss already has a result, then spawn. They do not delete the subquests. A subroutine whose boss due date is before today is not spawned.

## Quest completion flow

<a href="img/quest_complete_flow.png"><img src="img/quest_complete_flow.png" alt="Quest completion flow" width="500"></a>

### Battle log

<a href="img/battle_log_flow.png"><img src="img/battle_log_flow.png" alt="Battle log" width="500"></a>

This diagram expands 'make the battle log' in the completion flow.

- The quest is checked once without a lock. When there is a note, the direct-call limit is checked and then the battle log is written, with a 3 second cut. The quest is locked and checked again, and the log is saved on the quest row, with the completion date, gold, XP and note. The battle log is made outside the lock.

### Worth noting

- Settlement is committed first. If the completion fails, settlement stays.
- A quest a routine wrote is all at once and due that day, so it gets the full daily amount. A steady deadline quest gets the check-in ratio. A same-day deadline quest, and a deadline done all at once, gets the full daily amount with no ratio.
- Only steady deadline quests whose creation day differs from the due date collect check-ins through `POST /api/quests/:id/day-marks`. A deadline done all at once cannot check today.
- For a steady deadline quest, a gap of 1 day or more with no check-ins pays 0 gold and XP. A deadline done all at once pays the full daily amount whether or not there are check-ins. The completion record stays, and that deadline quest can no longer be deleted.
- Completing any quest clears lethargy. The completion XP is also added to that category's stat on progress. Exercise and daily life go to stamina, study and work to intellect, creative and mind to sense.
- Completing a subquest cuts the boss HP by the difficulty score: easy 1, normal 2, hard 3. HP stops at 0. A boss that already has a result is not cut.

### Failures

The filter answers with the exception's status code as it is.

| Condition                              | Status |
| -------------------------------------- | ------ |
| The note is longer than 500 characters | 400    |
| Completed before the creation day      | 400    |
| Outside the deadline period            | 400    |
| No job at the settlement step          | 403    |
| No job at the reward step              | 403    |
| The quest id is malformed              | 404    |
| Not the user's quest                   | 404    |
| The quest was already completed        | 409    |

### Reward calculation

A quest a routine wrote is due the day it was written and its pace is all at once, so it pays the full daily amount.

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

## Deleting a quest

`DELETE /api/quests/:id` locks the quest first, then the user, the wallet and progress. A completion locks the quest before the user, so the same order keeps the two from waiting on each other.

A completed quest, or one whose due date is before today in Seoul, is rejected with 409.

Deletion is free when the quest was created today, has no check-in today, was not written by a routine, and is not a boss subquest. Otherwise the gold and XP are the same as a miss. A quest a routine wrote uses the daily penalty. Any other quest uses the deadline penalty for the gap from the creation day to the due date. All at once stays on the daily column. Gold stops at -30 and XP stops at 0 in the current level. `GET /api/quests` returns those floored amounts as `abandonGold` and `abandonXp`. They are 0 when the deletion is free or not allowed. The delete confirmation shows that gold and XP. The wallet history kind is `penalty`. Deleting does not turn lethargy on. The quest row is then deleted.

## Penalty settlement flow

<a href="img/penalty_flow.png"><img src="img/penalty_flow.png" alt="Penalty settlement flow" width="500"></a>

Yesterday is the day before today on the Seoul calendar. If the last settled date is yesterday or later, nothing is settled. Otherwise every day from the next day up to yesterday is checked one by one. Today is never settled.

### Worth noting

- Gold and XP are deducted for quests still open whose due date falls on a settled day. A quest a routine wrote uses the daily penalty. Any other quest uses the deadline penalty. A boss is not a quest, so it is not charged. Its subquests are. Lethargy turns on when any of those quests was missed.
- A day with no missed quest leaves the status effect as it is. If that day had no completion, only the streak goes to 0.
- The streak goes up only on a first completion; settlement only resets past days with no completion to 0.
- Today is never settled.
- A missed quest does not change the level. A boss clear in this same settlement can raise it, and that XP is added to the boss category's stat.
- A deadline quest not completed by its due date is charged once, at the first settlement after the due date. Completed quests are not charged.

### Rules

| Rule                   | Value                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Easy penalty           | 5 gold, 5 XP                                                                                                                                                                                                                                                                                                                                         |
| Normal penalty         | 10 gold, 10 XP                                                                                                                                                                                                                                                                                                                                       |
| Hard penalty           | 20 gold, 20 XP                                                                                                                                                                                                                                                                                                                                       |
| Gold floor             | -30, three times the easy daily gold of 10. Any deduction beyond it is dropped                                                                                                                                                                                                                                                                       |
| XP floor               | 0 within the current level. The level number never drops                                                                                                                                                                                                                                                                                             |
| Streak                 | Goes up by 1 on the day's first completion. Past days with no completion become 0 at settlement. Settlement never raises it                                                                                                                                                                                                                          |
| Lethargy               | Becomes `lethargy` when any quest due that day is still open. A day with no missed quest leaves the status effect as it is. Settlement does not clear it                                                                                                                                                                                             |
| Deadline quest penalty | A steady deadline is chosen by the gap from creation to due date: 0 days is easy 5 · normal 10 · hard 20, `1–7` days is 10 · 20 · 40, 8 or more is 15 · 30 · 60. All at once uses the daily column however long the gap is. Same number for gold and XP. A missed deadline turns lethargy on. Streak still follows whether that day had a completion |
