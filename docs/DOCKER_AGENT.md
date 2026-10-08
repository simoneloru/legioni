# Docker Agent host

legioni can compile the same team to a [Docker Agent](https://docs.docker.com/ai/docker-agent/) team file.

## Generate

```bash
legioni install --host docker-agent
# writes .legioni/docker-agent.yaml (git-excluded workspace file)

legioni install --host all
# opencode + zoocode + docker-agent
```

`both` keeps the legacy behavior (opencode + zoocode). `all` adds docker-agent.

## Run

```bash
docker agent run .legioni/docker-agent.yaml
docker agent run .legioni/docker-agent.yaml --exec "add tests for X"

# headless / over ssh (e.g. oci-ai)
ssh oci-ai "docker agent run ~/project/.legioni/docker-agent.yaml --exec 'fix failing tests'"
```

## How it maps

- Each role becomes one entry under `agents:` with the compiled prompt (role body + shared context + promoted lessons) as `instruction`.
- `orchestrator` gets `sub_agents: [architect, implementer, reviewer, test-strategist, db-expert]` plus `background_agents` so independent work runs via `run_background_agent` + `wait_background_agents` instead of sequentially.
- opencode tools map to docker toolsets: read/grep/glob/list → `filesystem`, bash → `shell`, todowrite/todo → shared `todo`, webfetch → `fetch`, websearch → `docker:duckduckgo` MCP, plus `think` for coordination.
- Model IDs pass through verbatim from `~/.legioni/config.json`. Use `legioni config set-model <role> <provider/model>` with a Docker-supported model (e.g. `openai/gpt-5-mini`, `anthropic/claude-sonnet-4-5`) or a custom OpenAI-compatible provider pointing at your gateway.

## Checks

```bash
legioni doctor
docker agent --help
```
