import chalk from 'chalk'
import { applyProvider, selectProviderInteractive, listConfig, readConfig, writeConfig } from '../core/providers'
import { runInstall } from './install'

export function runConfigSetModel(roleId: string, modelId: string): void {
  const cfg = readConfig()
  const models = (cfg.models as Record<string, string>) ?? {}
  models[roleId] = modelId
  cfg.models = models
  writeConfig(cfg)
  console.log(chalk.green(`Set model for ${roleId} → ${modelId}`))
  console.log(chalk.dim('Run `legioni install` to apply.'))
}

export async function runConfigSetProvider(): Promise<void> {
  const provider = await selectProviderInteractive()
  applyProvider(provider.id)
  console.log(chalk.green(`Provider set to ${provider.name} (${provider.id})`))
  console.log(chalk.dim('All role models updated. Running legioni install ...'))
  console.log()
  runInstall(process.cwd())
}

export function runConfigList(): void {
  listConfig()
}
