import chalk from 'chalk'
import { loadAllRoles, FileLessonsStore } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { writeAgents, upsertGlobalInstructions } from '../adapters/opencode'

export function runInstall(): void {
  process.stdout.write(chalk.blue('Compiling team → opencode agents ... '))
  const roles = loadAllRoles()
  const store = new FileLessonsStore()
  const compiled = compileAllRoles(roles, store)
  const written = writeAgents(compiled)
  console.log(chalk.green('done'))
  written.forEach(p => console.log(chalk.dim(`  → ${p}`)))

  const { added, path: configPath } = upsertGlobalInstructions()
  if (added) {
    console.log(chalk.dim(`  → Added .hexis/project.md to instructions in ${configPath}`))
  }

  console.log(chalk.green.bold('Done.'))
}
