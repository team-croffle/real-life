Review the current branch once its work is done. Report problems only; do not fix anything. Report to the user in Korean.

## 1. Scope (read as little as possible)

1. `git diff master...HEAD --stat` to see which files changed. This covers committed work only; if `git status` shows uncommitted changes, tell the user and ask whether to wait for a commit.
2. Skip files that need no review: `pnpm-lock.yaml`, `server/drizzle/meta/**` snapshots, images and sounds. For `web/src/i18n/locales/*.json` check only that `ko` and `en` have the same keys.
3. Read the diff of each remaining file (`git diff master...HEAD -- <file>`). Open the full file or another file only when a check below needs it (for example, to see the transaction a changed line runs in). Do not search the repository.
4. Read once, before checking:
   - `.ai/roadmap/README.md` → the current version file → the line for this branch, and the spec file that line points to (`.ai/specs/README.md` maps chapters to files)
   - The area of `.ai/known-issues/open.md` this branch touches. Do not report an issue that is already there
   - `.ai/decisions/<topic>.md` only if the branch touches that topic
5. Run only the checks for what changed: server checks if `server/` or `shared/` changed, web checks if `web/` changed, docs checks always.

## 2. Checks

### Server and shared

- Security: an endpoint reachable without a session; another user's data reachable by changing an id; a client value trusted without validation; a secret, token or session value in a response or log.
- Consistency: several tables changed outside one transaction; rows locked in an order other than user → wallet → progress; a request that does damage when sent twice; settlement that gives a different result when run again; an off-by-one at a boundary (dates, floors such as gold -30, the 80% boss line).
- Rules: a gold, XP or penalty amount computed anywhere but `shared`; a date taken from the server clock instead of the Seoul calendar (`Asia/Seoul`); a type or constant that both sides use defined outside `shared`; AI or the job queue called directly instead of through its interface; a schema change without a migration.
- API shape: a `{ data }` envelope; a token in JSON; a body on a success that should be 204.

### Web

- Logic that decides an outcome on the client. Showing an estimate with the `shared` functions is allowed.
- A server call that does not go through `useApi`.
- A color outside the `main.css` tokens; a screen that breaks in dark mode; a missing loading, error or empty state; an emoji; a user-facing string not in i18n.

### Spec

- Behavior that differs from the spec, something in the spec that is missing, or something added that the spec does not have.

### Docs and dependencies

- Behavior changed but `README.md` and `README.ko.md` were not both updated.
- An endpoint added or changed but the `server/README.md` API table was not.
- A package added, removed or replaced without an entry in `.ai/decisions/deps.md`; a runtime package in `devDependencies` or a dev tool in `dependencies`.

### Names

- A file, function or type name that does not match what it does; a query result named `row` instead of its table (`userRow`).

## 3. Output

Start with one line: the number of findings per severity. If there are none, say so and stop.

Then one block per finding, most severe first:

- **심각도**: 막음 (do not merge) / 고쳐야 함 (fix before the branch closes) / 알아둘 것 (fine for now, goes to known-issues)
- **위치**: file and line
- **문제**: what is wrong, in one or two sentences
- **드러나는 상황**: the input or situation that shows it

For 알아둘 것, one line each is enough.

## 4. Principles

- No praise and no summary of what the branch does.
- Every finding cites code. If you are not sure, either check it or leave it out.
- Do not fix anything. Fixes happen after the user confirms.
- After fixes, review only the changed lines again with the same checks.
