# Memory

legioni has a two-tier memory system: promoted lessons (global, persistent) and staged candidates (per-project, ephemeral).

## Promoted lessons — `~/.legioni/lessons/`

Lessons that have passed human review live in the team store:

```
~/.legioni/lessons/
  orchestrator/
    <slug>.md
    <slug>.md
  architect/
    <slug>.md
  implementer/
    ...
  reviewer/
    ...
  test-strategist/
    ...
  db-expert/
    ...
```

Each lesson file has gray-matter frontmatter:

```markdown
---
id: slug
role: orchestrator
created: 2026-06-14
tags: []
---

**Situation**: what happened
**Decision**: what was chosen
**Why**: the reasoning
```

The `tags` field exists in the schema but is not currently used by any tooling. [OPEN QUESTION: filtering by tag at compile time]

Lessons are sorted by `created` date before injection. Newest lessons appear last in the compiled prompt.

## Staged candidates — `.legioni/lessons.staging.<role>.md`

During a task, each agent appends retro candidates to its own staging file. Per-role files avoid concurrent-append corruption if subagents write simultaneously.

Format inside a staging file:

```markdown
## slug-for-this-lesson

**Situation**: what happened
**Decision**: what was chosen
**Why**: the reasoning

## another-lesson-slug

**Situation**: ...
```

Each `## heading` is one candidate. The `readStagedLessons()` function in `src/core/lessons.ts` splits on `## ` headers to extract individual candidates.

Staging files are ephemeral and git-excluded. `legioni promote` removes each candidate from its staging file as soon as you decide it (y or n). If you quit with `q`, only the candidates you already reviewed are removed; the remaining unreviewed candidates stay for the next `legioni promote` run. A candidate is never shown twice.

## Lesson lifecycle

```
agent writes candidate → .legioni/lessons.staging.<role>.md
                              ↓
              legioni promote (interactive Y/N/Q)
                              ↓
           ~/.legioni/lessons/<role>/<slug>.md
                              ↓
                  legioni install / update
                              ↓
         ~/.config/opencode/agents/<role>.md
         (prompt body + ## Lessons section at bottom)
```

## Compile-time injection

`src/core/compile.ts` appends promoted lessons to the prompt body:

```typescript
if (lessons.length > 0) {
  const body = lessons.map(l => `### ${l.id}\n\n${l.body}`).join('\n\n')
  prompt += `\n\n## Lessons\n\nThe following lessons were distilled from past work. Apply them when the situation matches.\n\n${body}`
}
```

If a role has no promoted lessons, the `## Lessons` section is omitted entirely. The agent's prompt body is unchanged.

## Promotion flow (`legioni promote`)

`legioni promote` reads all `.legioni/lessons.staging.*.md` files in the current project's workspace, shows each candidate in the terminal (role, slug, body), and prompts Y/N/Q:

- `y` — writes to `~/.legioni/lessons/<role>/<slug>.md`; candidate removed from staging
- `n` — skips (candidate removed from staging, not promoted)
- `q` — stops reviewing immediately; remaining candidates stay in staging

After promoting, the tool reminds you to run `legioni install` to recompile the team with the new lessons.

If all candidates are removed from a staging file (whether promoted or skipped), the file is deleted automatically. Staging files with remaining candidates are left intact.

Slug normalization: during promotion, lesson slugs are lowercased, spaces replaced with hyphens, and non-alphanumeric characters stripped.

## What makes a good lesson

A lesson is worth promoting if:
1. It describes a non-obvious decision — something the role got wrong the first time, or handled well in a surprising way
2. It is reusable — it would apply in future tasks beyond the one that generated it
3. It is specific — "when the plan mentions a migration, always check the existing migration numbering convention before writing a new one" is useful; "be careful with migrations" is not

Lessons that describe project-specific state (e.g., "this repo uses Knex") belong in the project profile, not the team store.
