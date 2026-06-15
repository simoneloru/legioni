# Decisions

ADR-style log of significant design choices. Each entry includes what was decided, why, and what was rejected and why.

---

## ADR-001: Compiler model, not runtime

**Decision:** legioni runs at init/install/update/promote time, writes to host config, and exits. No daemon, no runtime interception, no process during AI sessions.

**Why:** A runtime would require injecting into host tool internals — tool call hooks, session lifecycle events, prompt injection. These APIs differ across opencode, Claude Code, Roo, and Cursor. They are also unstable: host tools change their internal APIs frequently. A runtime legioni would break on every host tool update.

A compiler writes to stable, public configuration formats (markdown agent files, JSON config). These formats are host-versioned and documented. Breakage is predictable and fixable without changing legioni's core.

**Rejected: Runtime proxy** — intercept AI tool calls and dynamically inject lessons and profile. Too fragile. Requires host-specific hooks that don't exist in a stable public form. Also adds latency to every agent interaction.

**Rejected: Plugin system** — legioni as an opencode plugin that runs within the host. Ties legioni entirely to one host's plugin API. Non-starter for portability.

---

## ADR-002: Three state locations

**Decision:** Team store (`~/.legioni/`) is global and git-backed. Workspace (`.legioni/`) is per-project and ephemeral. Host config (`~/.config/opencode/agents/`) is a derivative written by legioni.

**Why:** These three types of information have fundamentally different ownership and lifetimes.

