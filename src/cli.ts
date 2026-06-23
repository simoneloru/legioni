import { Command } from 'commander'
import { runInit } from './commands/init'
import { runInstall } from './commands/install'
import { runUpdate } from './commands/update'
import { runPromote } from './commands/promote'
import { runUpgradeTeam } from './commands/upgrade-team'
import { runConfigSetModel, runConfigSetProvider, runConfigList } from './commands/config'

function safeCwd(): string {
  try {
    return process.cwd()
  } catch {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp'
    process.chdir(home)
    return home
  }
}

const program = new Command()

program
  .name('legioni')
  .description('A portable, maturing team of AI coding agents')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  .version(require('../package.json').version)

program
  .command('init')
  .description('Scaffold team (if missing), run project recon, install to opencode')
  .action(() => runInit(safeCwd()))

program
  .command('install')
  .description('Compile team (roles + lessons) and write to opencode global agents dir')
  .action(() => runInstall(safeCwd()))

program
  .command('update')
  .description('Refresh project recon and reinstall team (team definition unchanged)')
  .action(() => runUpdate(safeCwd()))

program
  .command('promote')
  .description('Review staged lessons and promote approved ones to the team store')
  .option('--yes', 'Approve all staged lessons without prompting')
  .option('--reject', 'Reject all staged lessons without prompting')
  .option('--slug <slug>', 'Filter lessons by slug')
  .option('--role <role>', 'Filter lessons by role')
  .action(async (opts: { yes?: boolean; reject?: boolean; slug?: string; role?: string }) => runPromote(safeCwd(), { yes: opts.yes, no: opts.reject, slug: opts.slug, role: opts.role }))

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
