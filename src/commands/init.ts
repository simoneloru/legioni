import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { loadAllRoles, FileLessonsStore, teamStoreExists } from '../core/team'
import { compileAllRoles } from '../core/compile'
import { runRecon, WORKSPACE_DIR } from '../core/recon'
import { scaffoldDefaultTeam } from '../core/scaffold'
import { writeAgents, upsertProjectInstructions } from '../adapters/opencode'
import { selectProviderInteractive } from '../core/providers'

export async function runInit(cwd: string): Promise<void> {
  // 1. Scaffold ~/.legioni/ from defaults if this is the first run
  if (!teamStoreExists()) {
    const provider = await selectProviderInteractive()
    process.stdout.write(chalk.blue('Scaffolding default team at ~/.legioni/ ... '))
    scaffoldDefaultTeam(provider.id)
    console.log(chalk.green('done'))
    console.log(chalk.dim(`  → Provider: ${provider.name} (${provider.id})`))
  } else {
    console.log(chalk.dim('Team store exists at ~/.legioni/'))
  }

  // 2. Recon — study the project, write .legioni/project.md
  process.stdout.write(chalk.blue('Running project recon ... '))
  runRecon(cwd)
  console.log(chalk.green('done'))
  console.log(chalk.dim(`  → ${path.join(cwd, WORKSPACE_DIR, 'project.md')}`))

  // 3. Exclude .legioni/ from git so `git status` stays clean
  const excluded = addWorkspaceGitExclude(cwd)
  if (excluded) {
    console.log(chalk.dim('  → .legioni/ added to .git/info/exclude'))
  }

  // 4. Compile roles (playbook + lessons) and write to opencode global agents dir
  process.stdout.write(chalk.blue('Compiling team → opencode agents ... '))
  const roles = loadAllRoles()
  const store = new FileLessonsStore()
  const compiled = compileAllRoles(roles, store)
  const written = writeAgents(compiled)
  console.log(chalk.green('done'))
  written.forEach(p => console.log(chalk.dim(`  → ${p}`)))

  // 5. Add .legioni/project.md to project-scoped opencode.json
  const { configPath, added, tracked } = upsertProjectInstructions(cwd)
  if (added) {
    console.log(chalk.dim(`  → Added .legioni/project.md to instructions in ${configPath}`))
    if (tracked) {
      console.log(chalk.yellow(`  ⚠  opencode.json is git-tracked in this repo — this edit will`))
      console.log(chalk.yellow(`     appear in git status. Stash or revert it when done.`))
    } else {
      console.log(chalk.dim(`  → opencode.json added to .git/info/exclude`))
    }
  } else {
    console.log(chalk.dim(`  → .legioni/project.md already in ${configPath}`))
  }

  console.log()
  console.log(chalk.green.bold('legioni init complete.'))
  console.log(chalk.dim('Run `legioni config list` to see your current model setup.'))
  console.log(chalk.dim('Run `legioni config set-provider` to change provider,'))
  console.log(chalk.dim('or `legioni config set-model <role> <model-id>` for per-role overrides.'))
}

function addWorkspaceGitExclude(cwd: string): boolean {
  const gitDir = path.join(cwd, '.git')
  if (!fs.existsSync(gitDir)) return false

  const excludeFile = path.join(gitDir, 'info', 'exclude')
  fs.mkdirSync(path.dirname(excludeFile), { recursive: true })

  const existing = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, 'utf-8') : ''
  const entry = '.legioni/'

  if (existing.split('\n').some(line => line.trim() === entry || line.trim() === '.legioni')) {
    return false
  }

  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''
  fs.appendFileSync(excludeFile, `${separator}# legioni workspace (per-project, ephemeral)\n${entry}\n`)
  return true
}
