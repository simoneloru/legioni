import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { CompiledRole } from '../types'

import { HOME_DIR } from '../core/team'

function getOpencodeGlobalDir(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(HOME_DIR, 'AppData', 'Local')
    return path.join(localAppData, 'opencode')
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(HOME_DIR, '.config')
  return path.join(xdgConfig, 'opencode')
}

const OPENCODE_GLOBAL_DIR = getOpencodeGlobalDir()
const AGENTS_DIR = path.join(OPENCODE_GLOBAL_DIR, 'agent')

export function writeAgents(roles: CompiledRole[]): string[] {
  fs.mkdirSync(AGENTS_DIR, { recursive: true })
  const written: string[] = []
  for (const role of roles) {
    const filePath = path.join(AGENTS_DIR, `${role.id}.md`)
    fs.writeFileSync(filePath, buildAgentFile(role), 'utf-8')
    written.push(filePath)
  }
  return written
}

export function upsertProjectInstructions(cwd: string): {
  configPath: string
  added: boolean
  tracked: boolean
} {
  const configPath = path.join(cwd, 'opencode.json')
  const entry = '.legioni/project.md'

  const tracked = isGitTracked(cwd, 'opencode.json')

  let config: Record<string, unknown> = {}
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch {
      // malformed — preserve the file; we'll only add our key
    }
  }

  const instructions = (config.instructions as string[] | undefined) ?? []
  if (instructions.includes(entry)) {
    return { configPath, added: false, tracked }
  }

  config.instructions = [...instructions, entry]
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')

  // Only exclude from git if the file was not already tracked —
  // exclude has no effect on tracked files, and we don't want to mask
  // a tracked file that now has our modifications.
  if (!tracked) {
    addToGitExclude(cwd, 'opencode.json')
  }

  return { configPath, added: true, tracked }
}

function isGitTracked(cwd: string, file: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch ${file}`, { cwd, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function addToGitExclude(cwd: string, entry: string): void {
  const excludeFile = path.join(cwd, '.git', 'info', 'exclude')
  if (!fs.existsSync(path.dirname(excludeFile))) return
  const existing = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, 'utf-8') : ''
  if (existing.split('\n').some(l => l.trim() === entry)) return
  const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''
  fs.appendFileSync(excludeFile, `${sep}${entry}\n`)
}

function buildAgentFile(role: CompiledRole): string {
  const fm = role.frontmatter
  const lines: string[] = [
    `description: ${fm.name} — legioni team agent`,
    `mode: ${fm.mode}`,
    `model: ${fm.model}`,
  ]

  if (fm.temperature !== undefined) lines.push(`temperature: ${fm.temperature}`)
  if (fm.steps !== undefined) lines.push(`steps: ${fm.steps}`)

  const permEntries = [
    ...fm.tools.allow.map(t => `  ${t}: allow`),
    ...fm.tools.deny.map(t => `  ${t}: deny`),
  ]
  if (permEntries.length) {
    lines.push(`permission:\n${permEntries.join('\n')}`)
  }

  return `---\n${lines.join('\n')}\n---\n\n${role.prompt}\n`
}
