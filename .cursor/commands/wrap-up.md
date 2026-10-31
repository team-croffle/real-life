Update the local records after the current branch has been merged. Change only files under `.ai/`. Do not commit, push or switch branches. Report to the user in Korean.

## 1. Check it is merged

Ask the user to confirm the branch was merged if this conversation does not already say so.

## 2. Update

1. **Roadmap**: mark the branch's line `[x]` in its version file under `.ai/roadmap/`. If every line of that version is done, set the version status to `완료` in `.ai/roadmap/README.md`. Tell the user which line of the public `ROADMAP.md` should be checked and whether its status should change; do not edit the public file yourself.
2. **History**: if the branch changed design or structure (tables, APIs, flows, a spec rule), add one line to `.ai/history/summary.md` in English: `**date · branch.** what changed. why.` Point to a decision file if one exists. Screen copy, layout and review talk are not recorded. If nothing qualifies, add nothing.
3. **Known issues**:
   - Issues this branch closed: remove them from `.ai/known-issues/open.md` and add a `### <branch> (<date>)` section at the top of `.ai/known-issues/closed.md` saying what was closed and how.
   - Problems found but deferred: add them to the matching area of `open.md` in the existing format (심각도, 발견, 증상, 왜 아직 열림, 후보, 제안).
4. **Decisions**: if the branch chose between alternatives and that is not written yet, ask the user whether to add `.ai/decisions/<topic>.md`.
5. **Version finished**: if this branch finished a version, move that version's lines from `.ai/history/summary.md` to `.ai/history/summary-<version>.md`.

## 3. Report

List each file changed and the lines added or moved, in short items.
