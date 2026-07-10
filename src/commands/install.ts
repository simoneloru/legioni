import chalk from 'chalk'
import { loadAllRoles, FileLessonsStore } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { getHostAdapters } from '../adapters'
import { Host } from '../types'

export function runInstall(cwd: string, host: Host | 'both' = 'both'): void {
  const roles = loadAllRoles()
  const store = new FileLessonsStore()
  const compiled = compileAllRoles(roles, store)

  const hostAdapters = getHostAdapters(host)
  for (const adapter of hostAdapters) {
    process.stdout.write(chalk.blue(`Compiling team → agents ... `))
    const written = adapter.writeAgents(compiled)
    console.log(chalk.green('done'))
    written.forEach(p => console.log(chalk.dim(`  → ${p}`)))
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
