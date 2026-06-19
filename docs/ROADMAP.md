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

## v0.5 — Spec-driven pipeline

**Goal:** The pipeline produces structured specifications before writing code, and the orchestrator gates on ambiguity before delegating implementation.

**Why:** The current pipeline jumps from a freeform task brief directly to architecture. If the brief is ambiguous, the architect guesses, the implementer builds on the guess, and the review cycle burns steps fixing something that was never specified. A requirements phase and an ambiguity gate eliminate the most expensive class of retry cycles.

### v0.5a — Requirements phase

The architect produces `.legioni/requirements.md` before `.legioni/plan.md`. This is not a new role — the architect does both, in sequence.

**Requirements format:**
- `## Required Inputs` — project purpose, primary users, core workflows, business objects, external integrations, auth/roles, regulatory constraints. Each field is either filled from known context or marked `TO BE DECIDED`.
- `## Functional Requirements` — each requirement gets a stable ID (`FR-1.1`, `FR-2.3`), uses RFC 2119 language (MUST, SHOULD, MAY), and is independently testable. Unknowns are marked `UNKNOWN` or `TO BE DECIDED`.
- `## Open Questions` — every unresolved item in one place.

**Pipeline change:** orchestrator → architect (writes `requirements.md` then `plan.md`) → implementer → reviewer → test-strategist. The architect reads `requirements.md` as input to `plan.md`. The reviewer verifies against `requirements.md`, not just `task.md`.

**Acceptance criteria:**
- `requirements.md` is produced for every task, with stable IDs and explicit `TO BE DECIDED` markers
- The reviewer checks traceability: every `FR-*` ID in `requirements.md` is covered in `plan.md`
- A task with ambiguous requirements does not proceed past the architect until the orchestrator resolves the ambiguity

### v0.5b — Ambiguity gate

The orchestrator enforces a gate before delegating to the implementer. If `requirements.md` or `plan.md` contains `TO BE DECIDED`, `UNKNOWN`, or `TBD` markers beyond a trivial threshold, the orchestrator stops and asks the user for clarification — one question at a time, not in a batch.

**Gate rules:**
- The orchestrator scans `requirements.md` and `plan.md` for unresolved markers before calling the implementer.
- If the count of unresolved items exceeds a threshold (starting at 3), the orchestrator escalates to the user with the full list, ordered by foundational importance (requirements before architecture, architecture before implementation details).
- The orchestrator updates `requirements.md` and/or `plan.md` with the user's answers before proceeding.
- If the user explicitly defers an item, it stays marked as deferred (not resolved), and the pipeline proceeds with that known gap.

**Acceptance criteria:**
- An ambiguous task (e.g., "add auth" without specifying the model) triggers the ambiguity gate instead of burning review cycles
- The orchestrator asks one question at a time, not a batch
- After the user answers, the relevant file is updated before proceeding

### v0.5c — Failure classification

When the reviewer returns `status: fail`, the orchestrator classifies the cause before re-delegating:

- **Implementation bug** — the plan was clear, the code is wrong → re-delegate to implementer with review content (current behavior)
- **Specification ambiguity** — the plan was unclear or incomplete → ask the user for clarification, then re-delegate to architect to revise `plan.md`
- **Architectural issue** — the plan's approach is fundamentally wrong → re-delegate to architect to revise `plan.md`, then re-delegate to implementer

This classification is done by the orchestrator reading `.legioni/review.md` and determining which category the failures fall into. It does not require a new role.

**Acceptance criteria:**
- Review failures caused by ambiguity are not blindly re-delegated to the implementer
- The orchestrator distinguishes at least these three categories in its re-delegation decision

### v0.5d — Structured acceptance criteria

`task.md` and `plan.md` gain a structured format for acceptance criteria:

- Each functional requirement (`FR-*`) has one or more acceptance criteria in Given/When/Then format
- The reviewer verifies each acceptance criterion individually, not just "does the build pass"
- The reviewer's `.legioni/review.md` includes a per-criterion pass/fail table

**Acceptance criteria:**
- Every `FR-*` in `requirements.md` has at least one acceptance criterion
- The reviewer's output includes a per-criterion verdict, not just a global pass/fail

### v0.5e — Dependency rules

The implementer's prompt includes explicit rules for third-party dependencies:

- Do not add a dependency when the standard library or a few lines of first-party code will do
- Only use actively maintained libraries (commit or release within the last 12 months)
- Only the latest stable major version; no deprecated, abandoned, or pre-release packages
- Reject any library with known unpatched CVEs
- Pin exact versions with a committed lockfile; no floating ranges in production
- Prefer libraries with narrow scope, minimal transitive dependencies, and a clear security track record

The reviewer checks that any new dependency added by the implementer satisfies these rules.

**Acceptance criteria:**
- New dependencies in the implementer's output are justified in `impl-notes.md`
- The reviewer flags dependencies that violate these rules

### v0.5f — Agent self-awareness of legioni [DONE]

