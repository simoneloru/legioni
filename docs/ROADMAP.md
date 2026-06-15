# Roadmap

## v0.1 — Foundation [DONE]

The compiler loop works. A team can be defined, compiled, and installed into opencode. The project profile is injected per-project without git trace. The lesson lifecycle (stage → promote → compile) is implemented. Known pre-validation bugs are fixed.

**Implemented:**
- `legioni init` — scaffold + recon + compile + install
- `legioni install` — compile + install (no scaffold, no recon)
- `legioni update` — full refresh: recon + recompile + restore opencode.json
- `legioni promote` — interactive lesson promotion; decided candidates removed from staging immediately
- opencode adapter (agent files + project-scoped opencode.json)
- Zero git trace (`.git/info/exclude` for `.legioni/` and `opencode.json`)
- Default team: Orchestrator, Architect, Implementer, Reviewer, Test Strategist, DB Expert
- Per-role lessons staging; promote is idempotent (y/n removes candidate; q leaves remainder)
- Stack detection: TypeScript, JavaScript, Python, Go, Rust, Java/Maven, Java/Kotlin/Gradle
- Recon: existing AGENTS.md/CLAUDE.md noted but not copied (avoids double-injection)
- Orchestrator loop counter: increments only on `status: fail` from review.md; non-review failures handled separately
- Compile-time model override: `~/.legioni/config.json` `models` map (no role-file edits needed)
- npm publish — `legioni` on npm

---

## v0.2 — First validated run [DONE]

**Goal:** Run the orchestration loop end-to-end at least once on a real task.

**Task used:** `add a slugify(s: string) utility with edge-case handling and a unit test` in a small TypeScript repo, using opencode free models (`deepseek-v4-flash-free` for heavy roles, `north-mini-code-free` for light roles via `~/.legioni/config.json` model override).

**What was validated:**
- Full pipeline runs: orchestrator → architect → implementer → reviewer → test-strategist
- Reviewer runs actual build + test commands and quotes real terminal output (not predictions)
- Reviewer detects task↔plan divergence (`status: fail` on spec error)
- Review-cycle counter increments on real failures; orchestrator re-delegates to implementer
- Fault-injection run: disabled NFKD normalization step, orchestrator pipeline caught and fixed it in one cycle, 10/10 tests passing
- Steps semantics confirmed: orchestrator counts only its own tool calls (each `task()` = 1 step; subagent internal steps are independent)
- steps:20 confirmed too tight (one retry cycle hit the cap); raised to steps:35

**Fixed during validation:**
- Reviewer: added `bash` access for running build/test; must verify against `task.md` not just `plan.md`
- Test-strategist: writes `test-results.md` with `status: pass/fail`; stops on fail (does not fix)
- Orchestrator: split step 5 (review) and step 6 (test results); test-results fail uses same counter
- Orchestrator: steps 20 → 35

---

## v0.3 — Stability [DONE]

**Goal:** The team handles a variety of real tasks without practitioner intervention. Lessons accumulate and demonstrably improve outputs over time.

**Validated on real projects:**

