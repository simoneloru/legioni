# Team

The default legioni team has six roles. Five are specialists; one (Orchestrator) coordinates them. All role files live at `~/.legioni/roles/<id>.md`.

**Status of team behavior:** Validated end-to-end on a real TypeScript task (slugify utility). Confirmed behaviors: reviewer runs actual build and test commands and quotes real terminal output; task↔plan divergence flagged as `status: fail`; review-cycle counter incremented and re-delegation triggered on real failures; fault-injection run (disabled NFKD step) caught, fixed, and verified in one orchestrator cycle, 10/10 tests passing. See ROADMAP.md for what remains unobserved.

## Roles

### Orchestrator

| Property | Value |
|---|---|
| Model | `opencode/deepseek-v4-flash-free` |
| Mode | `primary` (user-facing) |
| Steps | 35 |
| Temperature | 0.3 |
| Tools allowed | `read`, `edit`, `task` |
| Tools denied | `bash`, `grep`, `glob`, `list`, `todowrite`, `webfetch`, `websearch` |

The only agent that speaks to the user. Does not write code, does not review, does not run shell commands. Its job is to understand the task, write a brief, delegate to specialists, read outcomes, and decide what happens next.

The denial of `bash`, `grep`, and `glob` is structural: the orchestrator must not perform its own recon or implement directly, even if it "knows how." Forcing it through the `task` tool is how delegation is enforced at the tool level.

### Architect

| Property | Value |
|---|---|
| Model | `opencode/deepseek-v4-flash-free` |
| Mode | `subagent` |
| Steps | 15 |
| Temperature | 0.2 |
| Tools allowed | `read`, `edit`, `grep`, `glob`, `list`, `bash` |
| Tools denied | `task` |

Translates the task brief into a concrete, implementer-ready plan. Reads the codebase, writes `.legioni/plan.md`. Does not write production code. The `task` deny prevents it from spawning sub-subagents.

### Implementer

| Property | Value |
|---|---|
| Model | `opencode/north-mini-code-free` |
| Mode | `subagent` |
| Steps | 30 |
| Temperature | 0.2 |
| Tools allowed | `read`, `edit`, `bash`, `grep`, `glob`, `list`, `todowrite` |
| Tools denied | `task` |

Executes the plan. Has the highest step budget because implementation takes the most iterations (edit → build → test → fix). Writes source files and `.legioni/impl-notes.md`. Sonnet is used here (not Opus) because implementation is less about judgment and more about execution.

### Reviewer

| Property | Value |
|---|---|
| Model | `opencode/deepseek-v4-flash-free` |
| Mode | `subagent` |
| Steps | 15 |
| Temperature | 0.1 |
| Tools allowed | `read`, `grep`, `glob`, `list`, `bash` |
| Tools denied | `edit`, `task`, `todowrite`, `webfetch`, `websearch` |

Verifies the implementation against the task brief (`.legioni/task.md`), not just the plan. Runs the actual build and test commands and quotes real terminal output in `.legioni/review.md`. Answers one question: does the implementation pass the build, pass the tests, and satisfy every acceptance criterion in `task.md`?

The `edit` deny is structural enforcement: the reviewer cannot fix what it finds. `bash` is allowed only for running build/test commands and inspecting files — never to modify anything.

Low temperature (0.1) because review is a yes/no determination, not creative work.

### Test Strategist

| Property | Value |
|---|---|
| Model | `opencode/north-mini-code-free` |
| Mode | `subagent` |
| Steps | 20 |
| Temperature | 0.2 |
| Tools allowed | `read`, `edit`, `bash`, `grep`, `glob`, `list` |
| Tools denied | `task` |