Currently, no role knows that legioni exists. They read and write `.legioni/` files but have no knowledge of the tool that manages their configuration, models, or team store. This means:

- If a model is underperforming, the orchestrator cannot suggest `legioni config set-model <role> <model>`
- If the project profile is stale, no agent can suggest `legioni update`
- If the user wants to promote lessons, no agent can suggest `legioni promote`
- If the user wants to upgrade team roles, no agent can suggest `legioni upgrade-team`
- If the user wants to change provider, no agent can suggest `legioni config set-provider`

**What changed:** Added a `## About legioni` section to every role prompt, injected at compile time from `defaults/legioni-context.md`. The section teaches each role what legioni is, what commands are available, when to suggest them, and what not to do. The orchestrator gets an additional paragraph from `defaults/legioni-context-orchestrator.md` about surfacing suggestions to the user.

**Implementation:**
- `defaults/legioni-context.md` — shared section with legioni description, key commands, when to suggest, what not to do
- `defaults/legioni-context-orchestrator.md` — orchestrator-only paragraph about surfacing suggestions
- `src/core/compile.ts` — reads both templates at compile time, injects shared section after role body, orchestrator paragraph only for `id === 'orchestrator'`, lessons still appended last
- `src/core/compile.test.ts` — 14 tests covering all behaviour specifications and edge cases (model overrides, missing files, empty body, section ordering, orchestrator-specific injection)

**Verified:**
- Build succeeds (`npm run build`)
- All 14 tests pass (`npm test`)
- No role files in `defaults/roles/` were modified
- No type changes in `src/types.ts`
- No adapter changes in `src/adapters/opencode.ts`
- Injection order confirmed: role body → `## About legioni` → (orchestrator paragraph) → `## Lessons`

---

## v0.6 — Consistency and security

**Goal:** The pipeline produces internally consistent artifacts and includes a baseline security review.

### v0.6a — Tightening pass

After the architect writes `plan.md`, the orchestrator (or the architect as a final step) runs a consistency check across `task.md`, `requirements.md`, and `plan.md`:

- Every requirement in `requirements.md` is covered by at least one entry in `plan.md`
- No contradictions between files
- No significant duplication (each file has a distinct purpose)
- No `TO BE DECIDED` items that were actually resolved elsewhere

This is a read-and-verify pass, not a new pipeline step. It can be folded into the architect's existing workflow.

**Acceptance criteria:**
- The architect's output includes a traceability section mapping `FR-*` IDs to plan sections
- Gaps and contradictions are surfaced before the implementer starts

### v0.6b — Security considerations in recon

The recon profile (`.legioni/project.md`) gains a `## Security considerations` section. For known stacks, recon emits baseline security guidance:

- Web/API projects: input validation, authentication, authorization, secret handling, CORS, rate limiting
- Database projects: parameterized queries, migration safety, connection string handling
- Mobile projects: certificate pinning, secure storage, API key handling

This is not a full threat model — it's a checklist that the reviewer and implementer can reference. The section is omitted if the stack is unknown or if no security-relevant patterns are detected.

**Acceptance criteria:**
- `project.md` includes a `## Security considerations` section for recognized web/API stacks
- The reviewer checks security considerations alongside build and test results

### v0.6c — Threat modeling step

For tasks that involve authentication, authorization, data handling, or external integrations, the architect produces a `.legioni/threat-model.md` with a simplified STRIDE analysis:

- **S**poofing — can an attacker impersonate a user or service?
- **T**ampering — can an attacker modify data in transit or at rest?
- **R**epudiation — can actions be denied or attributed incorrectly?
- **I**nformation disclosure — can sensitive data leak?
- **D**enial of service — can availability be disrupted?
- **E**levation of privilege — can a user gain unauthorized access?

Each threat gets a mitigation reference (which `FR-*` requirement addresses it, or `UNMITIGATED` if no requirement covers it).

The reviewer verifies that mitigations are actually implemented, not just listed.

**Acceptance criteria:**
- `threat-model.md` is produced for tasks involving auth, data handling, or external integrations
- Every `UNMITIGATED` threat is flagged as an open question
- The reviewer checks that claimed mitigations exist in the code

### v0.6d — Document update after resolution

When the orchestrator resolves an open question with the user, it updates all affected files — not just the one where the question was found. If a stack decision resolves a `TO BE DECIDED` in `requirements.md`, the orchestrator also updates `plan.md` and any downstream references.

**Acceptance criteria:**
- Resolving an open question in `requirements.md` triggers updates in `plan.md` and `threat-model.md` (if present)
- `TO BE DECIDED` markers are removed, not left as stale references

---

## v0.7 — Task decomposition and cross-language validation

**Goal:** Complex tasks are decomposed into independently testable sub-tasks, and the pipeline is validated on Go and Rust projects.

### v0.7a — Sub-task decomposition

For tasks that the architect identifies as too large for a single implementation pass, `plan.md` includes an ordered decomposition into sub-tasks. Each sub-task has:

