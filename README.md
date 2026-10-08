# legioni

[![npm version](https://img.shields.io/npm/v/legioni?cacheSeconds=0&label=npm)](https://www.npmjs.com/package/legioni)

A team of AI coding agents that coordinates your work and learns from every task.

Works with [opencode](https://github.com/anomalyco/opencode) and [Zoo Code](https://github.com/Zoo-Code-Org/Zoo-Code).

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

Then start opencode (or Zoo Code) and type your task:

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
Compiling team → agents ... done
  → ~/.config/opencode/agents/architect.md
  → ~/.config/opencode/agents/implementer.md
  → ~/.config/opencode/agents/orchestrator.md
  → ~/.config/opencode/agents/reviewer.md
  → ~/.config/opencode/agents/test-strategist.md
  → ~/.config/opencode/agents/db-expert.md
  → ~/.config/Code/User/settings/custom_modes.yaml
legioni init complete.
```

By default, legioni writes agents for both classic hosts. Use `--host` to target one or everything:

```bash
legioni install --host opencode       # only OpenCode
legioni install --host zoocode        # only Zoo Code
legioni install --host docker-agent   # only Docker Agent (.legioni/docker-agent.yaml)
legioni install --host all            # all three hosts
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
| `legioni init [--host opencode\|zoocode\|docker-agent\|both\|all]` | Setup. Scaffolds team store, picks provider, detects stack, compiles agents. `both` = opencode + zoocode (default, legacy). `all` adds docker-agent. |
| `legioni install [--host opencode\|zoocode\|docker-agent\|both\|all]` | Recompile agents after promoting lessons or changing config. Default: both. |
| `legioni update [--host opencode\|zoocode\|docker-agent\|both\|all]` | Re-detect stack and recompile. Use when the project changed. Default: both. |
| `legioni doctor` | Check team store, project files, and required binaries (docker, docker agent plugin, opencode). |
| `legioni promote` | Review staged lesson candidates interactively. |
| `legioni upgrade-team` | Diff defaults against your team store and upgrade changed roles. |
| `legioni config set-provider` | Change model provider (interactive menu). |
| `legioni config set-model <role> <model>` | Override the model for one role. Run `legioni install` after. |
| `legioni config list` | Show current provider and model assignments. |

## How it works

Legioni is a **compile-time** tool: it reads your config, resolves models, and writes the final agent files that your AI host uses. The host never reads `~/.legioni/config.json` directly — it only reads the compiled agent files written to its agent directory.

1. `legioni init` copies role definitions into `~/.legioni/roles/`. The store is portable across machines.
2. `legioni install` reads each role, appends promoted lessons, applies model overrides, and writes agent files for the selected hosts (default: both):
   - **OpenCode**: agents written to `~/.config/opencode/agents/*.md` with YAML frontmatter (model, mode, permissions)
   - **Zoo Code**: agents written to `~/.config/Code/User/settings/custom_modes.yaml` as custom modes with tool group mapping
   - **Docker Agent**: team written to `<project>/.legioni/docker-agent.yaml` (orchestrator with `sub_agents` + `background_agents` for parallel dispatch). Run it with `docker agent run .legioni/docker-agent.yaml`. See `docs/DOCKER_AGENT.md`.
   Use `--host` to target a single host. **Always run `legioni install` after any config change**.
3. `legioni config set-provider` changes the provider and runs `install` automatically. `legioni config set-model` does **not** — you must run `legioni install` yourself.
4. If you edit `~/.legioni/config.json` by hand, **run `legioni install`** to apply the changes.
5. `legioni init` also detects your stack and writes `.legioni/project.md`, registered in `opencode.json` (OpenCode) and `.roo/rules/legioni.md` (Zoo Code). The docker-agent team file (`.legioni/docker-agent.yaml`) lives in the same git-excluded workspace, so no extra registration is needed.
6. During a session, agents write workspace artifacts (plan, review, test results) and stage lesson candidates.
7. `legioni promote` lets you review and promote lessons. They get injected into agent prompts on next compile.
8. `legioni upgrade-team` syncs your store with newer defaults from legioni releases.

## License

MIT