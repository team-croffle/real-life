Run the manual test sheet for the current branch, after review fixes. Report results only; do not fix anything. Report to the user in Korean.

## 1. Before running

1. Find the test sheet at the end of the implementation result in this chat. If there is none, write one from the plan's checks and the spec line for this branch, show it, and wait for approval.
2. Docker (postgres) must already be running. Do not start or stop it. If it is down, ask the user.
3. If the dev servers are not running, start them with `pnpm dev`. Stop them at the end only if you started them.
4. Follow the account rules in `.ai/AGENTS.md` section 8. Create the test account with its script before the first step.

## 2. Running

- Use the scripts in `.ai/scripts/` for repeated steps. If a repeated step has no script yet, write it there first and tell the user. Never commit them.
- Run the steps in order. Run each step once; do not retry a failed step. If a step fails, keep running the steps that do not depend on it and mark the ones that do as skipped.
- If the environment itself fails (the server does not start, the DB cannot be reached), stop and ask the user.
- For each failure, name the likely cause in one or two lines, citing the file and line. Use only the response, the server log, and the one file the error points to. Do not search further.

## 3. Cleanup

- Delete the test account and all its data with its script.
- Remove `CRIT_FORCE` from `server/.env` if you added it.

## 4. Output

Start with one line: the number of passed, failed and skipped steps.

Then one line per step: number, what was checked, 통과 / 실패 / 건너뜀.

For each failure, add:

- **기대값**: what the sheet expected
- **실제**: the response or value you got, with session values and secrets removed
- **원인**: the likely cause, with file and line

## 5. Principles

- No praise and no summary of what the branch does.
- Do not fix anything. Fixes happen after the user confirms.
- After fixes, run only the failed and skipped steps again.