- A title and scope (one component, endpoint, or data flow)
- Traceability to `FR-*` requirement IDs
- Dependencies on other sub-tasks (which must complete first)
- Its own acceptance criteria
- Estimated complexity (simple / moderate / complex)

The orchestrator executes sub-tasks sequentially, each with its own implementer → reviewer → test-strategist cycle. A sub-task that fails its review does not block the orchestrator from attempting the next sub-task if there is no dependency.

**Acceptance criteria:**
- The architect decomposes complex tasks without being explicitly asked
- Each sub-task is independently testable
- The orchestrator tracks sub-task progress and does not re-delegate a sub-task more than 3 times

### v0.7b — Cross-language validation

Validate the full pipeline (including requirements, ambiguity gate, and security considerations) on:

- A Go project (e.g., add an HTTP endpoint to a small Go service)
- A Rust project (e.g., add a CLI subcommand to a small Rust tool)

Document any language-specific issues in the lessons store.

**Acceptance criteria:**
- Clean pipeline run on Go with requirements + review traceability
- Clean pipeline run on Rust with requirements + review traceability
- At least one lesson candidate promoted from each language

---

## Deferred (no version target)

**Claude Code adapter:** AGENTS.md + `.claude/settings.json` permission format. The permission model is different from opencode (string-based tool names vs. pattern matching). Deferred until v0.2 completion proves the core model.

**Roo adapter:** Similar deferred status.

**Community registry:** Share role files, lesson sets, specialized teams. Requires decisions about identity, hosting, versioning, and trust. Out of scope until the core is validated.

**Conditional tool configuration:** Some roles might need different tool sets depending on the project (e.g., a role that uses `mcp__database__query` only if an MCP database tool is configured). Currently not modeled.

**Parallel subagent execution:** opencode may support running multiple subagents in parallel in the future. The current orchestration protocol is sequential (architect → implementer → reviewer). Parallel paths (e.g., test-strategist running concurrently with a second implementation pass) are not designed yet.

**Security analyst role:** A dedicated role that produces threat models and verifies security controls. Currently folded into the architect's responsibilities (v0.6c). If threat modeling proves too heavy for the architect, this becomes a separate role called between architect and implementer (like db-expert is today for data layers).

---

## Open questions

1. **Steps semantics — RESOLVED.** Confirmed: each orchestrator `task()` call and each file `read` = 1 step; subagent internal steps are independent. One full pipeline pass costs ~18 orchestrator steps. steps:35 fits one retry cycle with headroom.

2. **What is the right step budget per role?** orchestrator:35 confirmed adequate for one retry cycle. implementer:30 and others:15-20 remain intuition-based — real-task data needed. With the requirements phase (v0.5a), the architect's step budget may need to increase since it now produces two files (`requirements.md` + `plan.md`).

3. **How do lessons degrade over time?** A lesson promoted in January may be wrong or irrelevant by June. There is currently no TTL, no review cycle, and no mechanism to remove outdated lessons. Manual curation is the only mechanism.

4. **Bounded loop soft/hard cap interaction — RESOLVED.** steps:35 + 3-cycle soft cap are mechanically compatible. Partial run observed one retry cycle; math confirms two full retry cycles fit within 35 steps.

5. **Clean fail→re-delegate→pass cycle — OBSERVED.** On the Unicode slugify task, the reviewer correctly failed the implementation (4 tests for ø/Æ/em-dash), the orchestrator re-delegated to the implementer (not fixing it directly), and the fix passed all 50 tests. This validates the bounded loop design end-to-end.

6. **Ambiguity gate threshold.** The v0.5b ambiguity gate triggers when unresolved markers exceed a threshold. What is the right number? Too low (1) blocks on trivial unknowns; too high (10) lets major gaps through. Starting at 3 and adjusting based on observed behavior.

7. **Should requirements.md be a separate pipeline artifact or folded into task.md?** A separate file gives the architect a clear input and the reviewer a clear reference. Folding it into task.md keeps the workspace simpler but makes it harder to trace requirement IDs. Leaning toward separate file for traceability.

8. **Threat model scope.** Should threat modeling (v0.6c) be produced for every task or only for tasks involving auth, data handling, and external integrations? Producing it for every task adds overhead; skipping it for simple tasks risks missing security issues. The current proposal is to let the architect decide based on task content.

9. **Sub-task decomposition trigger.** How does the architect decide when a task is "too large" for a single implementation pass? Options: number of functional requirements (e.g., > 5), number of files to touch, explicit user request, or a complexity heuristic. Needs real-task data.

10. **Should the legioni self-awareness section be injected at compile time or included in each role file?** Injecting at compile time (from a shared template) means one place to update. Including it in each role file means it's visible when editing roles. Leaning toward compile-time injection for DRY, but this requires a change to the compilation pipeline.

11. **Should agents ever be allowed to run legioni commands?** Currently the proposal is "suggest to the user, never run yourself." But `legioni update` could be useful mid-session if the project profile is stale. Allowing agents with bash access to run `legioni update` would make the pipeline more autonomous but risks modifying agent configuration while agents are running. The conservative choice (suggest only) is safer for now.