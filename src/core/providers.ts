import fs from 'fs'
import path from 'path'
import readline from 'readline'
import chalk from 'chalk'
import { TEAM_STORE_DIR } from './team'

export type Tier = 'heavy' | 'medium' | 'light'

interface ProviderPreset {
  id: string
  name: string
  description: string
  tiers: Record<Tier, string>
}

const ROLE_TIER: Record<string, Tier> = {
  orchestrator: 'medium',
  architect: 'heavy',
  reviewer: 'medium',
  implementer: 'light',
  'test-strategist': 'light',
  'db-expert': 'light',
}

export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'opencode-free',
    name: 'OpenCode Free',
    description: 'Free models (DeepSeek V4 Flash, North Mini) — no API key needed',
    tiers: {
      heavy: 'opencode/deepseek-v4-flash-free',
      medium: 'opencode/deepseek-v4-flash-free',
      light: 'opencode/north-mini-code-free',
    },
  },
  {
    id: 'opencode-zen',
    name: 'OpenCode Zen',
    description: 'Pay-as-you-go, tested and benchmarked models',
    tiers: {
      heavy: 'opencode/claude-opus-4-8',
      medium: 'opencode/claude-sonnet-4-6',
      light: 'opencode/gpt-5.4-mini',
    },
  },
  {
    id: 'opencode-go',
    name: 'OpenCode Go',
    description: '$10/mo subscription, reliable open models',
    tiers: {
      heavy: 'opencode-go/glm-5.1',
      medium: 'opencode-go/kimi-k2.7',
      light: 'opencode-go/deepseek-v4-flash',
    },
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'Uses your GitHub Copilot subscription',
    tiers: {
      heavy: 'github-copilot/gpt-5.2',
      medium: 'github-copilot/gpt-5.1-codex',
      light: 'github-copilot/gpt-5.1-codex-mini',
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Opus / Sonnet (requires Anthropic API key)',
    tiers: {
      heavy: 'anthropic/claude-opus-4-8',
      medium: 'anthropic/claude-sonnet-4-6',
      light: 'anthropic/claude-sonnet-4-5',
    },
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-5.x / Codex (requires OpenAI API key or ChatGPT subscription)',
    tiers: {
      heavy: 'openai/gpt-5.4',
      medium: 'openai/gpt-5.2',
      light: 'openai/gpt-5.4-mini',
    },
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini (requires Google API key or Vertex AI)',
    tiers: {
      heavy: 'google/gemini-3.1-pro',
      medium: 'google/gemini-3.5-flash',
      light: 'google/gemini-3.1-flash-lite',
    },
  },
]

export function getModelsForProvider(providerId: string): Record<string, string> {
  const provider = PROVIDERS.find(p => p.id === providerId)
  if (!provider) return {}
  const models: Record<string, string> = {}
  for (const [role, tier] of Object.entries(ROLE_TIER)) {
    models[role] = provider.tiers[tier]
  }
  return models
}

export function readConfig(): Record<string, unknown> {
  const configPath = path.join(TEAM_STORE_DIR, 'config.json')
  if (!fs.existsSync(configPath)) return {}
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch {
    return {}
  }
}

export function writeConfig(cfg: Record<string, unknown>): void {
  const configPath = path.join(TEAM_STORE_DIR, 'config.json')
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n')
}

export function getCurrentProvider(): ProviderPreset | null {
  const cfg = readConfig()
  const models = (cfg.models as Record<string, string>) ?? {}
  const providerId = (cfg.provider as string) ?? null
  if (providerId) return PROVIDERS.find(p => p.id === providerId) ?? null
  // Fallback: infer from model IDs
  for (const provider of PROVIDERS) {
    const preset = getModelsForProvider(provider.id)
    const heavyModel = preset.orchestrator
    if (heavyModel && models.orchestrator === heavyModel) return provider
  }
  return null
}

export async function selectProviderInteractive(): Promise<ProviderPreset> {
  console.log()
  console.log(chalk.bold('Which model provider do you use with opencode?'))
  console.log(chalk.dim('This sets the default models for all legioni team roles.'))
  console.log()

  PROVIDERS.forEach((p, i) => {
    console.log(`  ${chalk.cyan(`${i + 1}.`)} ${chalk.bold(p.name)} — ${chalk.dim(p.description)}`)
  })

  console.log()
  console.log(`  ${chalk.cyan('8.')} ${chalk.bold('Custom')} — ${chalk.dim('edit ~/.legioni/config.json manually')}`)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve))

  const answer = (await ask(chalk.blue('Select [1-8]: '))).trim()
  rl.close()

  const idx = parseInt(answer, 10)
  if (idx >= 1 && idx <= PROVIDERS.length) {
    return PROVIDERS[idx - 1]
  }

  console.log(chalk.yellow('Custom selected. Edit ~/.legioni/config.json after init completes.'))
  return PROVIDERS[0]
}

export function applyProvider(providerId: string): void {
  const models = getModelsForProvider(providerId)
  const cfg = readConfig()
  cfg.models = models
  cfg.provider = providerId
  writeConfig(cfg)
}

export function listConfig(): void {
  const cfg = readConfig()
  const providerId = (cfg.provider as string) ?? null
  const provider = providerId ? PROVIDERS.find(p => p.id === providerId) : null
  const models = (cfg.models as Record<string, string>) ?? {}

  console.log()
  if (provider) {
    console.log(chalk.bold(`Provider: ${provider.name} (${provider.id})`))
  } else if (Object.keys(models).length > 0) {
    console.log(chalk.bold('Provider: custom'))
  } else {
    console.log(chalk.bold('Provider: not configured'))
  }

  console.log()
  console.log(chalk.bold('Role models:'))
  for (const [role, tier] of Object.entries(ROLE_TIER)) {
    const model = models[role] ?? '(not set)'
    const tierLabel = tier === 'heavy' ? chalk.red('heavy') : chalk.green('light')
    console.log(`  ${chalk.cyan(role.padEnd(16))} ${model}  ${tierLabel}`)
  }

  console.log()
  console.log(chalk.dim('Run `legioni config set-provider` to change provider,'))
  console.log(chalk.dim('or `legioni config set-model <role> <model-id>` for per-role overrides.'))
}
