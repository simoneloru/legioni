import chalk from 'chalk'
import { promoteInteractive } from '../core/lessons'

export async function runPromote(cwd: string): Promise<void> {
  console.log(chalk.blue('Reading staged lessons from .legioni/lessons.staging.*.md ...'))
  console.log()
  await promoteInteractive(cwd)
}
