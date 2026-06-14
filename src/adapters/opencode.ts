import fs from 'fs'
import path from 'path'
import { CompiledRole } from '../types'

const OPENCODE_GLOBAL_DIR = path.join(process.env.HOME ?? '/tmp', '.config', 'opencode')
const AGENTS_DIR = path.join(OPENCODE_GLOBAL_DIR, 'agents')

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

export function upsertGlobalInstructions(): { path: string; added: boolean } {
  const configPath = path.join(OPENCODE_GLOBAL_DIR, 'opencode.json')
  const entry = '.hexis/project.md'

  let config: Record<string, unknown> = {}
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch {
      // unparseable — overwrite cautiously with our entry only
    }
  }

  const instructions = (config.instructions as string[] | undefined) ?? []
  if (instructions.includes(entry)) {
    return { path: configPath, added: false }
  }

  config.instructions = [...instructions, entry]
  fs.mkdirSync(OPENCODE_GLOBAL_DIR, { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  return { path: configPath, added: true }
}

function buildAgentFile(role: CompiledRole): string {
  const fm = role.frontmatter
  const lines: string[] = [
    `description: ${fm.name} — hexis team agent`,
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
