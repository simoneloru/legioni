import path from 'path'
import chalk from 'chalk'
import { runRecon, WORKSPACE_DIR } from '../core/recon'
import { loadAllRoles, FileLessonsStore } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { writeAgents } from '../adapters/opencode'

export function runUpdate(cwd: string): void {
  process.stdout.write(chalk.blue('Refreshing project recon ... '))
  runRecon(cwd)
  console.log(chalk.green('done'))
  console.log(chalk.dim(`  → ${path.join(cwd, WORKSPACE_DIR, 'project.md')}`))

  process.stdout.write(chalk.blue('Recompiling team ... '))
  const roles = loadAllRoles()
  const store = new FileLessonsStore()
  const compiled = compileAllRoles(roles, store)
  writeAgents(compiled)
  console.log(chalk.green('done'))

  console.log(chalk.green.bold('Done.'))
}
