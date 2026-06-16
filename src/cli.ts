import { Command } from 'commander'
import { runInit } from './commands/init'
import { runInstall } from './commands/install'
import { runUpdate } from './commands/update'
import { runPromote } from './commands/promote'
import { runUpgradeTeam } from './commands/upgrade-team'
import { runConfigSetModel, runConfigSetProvider, runConfigList } from './commands/config'

const program = new Command()

program
  .name('legioni')
  .description('A portable, maturing team of AI coding agents')
  .version('0.4.5')

program
  .command('init')
  .description('Scaffold team (if missing), run project recon, install to opencode')
  .action(() => runInit(process.cwd()))

program
  .command('install')
  .description('Compile team (roles + lessons) and write to opencode global agents dir')
  .action(() => runInstall(process.cwd()))

program
  .command('update')
  .description('Refresh project recon and reinstall team (team definition unchanged)')
  .action(() => runUpdate(process.cwd()))

program
  .command('promote')
  .description('Review staged lessons and promote approved ones to the team store')
  .action(async () => runPromote(process.cwd()))

program
  .command('upgrade-team')
  .description('Compare defaults with your team store and upgrade changed roles')
  .action(() => runUpgradeTeam())

const configCmd = program
  .command('config')
  .description('Manage legioni configuration')

configCmd
  .command('set-model')
  .description('Override the model for a single role')
  .argument('<role-id>', 'Role ID (e.g. implementer)')
  .argument('<model-id>', 'Model ID (e.g. openai/gpt-4o)')
  .action((roleId: string, modelId: string) => runConfigSetModel(roleId, modelId))

configCmd
  .command('set-provider')
  .description('Change model provider for all roles (interactive)')
  .action(() => runConfigSetProvider())

configCmd
  .command('list')
  .description('Show current provider and model assignments')
  .action(() => runConfigList())

program.parse(process.argv)
