# Models

## Provider-based model selection [IMPLEMENTED]

legioni uses a **provider + tier** system to assign models. Roles are classified into three tiers based on their workload:

| Tier | Roles | Reasoning |
|---|---|---|
| `heavy` | architect | Complex analysis, design decisions, tradeoff evaluation |
| `medium` | orchestrator, reviewer | Coordination, delegation, pass/fail verdicts — doesn't write code, doesn't need top-tier reasoning |
| `light` | implementer, test-strategist, db-expert | Execution-heavy, mechanical, deterministic |

When you run `legioni init` for the first time, legioni asks which provider you use and assigns the appropriate models for each role. Supported providers:

| Provider | ID | Heavy model | Medium model | Light model | Auth |
|---|---|---|---|---|---|---|
| OpenCode Free | `opencode-free` | `opencode/deepseek-v4-flash-free` | `opencode/deepseek-v4-flash-free` | `opencode/north-mini-code-free` | None |
| OpenCode Zen | `opencode-zen` | `opencode/claude-opus-4-8` | `opencode/claude-sonnet-4-6` | `opencode/gpt-5.4-mini` | `$OPENCODE_API_KEY` |
| OpenCode Go | `opencode-go` | `opencode-go/glm-5.1` | `opencode-go/kimi-k2.7` | `opencode-go/deepseek-v4-flash` | `$OPENCODE_API_KEY` |
| GitHub Copilot | `github-copilot` | `github-copilot/gpt-5.2` | `github-copilot/gpt-5.1-codex` | `github-copilot/gpt-5.1-codex-mini` | Subscription |
| Anthropic | `anthropic` | `anthropic/claude-opus-4-8` | `anthropic/claude-sonnet-4-6` | `anthropic/claude-sonnet-4-5` | `$ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `openai/gpt-5.4` | `openai/gpt-5.2` | `openai/gpt-5.4-mini` | `$OPENAI_API_KEY` |
| Google | `google` | `google/gemini-3.1-pro` | `google/gemini-3.5-flash` | `google/gemini-3.1-flash-lite` | `$GEMINI_API_KEY` |
| DeepSeek | `deepseek` | `deepseek/deepseek-v4-pro` | `deepseek/deepseek-v4-flash` | `deepseek/deepseek-chat` | `$DEEPSEEK_API_KEY` |
| Custom | — | — | — | — | Set manually |

Provider selection is stored in `~/.legioni/config.json` along with the resolved model map:

```json
{
  "provider": "opencode-zen",
  "models": {
    "orchestrator": "opencode/claude-sonnet-4-6",
    "architect": "opencode/claude-opus-4-8",
    "implementer": "opencode/gpt-5.4-mini",
    "reviewer": "opencode/claude-sonnet-4-6",
    "test-strategist": "opencode/gpt-5.4-mini",
    "db-expert": "opencode/gpt-5.4-mini"
  }
}
```

### Changing provider

To switch provider for all roles at once:

```bash
legioni config set-provider
```

This shows the interactive menu, rewrites all model assignments, and auto-runs `legioni install`.

### Per-role override

To override a single role's model (without changing the rest):

```bash
legioni config set-model implementer openai/gpt-5.4-mini
legioni install
```

### Viewing current config

```bash
legioni config list
```

Shows the active provider and model assignments for each role with tier labels.

### How it works at compile time

At compile time (`legioni install` / `legioni init` / `legioni update`), `src/core/compile.ts` reads `~/.legioni/config.json` and substitutes the model for any role that has an entry in the `models` map. Role frontmatter files (`~/.legioni/roles/*.md`) are never modified. If a role ID has no entry, the frontmatter value is used as-is.

Implementation: `src/core/providers.ts` (provider registry + interactive selection), `src/core/scaffold.ts` (first-run config generation), `src/core/compile.ts` (compile-time model substitution).

## Open questions

**Should provider presets be versioned?** Model IDs change over time (new releases, deprecations). The provider registry is currently hardcoded in `providers.ts`. A future improvement could fetch the latest recommended models from an external source, but that adds complexity and network dependency.

**Should model selection be per-provider or per-model?** The current design uses a flat model string per tier per provider. An override cascade ("use Opus if Anthropic is configured, Gemini Pro if not") would be more robust but significantly more complex.
