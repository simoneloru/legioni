import chalk from 'chalk'
import { loadAllRoles, FileLessonsStore } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { writeAgents, upsertProjectInstructions } from '../adapters/opencode'

export function runInstall(cwd: string): void {
  process.stdout.write(chalk.blue('Compiling team → opencode agents ... '))
  const roles = loadAllRoles()
  const store = new FileLessonsStore()
  const compiled = compileAllRoles(roles, store)
  const written = writeAgents(compiled)
  console.log(chalk.green('done'))
  written.forEach(p => console.log(chalk.dim(`  → ${p}`)))

  const { configPath, added, tracked } = upsertProjectInstructions(cwd)
  if (added) {
    console.log(chalk.dim(`  → Added .legioni/project.md to instructions in ${configPath}`))
    if (tracked) {
      console.log(chalk.yellow(`  ⚠  opencode.json is git-tracked in this repo — this edit will appear in git status.`))
    }
  }

  console.log(chalk.green.bold('Done.'))
}
