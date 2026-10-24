# Agent Instructions

Reply to the user in Korean. Commit message bodies and PR text are also written in Korean.

## Project Overview

A web app where you register to-dos as quests and receive gold and XP when you complete them.

A quest is registered as either a routine or a deadline. Completing it adds gold to the wallet and raises XP in the progress. If a routine whose scheduled day has passed is not completed, gold and XP are deducted at settlement.

- Frontend: Vue, Vite (`web`)
- Server: NestJS (`server`)
- DB: PostgreSQL, Drizzle ORM
- Package manager: pnpm workspace (`shared`, `server`, `web`)
- Deployment: the API server is built as a Docker image and started together with Postgres by Docker Compose (`docker/docker-compose.yaml`, `docker/Dockerfile`)

## Project Structure

| Part           | Location  | Stack and role                                                                                                                            |
| -------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Web            | `web/`    | Vue 3, Vite. Screens (during development `/api` is proxied to the server)                                                                 |
| Server         | `server/` | NestJS, Drizzle, PostgreSQL. API (auth, quests, wallet, stats, job change)                                                                |
| Shared         | `shared/` | Types and constants shared by the server and the web. It also has the reward and penalty functions, but only the server uses them for now |
| Infrastructure | `docker/` | Compose (postgres, server)                                                                                                                |

Root `package.json` scripts:

- Run: `pnpm dev`, `pnpm dev:server`, `pnpm dev:web`
- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`, `pnpm lint:fix`

Before working, read `.ai/AGENTS.md` (local instructions), the roadmap, and the spec. If `.ai/AGENTS.md` does not exist, tell the user.

## Branches and Commits

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

## Naming Rules

- A name must describe what it actually does. When the behavior changes, change the name too.
  Example: the store that holds only the temporary values of the sign-up flow is `authFlow`, and the login session is the `session` table in the DB. Do not mix the two when calling them.
