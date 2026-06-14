import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { loadAllRoles, FileLessonsStore, teamStoreExists } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { runRecon, WORKSPACE_DIR } from '../core/recon'
import { scaffoldDefaultTeam } from '../core/scaffold'
import { writeAgents, upsertGlobalInstructions } from '../adapters/opencode'

export function runInit(cwd: string): void {
  // 1. Scaffold ~/.hexis/ from defaults if this is the first run
  if (!teamStoreExists()) {
    process.stdout.write(chalk.blue('Scaffolding default team at ~/.hexis/ ... '))
    scaffoldDefaultTeam()
    console.log(chalk.green('done'))
  } else {
    console.log(chalk.dim('Team store exists at ~/.hexis/'))
  }

  // 2. Recon — study the project, write .hexis/project.md
  process.stdout.write(chalk.blue('Running project recon ... '))
  runRecon(cwd)
  console.log(chalk.green('done'))
  console.log(chalk.dim(`  → ${path.join(cwd, WORKSPACE_DIR, 'project.md')}`))

  // 3. Exclude .hexis/ from git so `git status` stays clean
  const excluded = addGitExclude(cwd)
  if (excluded) {
    console.log(chalk.dim('  → .hexis/ added to .git/info/exclude'))
  }

  // 4. Compile roles (playbook + lessons) and write to opencode global agents dir
  process.stdout.write(chalk.blue('Compiling team → opencode agents ... '))
  const roles = loadAllRoles()
  const store = new FileLessonsStore()
  const compiled = compileAllRoles(roles, store)
  const written = writeAgents(compiled)
  console.log(chalk.green('done'))
  written.forEach(p => console.log(chalk.dim(`  → ${p}`)))

  // 5. Add .hexis/project.md to global opencode.json instructions (relative path)
  const { path: configPath, added } = upsertGlobalInstructions()
  if (added) {
    console.log(chalk.dim(`  → Added .hexis/project.md to instructions in ${configPath}`))
  } else {
    console.log(chalk.dim(`  → .hexis/project.md already in instructions (${configPath})`))
  }

  console.log()
  console.log(chalk.green.bold('hexis init complete.'))
  console.log()
  console.log(chalk.yellow('⚠  Path resolution note:'))
  console.log(chalk.yellow('   opencode\'s handling of relative paths in global instructions is'))
  console.log(chalk.yellow('   not formally documented. On first use, verify the project profile'))
  console.log(chalk.yellow('   loaded by running /rules inside opencode and checking for'))
  console.log(chalk.yellow('   .hexis/project.md content. If missing, file an issue — we\'ll add'))
  console.log(chalk.yellow('   a --fallback flag that writes .opencode/opencode.json instead.'))
}

function addGitExclude(cwd: string): boolean {
  const gitDir = path.join(cwd, '.git')
  if (!fs.existsSync(gitDir)) return false

  const excludeFile = path.join(gitDir, 'info', 'exclude')
  fs.mkdirSync(path.dirname(excludeFile), { recursive: true })

  const existing = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, 'utf-8') : ''
  const entry = '.hexis/'

  if (existing.split('\n').some(line => line.trim() === entry || line.trim() === '.hexis')) {
    return false
  }

  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''
  fs.appendFileSync(excludeFile, `${separator}# hexis workspace (per-project, ephemeral)\n${entry}\n`)
  return true
}
