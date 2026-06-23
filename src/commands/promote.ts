import chalk from 'chalk'
import { promoteInteractive, promoteNonInteractive, PromoteOptions } from '../core/lessons'

export async function runPromote(cwd: string, opts: PromoteOptions = {}): Promise<void> {
  if (opts.yes || opts.no) {
    await promoteNonInteractive(cwd, opts)
    return
  }
  console.log(chalk.blue('Reading staged lessons from .legioni/lessons.staging.*.md ...'))
  console.log()
  await promoteInteractive(cwd)
}
