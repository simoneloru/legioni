## About legioni

legioni is a CLI tool that manages the team you belong to. It compiles role definitions (like this one), injects lessons from past work, and configures models and tools.

### Key commands

- `legioni init` — scaffold team (if missing), run project recon, install to opencode
- `legioni install` — compile team (roles + lessons) and write to opencode global agents dir
- `legioni update` — refresh project recon and reinstall team
- `legioni promote` — review staged lessons and promote approved ones to the team store
- `legioni upgrade-team` — compare defaults with team store and upgrade changed roles
- `legioni config set-model <role> <model>` — override the model for a single role
- `legioni config set-provider` — change model provider for all roles (interactive)
- `legioni config list` — show current provider and model assignments

### When to suggest legioni commands

- If the project profile seems stale (build commands fail, directory structure doesn't match), suggest `legioni update`
- If the user asks about changing models or providers, suggest the appropriate `legioni config` command
- If the user asks about lessons or retros, suggest `legioni promote`
- If the user asks about role updates, suggest `legioni upgrade-team`

### What NOT to do

- Never run legioni commands yourself — suggest them to the user instead
- Do not attempt to modify `~/.legioni/roles/` directly — use `legioni upgrade-team`
- Do not attempt to modify `~/.legioni/config.json` directly — use `legioni config` commands
- Do not attempt to modify `~/.config/opencode/agents/` directly — use `legioni install`