- The team definition (who the agents are, what they know) belongs to the practitioner, not the project. It should travel across machines and projects.
- The project profile (what we're working on right now) is ephemeral and project-specific. It has no value after the project or session is over.
- The host config is not authoritative — it is always regenerated from the team store. Treating it as a derivative means it can always be reconstructed from scratch with `legioni install`.

**Rejected: Single global config** — one file for everything. Conflates transferable and local knowledge. Every project would pollute the global state.

**Rejected: Per-project team** — team definition lives in the project repo. Team knowledge fragments: you maintain a different team for every project, and lessons don't transfer.

---

## ADR-003: Zero git trace

**Decision:** legioni uses `.git/info/exclude` to exclude its workspace files from git. It never modifies the project's tracked `.gitignore`.

**Why:** In repositories the practitioner doesn't own (client repos, open-source repos, work repos), modifying `.gitignore` creates a diff that requires explaining to other contributors. `.git/info/exclude` is local-only and never committed.

**Why not `.gitignore`:** It's a tracked file. Adding an entry to it creates a dirty working tree and potentially a conflict with other contributors' git configuration.

**Why not asking the user to add it themselves:** That's a friction point on every new project. legioni should leave no setup burden.

**Edge case:** If `opencode.json` is already tracked in the repo, legioni cannot exclude it (`.git/info/exclude` has no effect on tracked files). In this case, legioni warns the user that its modification will appear in git status.

---

## ADR-004: Project-scoped opencode.json, not global

**Decision:** The `.legioni/project.md` profile is registered in a project-scoped `opencode.json` at the project root, not in the global `~/.config/opencode/opencode.json`.

**Why:** The global opencode config uses relative paths in `instructions`, and the resolution of relative paths against the global config is undocumented. In practice, relative paths in the global config resolve against the opencode binary's working directory, not the project root — making them useless for per-project profiles.

Project-scoped `opencode.json` has explicitly documented behavior: `instructions` paths are resolved relative to the project root. This is exactly what legioni needs.

**Rejected: Global config entry with absolute path** — would hardcode the project's absolute path in the global config, breaking as soon as the project moves or the config is synced to another machine.

**Rejected: Baking the profile into the compiled agent files** — the profile is per-project; agent files are global. Baking the profile into agents means every project's profile is injected into every session, including sessions in other projects. The profiles would also conflict and grow stale.

---

## ADR-005: Per-role staging files

**Decision:** Each role writes lesson candidates to its own staging file: `.legioni/lessons.staging.<role>.md`.

**Why:** If multiple subagents finish their retro at the same time (possible if opencode runs them in parallel in the future), a single shared staging file could receive concurrent writes that interleave and corrupt the content. Per-role files eliminate this race condition entirely.

**Rejected: Single shared staging file** — simpler to implement and parse, but fragile under concurrent writes. The implementation complexity of per-role files is low.

**Rejected: Immediate write to team store** — lessons should not bypass human review. The staging → promote flow enforces a human gate.

---

## ADR-006: Bounded loop with two layers

**Decision:** The orchestrator uses two independent loop-breaking mechanisms: a prompt-level cycle counter (soft cap at 3 review failures) and a `steps: 35` mechanical cap enforced by opencode.

**Why:** Prompt-only loop breaking is unreliable. An LLM can miscount, get confused about what constitutes a "cycle," or have its loop-breaking instruction displaced from its attention window by long task context. The mechanical `steps` cap enforced by the host is absolute — it cannot be argued with or forgotten.

Conversely, relying only on the mechanical cap has no semantic exit: the orchestrator is cut off mid-task without communicating why or what remains. The prompt-level counter gives the orchestrator a way to report its state gracefully before hitting the mechanical limit.

**Rejected: Prompt-only loop protection** — unreliable. Already observed in one partial test: the orchestrator said "after 3 cycles" after only 2.

**Rejected: Mechanical cap only** — the orchestrator gets cut off without a useful response to the user.

---

## ADR-007: Reviewer tool deny:edit (structural enforcement)

**Decision:** The Reviewer role has `edit` in its deny list. The host enforces this — the reviewer cannot call the edit tool even if it tries.

**Why:** A reviewer that can edit code will sometimes "help" by quietly fixing the issues it finds instead of reporting them. This defeats the purpose of the review step: catching problems so the implementer can learn from them and the orchestrator can track them. If the reviewer fixes silently, the implementer never sees the feedback and the orchestrator has no record of the issue.

The tool deny makes this architecturally impossible, not just prompted-against.

**Rejected: Prompt-only discipline** — "as a reviewer, you must not edit code" is a soft constraint. Under pressure (e.g., "it's just a typo"), the model will rationalize an edit. The tool deny removes the option entirely.

---

## ADR-008: Human-in-the-loop lesson promotion

**Decision:** Lessons are not automatically promoted from staging to the team store. The practitioner reviews each candidate via `legioni promote` and approves or rejects it.

**Why:** LLM-generated lessons can be:
- Wrong: the agent misdiagnosed what happened
- Redundant: already in the team store as an existing lesson
- Over-fitted: captures a one-time quirk, not a reusable principle
- Poorly stated: too vague to apply in future situations

A human gate before injection into the permanent team store prevents the team from accumulating noise. This is especially important early in a team's life when the agents have not yet been validated.

**Rejected: Automatic promotion** — fast but dangerous. A wrong lesson baked into the team store silently degrades every future task.

**Rejected: LLM-mediated promotion** — having an LLM review the LLM-generated lessons adds latency and cost, and still requires the practitioner to trust the reviewer LLM's judgment about the generating LLM's judgment.

---

## ADR-009: CommonJS over ESM

**Decision:** `tsconfig.json` targets `"module": "commonjs"`. `__dirname` is available. No `import.meta.url` gymnastics.

**Why:** `defaults/` is bundled with the package and must be located at runtime using `__dirname`. In CommonJS, `__dirname` is available in every module without configuration. In ESM, the equivalent (`import.meta.url` + `fileURLToPath`) requires boilerplate and does not work in all Node.js versions that legioni might target.

The codebase has no use case for ESM-specific features (top-level await, native ES modules). CommonJS is the simpler choice for a CLI tool.

**Rejected: ESM** — correct long-term direction for Node.js, but adds friction around `__dirname` in a package that needs to locate its own bundled files at runtime.

---

## ADR-010: No telemetry, no analytics

**Decision:** legioni collects no data. No usage events, no error reporting, no opt-in analytics.

**Why:** legioni operates in the context of real codebases, some of which contain proprietary code. Any telemetry mechanism — however minimal — creates a potential data exfiltration path. The trust surface must be zero.

**Rejected: Opt-in telemetry** — the "opt-in" UX decision is itself a trust surface (opt-in can become opt-out, defaults change). The simplest correct answer is no telemetry infrastructure at all.
