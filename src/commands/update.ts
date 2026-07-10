import path from 'path'
import chalk from 'chalk'
import { runRecon, WORKSPACE_DIR } from '../core/recon'
import { loadAllRoles, FileLessonsStore } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { getHostAdapters } from '../adapters'
import { Host } from '../types'

export function runUpdate(cwd: string, host: Host | 'both' = 'both'): void {
  process.stdout.write(chalk.blue('Refreshing project recon ... '))
  runRecon(cwd)
  console.log(chalk.green('done'))
  console.log(chalk.dim(`  → ${path.join(cwd, WORKSPACE_DIR, 'project.md')}`))

  const roles = loadAllRoles()
  const store = new FileLessonsStore()
  const compiled = compileAllRoles(roles, store)

  const hostAdapters = getHostAdapters(host)
  for (const adapter of hostAdapters) {
    process.stdout.write(chalk.blue('Recompiling team ... '))
    adapter.writeAgents(compiled)
    console.log(chalk.green('done'))
  }

  for (const adapter of hostAdapters) {
    const { configPath, added, tracked } = adapter.upsertProjectInstructions(cwd)
    if (added) {
      console.log(chalk.dim(`  → Added project instructions to ${configPath}`))
      if (tracked) {
        console.log(chalk.yellow(`  ⚠  ${configPath} is git-tracked in this repo — this edit will appear in git status.`))
      }
    }
  }

  console.log(chalk.green.bold('Done.'))
}
