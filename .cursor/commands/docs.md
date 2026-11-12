Update the public documents for the current branch after testing, then commit them. Report to the user in Korean.

## 1. Scope (read as little as possible)

1. `git diff master...HEAD --stat` to see what changed. Do not search the repository.
2. Read `.ai/roadmap/README.md` → the current version file → the line for this branch.
3. Check only the English documents below. Open the Korean pair only to apply the same change. Read code only when a document must state something the diff does not show.

## 2. What to check

- `ROADMAP.md`: the line for this branch is `[x]`. The version status matches the local table.
- `README.md`:
  - Stack: a package now used in code moves out of Planned.
  - Project structure: a new folder under `server/src/`, `web/src/` or `shared/src/` is listed.
  - Rules: a change a user can notice (numbers, conditions, order) is written. Screen layout is not.
- `docs/ARCHITECTURE.md`: Code structure lists a new folder, not individual files. A flow section changes only when the order of steps or the connection between parts changes. Do not add amounts, status codes, response fields or game rules; those belong in README or the code.
- `server/README.md`: the API table and environment variables match the code.
- Open items in `.ai/known-issues/open.md` that name this branch for a document.

## 3. Commit

- Apply each change to the Korean pair (`README.ko.md`, `docs/ARCHITECTURE.ko.md`) as well.
- Put all document changes in one `docs:` commit. Do not change code.
- Do not edit images. If a diagram in `docs/img/` no longer matches, tell the user which one and what changed.
- If nothing is missing, make no commit and say so.

## 4. Output

One line per document: changed (and what, in one line) or unchanged. Then any diagram that needs the user's update.

## 5. Principles

- Write only what is confirmed in the code. Never mention `.ai/` or `.notes/` in public documents.
- Do not add anything the branch did not change.
