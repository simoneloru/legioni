import { Command } from 'commander'
import { runInit } from './commands/init'
import { runInstall } from './commands/install'
import { runUpdate } from './commands/update'
import { runPromote } from './commands/promote'

const program = new Command()

program
  .name('hexis')
  .description('A portable, maturing team of AI coding agents')
  .version('0.1.0')

program
  .command('init')
  .description('Scaffold team (if missing), run project recon, install to opencode')
  .action(() => runInit(process.cwd()))

program
  .command('install')
  .description('Compile team (roles + lessons) and write to opencode global agents dir')
  .action(() => runInstall())

program
  .command('update')
  .description('Refresh project recon and reinstall team (team definition unchanged)')
  .action(() => runUpdate(process.cwd()))

program
  .command('promote')
  .description('Review staged lessons and promote approved ones to the team store')
  .action(async () => runPromote(process.cwd()))

program.parse(process.argv)
