import path from 'path'
import chalk from 'chalk'
import { runRecon, WORKSPACE_DIR } from '../core/recon'
import { loadAllRoles, FileLessonsStore } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { writeAgents, upsertProjectInstructions } from '../adapters/opencode'

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

  const { configPath, added, tracked } = upsertProjectInstructions(cwd)
  if (added) {
    console.log(chalk.dim(`  → Added .legioni/project.md to instructions in ${configPath}`))
    if (tracked) {
      console.log(chalk.yellow(`  ⚠  opencode.json is git-tracked in this repo — this edit will appear in git status.`))
    } else {
      console.log(chalk.dim(`  → opencode.json added to .git/info/exclude`))
    }
  }

  console.log(chalk.green.bold('Done.'))
}
