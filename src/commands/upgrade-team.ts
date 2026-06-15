import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { TEAM_STORE_DIR } from '../core/team'

const DEFAULTS_DIR = path.join(__dirname, '..', '..', 'defaults')

export async function runUpgradeTeam(): Promise<void> {
  const defaultsRoles = path.join(DEFAULTS_DIR, 'roles')
  const storeRoles = path.join(TEAM_STORE_DIR, 'roles')

  if (!fs.existsSync(storeRoles)) {
    console.log(chalk.red('No team store found. Run `legioni init` first.'))
    return
  }

  const defaultFiles = fs.readdirSync(defaultsRoles).filter(f => f.endsWith('.md'))
  const changes: { role: string; status: 'new' | 'changed' | 'unchanged' }[] = []

  for (const file of defaultFiles) {
    const roleId = path.basename(file, '.md')
    const defaultContent = fs.readFileSync(path.join(defaultsRoles, file), 'utf-8')
    const storePath = path.join(storeRoles, file)

    if (!fs.existsSync(storePath)) {
      changes.push({ role: roleId, status: 'new' })
    } else {
      const storeContent = fs.readFileSync(storePath, 'utf-8')
      changes.push({
        role: roleId,
        status: defaultContent.trim() === storeContent.trim() ? 'unchanged' : 'changed',
      })
    }
  }

  const actionable = changes.filter(c => c.status !== 'unchanged')

  if (actionable.length === 0) {
    console.log(chalk.green('All roles are up to date. No changes needed.'))
    return
  }

  console.log(chalk.blue('Available role updates:'))
  console.log()
  for (const c of changes) {
    if (c.status === 'unchanged') {
      console.log(chalk.dim(`  ${c.role}: unchanged`))
    } else if (c.status === 'changed') {
      console.log(chalk.yellow(`  ${c.role}: changed`))
    } else {
      console.log(chalk.cyan(`  ${c.role}: new`))
    }
  }
  console.log()

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve))

  const allYes = await ask(chalk.blue('Upgrade all? [Y/n/q] '))
  rl.close()

  const toApply =
    allYes.trim().toLowerCase() === 'q'
      ? []
      : allYes.trim().toLowerCase() === 'n'
        ? []
        : actionable

  if (toApply.length === 0) {
    console.log(chalk.dim('No roles selected. Exiting.'))
    return
  }

  for (const change of toApply) {
    const src = path.join(defaultsRoles, `${change.role}.md`)
    const dest = path.join(storeRoles, `${change.role}.md`)
    fs.copyFileSync(src, dest)
    console.log(chalk.green(`  Upgraded ${change.role}`))
  }

  console.log()
  console.log(chalk.green(`${toApply.length} role(s) upgraded.`))
  console.log(chalk.dim('Run `legioni install` to compile and apply.'))
}