# Architecture

## Core model: compiler, not runtime

legioni runs at init/install/update/promote time. It reads source definitions, transforms them, writes output, and exits. It has no process running during AI sessions, intercepts no tool calls, and adds no latency to any agent interaction.

This is a deliberate constraint. A runtime would require hooking into host tool internals, which differ across opencode, Claude Code, Roo, and Cursor — and would couple legioni to host API stability. A compiler writes to the host's stable public format (agent markdown files) and is done.

## Three state locations

```
~/.legioni/                        ← Team store (global, git-backed, yours)
  roles/
    orchestrator.md
    architect.md
    implementer.md
    reviewer.md
    test-strategist.md
    db-expert.md
  lessons/
    orchestrator/
      <slug>.md
    implementer/
      <slug>.md
    ...

<project>/.legioni/                ← Workspace (per-project, ephemeral, git-excluded)
  project.md                     ← recon output; loaded by host at session start
  task.md                        ← orchestrator writes before delegating
  plan.md                        ← architect writes
  impl-notes.md                  ← implementer writes
  review.md                      ← reviewer writes (status: pass|fail)
  test-results.md                ← test-strategist writes (status: pass|fail)
  lessons.staging.orchestrator.md
  lessons.staging.architect.md
  lessons.staging.implementer.md
  lessons.staging.reviewer.md
  lessons.staging.test-strategist.md
  lessons.staging.db-expert.md

~/.config/opencode/agents/       ← Host config (opencode-specific, written by legioni)
  orchestrator.md
  architect.md
  ...

<project>/opencode.json          ← Project-scoped host config (written by legioni)
  { "instructions": [".legioni/project.md"] }
```

**Why three locations, not one or two:**

- Team store is global because roles and lessons are transferable — they should follow the practitioner, not the project.
- Workspace is per-project because the project profile and session artifacts are ephemeral and project-specific.
- Host config is separate because it is in the host tool's format, not legioni's format, and it must not be part of the team store.

## Two knowledge types

**Transferable knowledge** — lives in `~/.legioni/`. Includes role playbooks (what each agent knows about how to do its job) and promoted lessons (distilled from real work). This knowledge is portable: it applies regardless of which project you're in.

**Local knowledge** — lives in `.legioni/project.md`. Includes stack, framework, build/test commands, top-level directory structure, and any existing AGENTS.md/CLAUDE.md instructions. This knowledge is session-specific: it tells agents what they're working on right now.

These two types are injected differently. Transferable knowledge is baked into the compiled agent prompt at `legioni install` time. Local knowledge is loaded by the host tool at session start via `opencode.json`'s `instructions` field.

## Compilation pipeline

```
~/.legioni/roles/<id>.md           (role frontmatter + prompt body)
    +
~/.legioni/lessons/<id>/*.md       (promoted lessons, sorted by created date)
    +
~/.legioni/config.json             (optional: models override map)
    ↓  src/core/compile.ts
CompiledRole { id, frontmatter, prompt }
    ↓  src/adapters/opencode.ts
~/.config/opencode/agents/<id>.md
```

`compile.ts` appends lessons as a `## Lessons` section at the end of the prompt body. If there are no lessons for a role, the section is omitted entirely. If `~/.legioni/config.json` has a `models` map, role model IDs are overridden at compile time (see [Models](MODELS.md)). The project profile is not touched here — it reaches agents via the host's `instructions` mechanism.

## Zero git trace invariant

legioni must leave no trace in any repository's git history. Specifically:

- `.legioni/` is added to `.git/info/exclude` (local, not tracked `.gitignore`)
- `opencode.json` is added to `.git/info/exclude` if it was not already tracked
- If `opencode.json` is already tracked in the repo, legioni warns but does not add the exclude (the exclude has no effect on tracked files)
- legioni never writes to or modifies the project's `.gitignore`

The result: `git status` is clean after `legioni init` in any repo.

## Command responsibilities

| Command | Scaffold | Recon | Compile | Write agents | Write opencode.json |
|---|---|---|---|---|---|
| `legioni init` | if missing | yes | yes | yes | yes |
| `legioni install` | no | no | yes | yes | yes |
| `legioni update` | no | yes | yes | yes | yes |
| `legioni promote` | no | no | no | no | no |

## Key invariants

1. legioni never modifies tracked files in a project repository without warning.
2. The workspace (`.legioni/`) is considered ephemeral — it can be deleted and reconstructed by `legioni update`.
3. The team store (`~/.legioni/`) is the source of truth. Compiled host config is always a derivative.
4. Promoted lessons are append-only in the store. Deletion requires manual action.
5. legioni has no opinion about which model is used — the model ID is in the role frontmatter and is controlled by the practitioner. [See Models](MODELS.md) for current state.