Called after a passing review. Writes tests covering the acceptance criteria in `.legioni/plan.md`, matching existing test framework and conventions. Runs the test suite and writes `.legioni/test-results.md` with `status: pass` or `status: fail`. If `status: fail`, stops — does not attempt to fix the implementation (that is the implementer's job; the orchestrator re-delegates).

### DB Expert

| Property | Value |
|---|---|
| Model | `opencode/north-mini-code-free` |
| Mode | `subagent` |
| Steps | 20 |
| Temperature | 0.1 |
| Tools allowed | `read`, `edit`, `bash`, `grep`, `glob`, `list` |
| Tools denied | `task` |

Called by the orchestrator between Architect and Implementer when a plan involves schema changes, migrations, or non-trivial queries. Owns the data layer entirely. The implementer then handles application code only.

Very low temperature (0.1) because database operations must be deterministic and conservative.

## Standard delegation sequence

```
User → @orchestrator (primary)
         │
         ├─ writes .legioni/task.md
         ├─ calls @architect → writes .legioni/plan.md
         │   [if data layer involved: calls @db-expert first]
         ├─ calls @implementer → writes source files + .legioni/impl-notes.md
         ├─ calls @reviewer → writes .legioni/review.md (status: pass|fail)
         │
         ├─ if pass → calls @test-strategist → writes .legioni/test-results.md
         │     ├─ if pass → done
         │     └─ if fail → calls @implementer (with test failures) → @reviewer → @test-strategist → repeat
         └─ if fail → calls @implementer (with review content) → @reviewer → repeat
```

## Bounded loop

Two layers of protection against infinite loops:

**Prompt-level (soft cap):** The orchestrator tracks review cycles in its working memory. A review cycle is defined strictly as: the orchestrator called @reviewer, it produced `.legioni/review.md`, and that file contains `status: fail`. Model errors, tool errors, and missing output files are NOT review failures — the orchestrator retries those once and escalates without touching the counter. On the third genuine `status: fail`, it escalates to the user, quoting `.legioni/review.md` in full.

**Mechanical (hard cap):** `steps: 35` on the orchestrator. Each `task()` call and each file read consumes one step. When the step budget is exhausted, opencode forces the orchestrator to respond with text only — it cannot delegate further. This applies regardless of what the prompt says.

The orchestrator's prompt acknowledges this: "Each task() call and each file read is one step. You have roughly 4 full pipeline cycles before opencode forces you to respond."

**Status:** The 3-cycle soft cap and 35-step hard cap are mechanically compatible. Confirmed: each orchestrator `task()` call and each file read counts as one step; subagent internal steps do not count against the orchestrator's budget. One full pipeline pass (arch + impl + review + test) consumes ~18 orchestrator steps, leaving room for one retry cycle and reporting within the 35-step budget. The 3-cycle soft cap has not yet been exhausted in a single run (only one retry cycle observed).

## Workspace file contract

Agents read and write these files during a task session. All paths are relative to the project root.

| File | Writer | Readers | When |
|---|---|---|---|
| `.legioni/project.md` | legioni recon | all agents | loaded at session start via opencode.json |
| `.legioni/task.md` | orchestrator | architect | step 1 of every pipeline |
| `.legioni/plan.md` | architect | implementer, reviewer, test-strategist | after architect completes |
| `.legioni/impl-notes.md` | implementer | reviewer | after each implementation pass |
| `.legioni/review.md` | reviewer | orchestrator | after each review pass |
| `.legioni/test-results.md` | test-strategist | orchestrator | after test-strategist completes |
| `.legioni/lessons.staging.<role>.md` | each role (end-of-task) | legioni promote | after session ends |

These files are ephemeral. They are overwritten on each task run and excluded from git. They exist only to pass information between agents within a single task pipeline.

## End-of-task retro

After completing or escalating a task, each agent appends lesson candidates to its per-role staging file (`.legioni/lessons.staging.<role>.md`). Format:

```markdown
## slug-for-this-lesson

**Situation**: what happened
**Decision**: what was chosen
**Why**: the reasoning
```

Per-role files prevent concurrent-append corruption if multiple subagents happen to write simultaneously.

Limits per task: orchestrator ≤3, architect ≤2, implementer ≤3, reviewer ≤2, test-strategist ≤2, db-expert ≤2.