| Project | Language | Result | Key observation |
|---|---|---|---|
| Apache Commons Text | Java/Maven | ✅ 1890 tests | Implementer corrupted existing `wrap()` method; reviewer passed pre-fixed code; prompt fixes applied |
| Apache Commons Compress | Java/Maven | ✅ clean run | impl-notes.md written correctly, 6 tests passing, lesson candidates staged |
| TypeScript/vitest project | TypeScript | ✅ 10/10 tests | Full pipeline clean, review with acceptance table, lesson candidates from 4 agents |
| Python/pytest project | Python | ✅ 10/10 tests | Clean pipeline, impl-notes with import-order fix documented |
| Python/pytest (Unicode) | Python | ✅ 50/50 tests | **Clean fail→re-delegate→pass cycle**: reviewer failed 4 tests (NFKD can't decompose ø, æ, etc.), orchestrator re-delegated, implementer fixed with translate table |
| Python/pytest (urlkit — lesson test) | Python | ✅ 9/9 tests | **Lessons demonstrably improved behavior**: reviewer with promoted lessons caught NFKD edge case, implementer included translate table on first pass |

**Issues found and fixed:**
- Implementer corrupted existing `wrap()` method body during edit — prompt strengthened with explicit "do not alter existing code outside scope" rule
- Reviewer passed code that had been fixed by orchestrator (not implementer) — prompt strengthened with scope-violation detection and missing impl-notes check
- Orchestrator edited source code directly — prompt clarified: never fix bugs yourself, always re-delegate
- Test-strategist timed out running full Maven suite — prompt updated to prefer targeted tests
- impl-notes.md was not written by implementer — prompt now states it is mandatory
- No lesson candidates staged by some agents — addressed in prompt updates

**New features added:**
- Provider system: `legioni init` interactive menu, `legioni config set-provider`, `legioni config list`, `legioni config set-model`
- `legioni upgrade-team`: compare shipped defaults with team store, selectively upgrade changed roles
- Targeted test commands in recon profile (Maven `-Dtest=X`, Gradle `--tests X`, vitest/jest file path, pytest file path)
- README rewritten for HN launch with pipeline diagram, provider table, how-it-works walkthrough

**Validated end-to-end:**
- Clean fail→re-delegate→pass cycle observed (Unicode NFKD issue in py-slugify)
- Lessons promoted from reviewer (`nordic-char-limitation-in-nfkd`, `verify-nfkd-assumptions-with-actual-runtime`, `unicode-translate-before-nfkd`) compiled into agent prompts
- Follow-up task on new project (urlkit) passed on first cycle with lessons-informed review — reviewer explicitly verified NFKD edge case, implementer included translate table on first attempt

---

## v0.4 — Distribution readiness [DONE]

**Goal:** legioni is ready for others to install and use. Documentation matches reality.

**Done:**
- `legioni upgrade-team` command implemented (interactive, diffs defaults vs store)
- `prepublishOnly` script in package.json (build + typecheck)
- LICENSE file (MIT)
- README polished for HN launch
- npm publish — `legioni@0.4.0` on npm
- Project renamed from hexis to legioni (package, repo, docs, store directory)
- Windows support (HOME_DIR cross-platform, LOCALAPPDATA)
- GitHub repo: https://github.com/simoneloru/legioni

---

## v0.5 — v0.6 (no fixed scope yet)

**Candidates:**
- More cross-language pipeline validation (Go, Rust)
- Claude Code adapter
- Global install: `~/.legioni/` as git repo, push/pull team store
- Lesson TTL / staleness detection
- Shared team store templates / community registry

---

## Deferred (no version target)

**Claude Code adapter:** AGENTS.md + `.claude/settings.json` permission format. The permission model is different from opencode (string-based tool names vs. pattern matching). Deferred until v0.2 completion proves the core model.

**Roo adapter:** Similar deferred status.

**Community registry:** Share role files, lesson sets, specialized teams. Requires decisions about identity, hosting, versioning, and trust. Out of scope until the core is validated.

**Conditional tool configuration:** Some roles might need different tool sets depending on the project (e.g., a role that uses `mcp__database__query` only if an MCP database tool is configured). Currently not modeled.

**Parallel subagent execution:** opencode may support running multiple subagents in parallel in the future. The current orchestration protocol is sequential (architect → implementer → reviewer). Parallel paths (e.g., test-strategist running concurrently with a second implementation pass) are not designed yet.

---

## Open questions

1. **Steps semantics — RESOLVED.** Confirmed: each orchestrator `task()` call and each file `read` = 1 step; subagent internal steps are independent. One full pipeline pass costs ~18 orchestrator steps. steps:35 fits one retry cycle with headroom.

2. **What is the right step budget per role?** orchestrator:35 confirmed adequate for one retry cycle. implementer:30 and others:15-20 remain intuition-based — real-task data needed.

3. **How do lessons degrade over time?** A lesson promoted in January may be wrong or irrelevant by June. There is currently no TTL, no review cycle, and no mechanism to remove outdated lessons. Manual curation is the only mechanism.

4. **Bounded loop soft/hard cap interaction — RESOLVED.** steps:35 + 3-cycle soft cap are mechanically compatible. Partial run observed one retry cycle; math confirms two full retry cycles fit within 35 steps.

5. **Clean fail→re-delegate→pass cycle — OBSERVED.** On the Unicode slugify task, the reviewer correctly failed the implementation (4 tests for ø/Æ/em-dash), the orchestrator re-delegated to the implementer (not fixing it directly), and the fix passed all 50 tests. This validates the bounded loop design end-to-end.