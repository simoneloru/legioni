import fs from 'fs'
import path from 'path'
import { Role, CompiledRole, LessonsStore } from '../types'
import { TEAM_STORE_DIR } from './team'

const DEFAULTS_DIR = path.join(__dirname, '..', '..', 'defaults')

function loadModelOverrides(): Record<string, string> {
  const configPath = path.join(TEAM_STORE_DIR, 'config.json')
  if (!fs.existsSync(configPath)) return {}
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return (cfg.models as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}

export function compileRole(role: Role, store: LessonsStore, modelOverrides: Record<string, string> = {}): CompiledRole {
  const lessons = store.getLessonsForRole(role.frontmatter.id)
  let prompt = role.body

  // Inject shared legioni-context section after role body, before lessons
  const legioniContextPath = path.join(DEFAULTS_DIR, 'legioni-context.md')
  if (fs.existsSync(legioniContextPath)) {
    const legioniContext = fs.readFileSync(legioniContextPath, 'utf-8')
    prompt += `\n\n${legioniContext.trim()}`
  }

  // Inject orchestrator-specific paragraph only for the orchestrator role
  if (role.frontmatter.id === 'orchestrator') {
    const orchestratorContextPath = path.join(DEFAULTS_DIR, 'legioni-context-orchestrator.md')
    if (fs.existsSync(orchestratorContextPath)) {
      const orchestratorContext = fs.readFileSync(orchestratorContextPath, 'utf-8')
      prompt += `\n\n${orchestratorContext.trim()}`
    }
  }

  if (lessons.length > 0) {
    const body = lessons.map(l => `### ${l.id}\n\n${l.body}`).join('\n\n')
    prompt += `\n\n## Lessons\n\nThe following lessons were distilled from past work. Apply them when the situation matches.\n\n${body}`
  }

  const model = modelOverrides[role.frontmatter.id] ?? role.frontmatter.model

  return {
    id: role.frontmatter.id,
    frontmatter: { ...role.frontmatter, model },
    prompt,
  }
}

export function compileAllRoles(roles: Role[], store: LessonsStore): CompiledRole[] {
  const modelOverrides = loadModelOverrides()
  return roles.map(r => compileRole(r, store, modelOverrides))
}
