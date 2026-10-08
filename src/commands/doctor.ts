/// <reference types="node" />
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import chalk from 'chalk'
import { TEAM_STORE_DIR, teamStoreExists } from '../core/team'

function checkBinary(bin: string, args: string[] = ['--version']): { ok: boolean; detail: string } {
  try {
    const out = execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim().split('\n')[0]
    return { ok: true, detail: out.slice(0, 120) }
  } catch {
    return { ok: false, detail: 'not found on PATH' }
  }
}

export function runDoctor(cwd: string): void {
  console.log(chalk.bold('legioni doctor'))
  console.log(chalk.dim(`cwd: ${cwd}`))
  console.log()

  const storeOk = teamStoreExists()
  console.log(`${storeOk ? chalk.green('✓') : chalk.red('✗')} team store at ${TEAM_STORE_DIR}${storeOk ? '' : ' (run `legioni init`)'}`)

  const rolesDir = path.join(TEAM_STORE_DIR, 'roles')
  if (storeOk) {
    const roles = fs.existsSync(rolesDir) ? fs.readdirSync(rolesDir).filter(f => f.endsWith('.md')) : []
    console.log(`${roles.length ? chalk.green('✓') : chalk.yellow('!')} roles: ${roles.length ? roles.join(', ') : 'none'}`)
  }

  const wsFile = path.join(cwd, '.legioni', 'docker-agent.yaml')
  console.log(
    `${fs.existsSync(wsFile) ? chalk.green('✓') : chalk.dim('·')} docker-agent team file: ${wsFile}${fs.existsSync(wsFile) ? '' : ' (run `legioni install --host docker-agent`)'}`,
  )

  console.log()
  const bins: Array<[string, string[]]> = [
    ['docker', ['--version']],
    ['opencode', ['--version']],
  ]
  for (const [bin, args] of bins) {
    const r = checkBinary(bin, args)
    console.log(`${r.ok ? chalk.green('✓') : chalk.dim('·')} ${bin}: ${r.detail}`)
  }

  const agent = checkBinary('docker', ['agent', '--help'])
  // `docker agent --help` exits 0 when the plugin is installed.
  console.log(`${agent.ok ? chalk.green('✓') : chalk.dim('·')} docker agent plugin: ${agent.ok ? 'installed' : 'not found (see docs/DOCKER_AGENT.md)'}`)

  console.log()
  console.log(chalk.dim('Next: `legioni install --host all` then `docker agent run .legioni/docker-agent.yaml --help`'))
}
