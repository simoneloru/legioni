# Adapters

An adapter translates compiled legioni roles into a host tool's native agent format. The adapter is the only host-specific code in legioni. Everything else (team loading, compilation, lessons) is adapter-agnostic.

**Implemented:** opencode v1  
**Deferred:** Claude Code, Roo, Cursor

Implementation: `src/adapters/opencode.ts`

## opencode adapter

### Agent files

opencode loads agents from `~/.config/opencode/agents/<id>.md`. legioni writes one file per role.

File format:

```markdown
---
description: Orchestrator — legioni team agent
mode: primary
model: opencode/deepseek-v4-flash-free
temperature: 0.3
steps: 20
permission:
  read: allow
  edit: allow
  task: allow
  bash: deny
  grep: deny
  glob: deny
  list: deny
  todowrite: deny
  webfetch: deny
  websearch: deny
---

## Identity

You are the Orchestrator...

[role prompt body]

## Lessons

[injected at compile time if any promoted lessons exist]
```

The YAML frontmatter fields:

| Field | Required | Notes |
|---|---|---|
| `description` | yes | Always `"<Name> — legioni team agent"` |
| `mode` | yes | `primary` (user-facing) or `subagent` (called via task()) |
| `model` | yes | Provider-qualified model ID, e.g., `anthropic/claude-opus-4-8` |
| `temperature` | no | Omitted if not set in role frontmatter |
| `steps` | no | Omitted if not set. Hard cap on agentic iterations before opencode forces text response. |
| `permission` | no | `<tool>: allow` or `<tool>: deny`. Only emitted if allow or deny lists are non-empty. |

### steps field semantics

`steps` is opencode's mechanical iteration cap: the maximum number of agentic steps (tool calls + reasoning cycles) an agent can perform before opencode forces it to respond with plain text. This is enforced by the host, not the prompt.

It is not a request limit. It is not a soft suggestion. If an agent hits its step budget mid-task, it will be cut off regardless of what it's doing.

### Project profile injection

Each project gets a `opencode.json` at its root with the project profile registered as an instruction:

```json
{
  "instructions": [".legioni/project.md"]
}
```

opencode resolves this relative path against the project root at session start, so every agent in that session automatically receives the project profile as prepended context.

This is a project-scoped file, not the global `~/.config/opencode/opencode.json`. The choice is deliberate: relative paths in the global config have undocumented resolution behavior; project-scoped files have explicit and documented semantics.

### Zero git trace

`legioni init` and `legioni install` ensure the project workspace leaves no git trace:

1. `.legioni/` is added to `.git/info/exclude` (by `init.ts`)
2. `opencode.json` is added to `.git/info/exclude` if it was not already tracked (by `opencode.ts:addToGitExclude`)

`.git/info/exclude` is a local-only gitignore file — it is not committed, not visible to other contributors, and does not modify the repo's tracked `.gitignore`.

**Edge case:** If `opencode.json` is already tracked in the project (some projects commit it), legioni merges its `instructions` entry into the existing file and warns:

```
⚠  opencode.json is git-tracked in this repo — this edit will
   appear in git status. Stash or revert it when done.
```

legioni does not add `opencode.json` to the exclude file in this case (`.git/info/exclude` has no effect on tracked files).

### What legioni writes vs. what opencode owns

legioni writes:
- `~/.config/opencode/agents/<id>.md` — compiled agent files (overwritten on each install)
- `<project>/opencode.json` — adds `instructions` entry (merged, not overwritten)

legioni never writes:
- `~/.config/opencode/opencode.json` — the global opencode config
- Any other file in `~/.config/opencode/`

If you have global opencode configuration (providers, themes, keybindings), legioni will not touch it.

## Writing a new adapter

To add a host tool adapter:

1. Create `src/adapters/<host>.ts`
2. Export `writeAgents(roles: CompiledRole[]): string[]` — writes agent files, returns paths written
3. Export `upsertProjectInstructions(cwd: string): { configPath: string, added: boolean, tracked: boolean }` — registers the project profile with the host
4. Implement the zero git trace contract (exclude what legioni writes, warn on tracked files)
5. Wire up in `src/commands/init.ts` and `src/commands/install.ts`

The `CompiledRole` type contains everything needed: `id`, `frontmatter` (model, mode, tools, steps, temperature), and `prompt` (body + injected lessons). The adapter's job is to format this into the host's native format.

## Deferred adapters

**Claude Code:** Claude Code uses `CLAUDE.md` for project instructions and `.claude/settings.json` for tool permissions. Agent-mode multi-agent support exists but the configuration surface is different from opencode. [DEFERRED]

**Roo:** Similar deferred status. [DEFERRED]

The adapter interface is designed so that both could be added without touching the compiler or team core.
