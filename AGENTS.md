# Agent Instructions

Reply to the user in Korean. Commit message bodies and PR text are also written in Korean.

## 1. What This Is

**RealLife** turns everyday to-dos into game quests. You register a to-do as a quest and get gold and XP when you complete it; missing it costs gold and XP. Gold buys real-life rewards the user sets. AI turns to-dos into monsters and big goals into bosses, but gold and XP are always set by the rules, never by AI.

The repository is one pnpm workspace with three parts:

| Part           | Location  | Stack and role                                                                                          |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| Web            | `web/`    | Vue 3, Vite, Pinia, vue-i18n, Tailwind CSS v4. Screens (in development `/api` is proxied to the server) |
| Server         | `server/` | NestJS, Drizzle, PostgreSQL, Better Auth. API: auth, quests, wallet, progress, stats, job change        |
| Shared         | `shared/` | Types, constants and the reward/penalty calculation, used by both the server and the web                |
| Infrastructure | `docker/` | Compose (postgres, server)                                                                              |

Scripts at the root: `pnpm dev` (`dev:server`, `dev:web`), `pnpm build`, `pnpm typecheck`, `pnpm lint` (`lint:fix`), `pnpm format` (`format:check`).

Reading order for a new task — stop once you know enough, and do not search the code to learn what the project is:

1. [README.md](./README.md): what the app does and its rules
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): how completion, settlement and reward calculation flow through the server
3. `.ai/AGENTS.md` (local instructions), the roadmap, and the spec section the task points to. If `.ai/AGENTS.md` does not exist, tell the user
4. The code the task touches

## 2. Architecture Rules

- Gold, XP and penalties come only from the calculation in `shared`. The server computes what is paid; the web uses the same functions only to show estimates. AI never decides an amount.
- Dates are Seoul calendar dates (`Asia/Seoul`), not the server's local time.
- Settlement can run any number of times with the same result. A completion commits settlement first, then completes in its own transaction.
- When several rows of one user change together, lock them in this order: user, wallet, progress.
- Types and constants used by both sides live in `shared`. Do not copy them into `server` or `web`.
- AI and the job queue are used only through their interfaces. The current implementations (Gemini, a Postgres-backed queue) must be replaceable through Nest DI without touching the callers.

## 3. Design Rules (web)

- Colors, overlays and other tokens come from `web/src/assets/main.css`. No ad-hoc colors in components.
- Light and dark themes both work. The theme follows the OS until the user picks one.
- Loading, error and empty states are never left out.
- Every user-facing string goes through vue-i18n with both `ko` and `en` entries.
- Icons come from lucide. No emoji in the UI, since they look different on every device.
- The design reference is the web (desktop) artboard; nothing breaks at phone width.

## 4. Keeping README Current

- When a change alters what the app does, update both `README.md` (English) and `README.ko.md` (Korean) in the same branch.
- README states rules a user cannot know without using the app: numbers, conditions and order. It does not describe screen layout (where things are, how many are shown).

## 5. Branches and Commits

**The user** creates and switches branches. The agent does not create branches with `git checkout`, `git switch`, or `git branch`, and works **only on the branch that is currently checked out**.

Keep server and client work on separate branches. Do not put server work and client work in the same branch. Example: `feat/auth-server` → `feat/auth-web`.

Self-check before committing. If you find a single-responsibility violation, needlessly complex structure, or duplicated logic, say so before committing.

Work on a working branch (`feat/*`, `docs/*`, and so on), not on `master`. **Do not commit directly to `master`.** If the current branch is `master`, do not commit; ask the user to switch to a `feat/*` branch. The only exception is when the user explicitly tells you to commit to `master` (initial setup and the like).

One commit carries one purpose only. Do not pile everything into one commit at the end.

The purpose is the scope that should disappear together when reverted. Example: schema (+ migration) → one chunk of API that uses that schema (sign-up/login) → then social login → then email verification. The UI is on a different branch from the server, so do not put it in the same commit.

Do not merge commits just because there are many files. Several DTOs can still be one commit if they belong to the same API. Conversely, things that **can be reverted separately**, such as a schema and an API, or login and email verification, are split into commits even if the HEAD in between is briefly broken. Do not merge layers on the grounds that "it has to be one commit for the app to run".

Take 300–500 changed lines per branch as the guideline. Do not cut strictly. Do not split work of the same flow just because it goes over 500 lines, and do not attach unrelated work just to reach 300 lines. A change small enough to be a single commit does not get its own branch; bundle it into a related branch. Do not mix feature additions, refactors, docs, and formatting changes in one commit.

Before committing, check the size with `git diff --stat`. For any other checks, follow the local instructions.

Push **only when the user asks**. The agent does not push on its own.

Do not commit secrets (`.env`, credentials). Do not skip git hooks. Do not force-push to `master`.

The commit message title is in English conventional format. Use `feat:`, `fix:`, `docs:`, and `refactor:`, and `chore:` when needed. Below the title, put the summary and the detailed bullets in Korean.

```
<type>: <short title>

<이 단위를 커밋하는 이유 요약>

- <구체적인 변경>
- <구체적인 변경>
- <후속이나 제약 있으면>
```

Example:

```
feat: add user list API

사용자 목록 조회를 서버에 추가한다.

- GET /users 엔드포인트와 DTO를 추가한다.
- 페이지네이션 쿼리를 기존 목록 패턴에 맞춘다.
```

The title is an English imperative.

## 6. Testing

- There is no test framework yet. The minimum before every commit is `pnpm typecheck`, `pnpm lint` and `pnpm format:check`.
- Behaviour is checked on the running app (`pnpm dev`) and with API calls.
- Say plainly what was not verified.

## 7. Naming Rules

- A name must describe what it actually does. When the behavior changes, change the name too.
  Example: the store that holds only the temporary values of the sign-up flow is `authFlow`, and the login session is the `session` table in the DB. Do not mix the two when calling them.
