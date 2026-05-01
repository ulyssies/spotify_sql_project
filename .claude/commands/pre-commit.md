# /pre-commit

Run this before every commit. Catches problems before they reach the repo.

## Steps

1. **Invoke code-reviewer agent** on all staged files
   - Check for unused imports, dead code, convention violations
   - Check for missing error handling on Spotify API calls and SQLite operations
   - Check for Streamlit anti-patterns
   - Report critical issues first

2. **Secret scan**
   - Confirm no Spotify client IDs, secrets, tokens, redirect URIs, or access tokens are hardcoded in staged files
   - All credentials must flow through `secrets_handler.py` only
   - If any found: block commit, report exact location, do not proceed

3. **Documentation check**
   - For any new public functions added in this diff: confirm Google-style docstrings exist
   - Flag missing docs as Major issues

4. **Debug artifact removal**
   - Scan for `print(`, `st.write(` used for debugging, `debugger`, `breakpoint()`, `TODO`, `FIXME` in staged files
   - List each one with file and line number
   - Do not remove automatically — report and let developer confirm

5. **Safety check**
   - Confirm `.env`, `spotify_*.db`, and `.cache` are not staged
   - These must never be committed

6. **Scope check**
   - Read Current Priorities in `CLAUDE.md`
   - Confirm staged changes align with current priorities
   - Flag any out-of-scope changes for review (not an automatic block)

## Output

```
## Pre-Commit Review

**Secrets:** ✓ Clean / ✗ BLOCKED — [location]
**Gitignored files staged:** ✓ None / ✗ BLOCKED — [file]
**Code quality:** [Critical / Major / Minor issues or ✓ Clean]
**Documentation:** ✓ Complete / ✗ Missing on [functions]
**Debug artifacts:** ✓ None / ✗ Found at [locations]
**Scope:** ✓ Matches priorities / ⚠ Out-of-scope changes detected

[Summary: safe to commit / blocked on X]
```

## Blocking Conditions

The following block a commit entirely:
- Any hardcoded secret or credential
- `.env`, `spotify_*.db`, or `.cache` staged for commit
- Critical code quality issue (broken auth logic, SQL injection, unhandled error on user-facing path)

Minor and Major issues are reported but do not block — developer decides.
