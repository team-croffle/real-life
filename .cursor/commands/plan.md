Plan the work for the current branch, then stop. Do not write code or change files until the user approves. Report to the user in Korean.

## 1. Find the work

1. `git branch --show-current` gives the branch name.
2. `.ai/roadmap/README.md` → the current version file → the checklist line with this branch name. If no line has it, stop and tell the user.
3. Read the spec file that line points to (`.ai/specs/README.md` maps chapters to files). Read only the sections the line names.
4. Read the area of `.ai/known-issues/open.md` this work touches. Note open issues whose proposed branch is this one; they are part of the work.
5. Use `docs/ARCHITECTURE.md` "Code structure" to pick the files to open, and open only those. Read `.ai/decisions/<topic>.md` only if the work touches that topic. Do not search the repository or read `git log` to learn the project; if the documents do not answer something, say what was missing.

## 2. Write the plan

- **범위**: the roadmap line and the spec sections, in one or two sentences. Anything the spec leaves open, listed as questions for the user.
- **파일**: each file to create or change, and its role.
- **커밋 단위**: the order of commits. One purpose per commit (what would be reverted together): for example schema and migration, then one group of endpoints, then the next. Server and web never share a branch.
- **확인 방법**: how each commit is checked (an API call, a screen, a query), beyond `pnpm typecheck`, `pnpm lint` and `pnpm format:check`.
- **크기**: an estimate of changed lines. 300–500 per branch is a guideline, not a limit.
- **의존성**: any package to add, replace or remove, with the reason. It needs an entry in `.ai/decisions/deps.md` before installing.
- **문서**: whether `README.md`/`README.ko.md`, the `server/README.md` API table or `docs/ARCHITECTURE*.md` will need changes.

Anything not in the roadmap line (a new file, structure or dependency) needs a reason and the user's approval.

## 3. Stop

End with the plan and the questions. Wait for the user's approval before implementing.
