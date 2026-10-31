Draft the pull request for the current branch. Do not push or open the PR; the user does that. Write the title in English and the body in Korean.

## 1. Gather

1. `git log master..HEAD --oneline` and `git diff master...HEAD --stat` for what the branch did.
2. The roadmap line for this branch (`.ai/roadmap/README.md` → version file).
3. What the user actually checked during this branch, from this conversation. If you do not know what was checked, ask.

## 2. Write

- **Title**: English conventional commit style, for example `feat: show deadline quest reward in register dialog`.
- **Body**: fill `.github/PULL_REQUEST_TEMPLATE.md` headings in order — `## 요약`, `## 변경 사항`, `## 테스트 및 검증`, `## Additional notes`. No other sections.
  - 요약: what the branch does and why, matching the roadmap line, in connected sentences.
  - 변경 사항: one `- ` item per change, each a full sentence.
  - 테스트 및 검증: only what was actually run or seen, each marked `[x]`. Leave out anything not checked, and do not list lint or typecheck (CI covers them).
  - Additional notes: deferred issues, the next branch, anything a reviewer should know. Remove the heading if there is nothing.
- No branch names of other work in progress, no mention of `.ai/` or `.notes/`, no secrets.

## 3. Hand over

Give the title and body in one code block each, ready to paste.
