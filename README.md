# legioni

[![npm version](https://img.shields.io/npm/v/legioni?cacheSeconds=0&label=npm)](https://www.npmjs.com/package/legioni)

A team of AI coding agents that coordinates your work and learns from every task.

Requires [opencode](https://github.com/anomalyco/opencode).

## How you use it

```bash
# one-time install (needed for promote, install, upgrade-team)
npm install -g legioni

cd your-project
legioni init        # detects stack, compiles agents
```
Or without installing anything:
```bash
cd your-project
npx legioni init
```

Then start opencode and type your task:

```
opencode
@orchestrator add a truncate(text, max_len, suffix='...') function with tests
```

That's it. The orchestrator plans the work, delegates to specialist agents, and loops until tests pass. You watch.

```text
orchestrator  →  architect     →  plan.md
              →  implementer   →  code + tests
              →  reviewer      →  passes or fails
              →  test-strategist → edge cases + full suite
              ←  done: code is written, tested, and reviewed
```

After the session, the agents propose lessons from what they learned:

```bash
legioni promote    # review each lesson, approve or reject
legioni install    # recompile agents with the approved lessons
```

Next task, those lessons are active. The team gets better each time.

## Tested on real projects

| Project | Language | Tests | What happened |
|---|---|---|---|
| Apache Commons Compress | Java / Maven | 1890 | All pass, reviewer ran real `mvn test` |
| Apache Commons Text | Java / Maven | 1890 | All pass, orchestrator fixed corrupted existing code, reviewer verified |
| truncate function | Python / pytest | 13 | Architect's spec had arithmetic errors, reviewer caught them, implementer fixed |
| slugify + Unicode | Python / pytest | 50 | Implementer missed Nordic letters, reviewer failed it, implementer fixed on cycle 2. Lesson promoted. Next project, caught on first pass. |

## What it looks like

```text
$ legioni init
Running project recon ... done
  → .legioni/project.md
Compiling team → opencode agents ... done
  → ~/.config/opencode/agent/architect.md
  → ~/.config/opencode/agent/implementer.md
  → ~/.config/opencode/agent/orchestrator.md
  → ~/.config/opencode/agent/reviewer.md
  → ~/.config/opencode/agent/test-strategist.md
  → ~/.config/opencode/agent/db-expert.md
legioni init complete.
```

On a real project, recon detects your stack:

```yaml
# .legioni/project.md (auto-generated)
## Stack
- Language: Java
- Framework: Maven

## Commands
- Build: `mvn compile`
- Test: `mvn test`
- Targeted test: `mvn test -Dtest=<TestClass>`
```

After a session, agents stage lesson candidates:

```text
$ legioni promote
Reading staged lessons from .legioni/lessons.staging.*.md ...

────────────────────────────────────────────────────────────
Role: reviewer   Slug: [nordic-char-limitation-in-nfkd]
────────────────────────────────────────────────────────────
Situation: Reviewing a Unicode normalization implementation
that used pure NFKD + ASCII encoding.
Decision: Flagged as failure because ø, Ø, æ, Æ have no
NFKD decomposition — they get dropped entirely.
Why: A manual transliteration table is needed before NFKD.
────────────────────────────────────────────────────────────
Promote? [y/n/q] y
  → Promoted to ~/.legioni/lessons/reviewer/[nordic-...].md

────────────────────────────────────────────────────────────
Role: orchestrator   Slug: [task-brief-precision]
────────────────────────────────────────────────────────────
Situation: The codebase had no Hex class — the complete
class had to be created from scratch.
Decision: Wrote a detailed task brief with acceptance
criteria covering null handling and hex alphabet.
────────────────────────────────────────────────────────────
Promote? [y/n/q] n
```

## Commands

| Command | What it does |
|---|---|
| `legioni init` | Setup. Scaffolds team store, picks provider, detects stack, compiles agents. |
| `legioni install` | Recompile agents after promoting lessons or changing config. |
| `legioni update` | Re-detect stack and recompile. Use when the project changed. |
| `legioni promote` | Review staged lesson candidates interactively. |
| `legioni upgrade-team` | Diff defaults against your team store and upgrade changed roles. |
| `legioni config set-provider` | Change model provider (interactive menu). |
| `legioni config set-model <role> <model>` | Override the model for one role. Run `legioni install` after. |
| `legioni config list` | Show current provider and model assignments. |

## How it works

Legioni is a **compile-time** tool: it reads your config, resolves models, and writes the final agent files that opencode uses. OpenCode never reads `~/.legioni/config.json` directly — it only reads the compiled agent files in `~/.config/opencode/agents/`.

1. `legioni init` copies role definitions into `~/.legioni/roles/`. The store is portable across machines.
2. `legioni install` reads each role, appends promoted lessons, applies model overrides, writes agent files to `~/.config/opencode/agents/`. **Always run this after any config change**, otherwise subagents keep using stale models.
3. `legioni config set-provider` changes the provider and runs `install` automatically. `legioni config set-model` does **not** — you must run `legioni install` yourself.
4. If you edit `~/.legioni/config.json` by hand, **run `legioni install`** to apply the changes. Until you do, opencode sees the old models.
5. `legioni init` also detects your stack and writes `.legioni/project.md`, registered in `opencode.json`.
6. During a session, agents write workspace artifacts (plan, review, test results) and stage lesson candidates.
7. `legioni promote` lets you review and promote lessons. They get injected into agent prompts on next compile.
8. `legioni upgrade-team` syncs your store with newer defaults from legioni releases.

## License

MIT