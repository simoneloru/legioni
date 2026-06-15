import fs from 'fs'
import path from 'path'
import { Role, CompiledRole, LessonsStore } from '../types'
import { TEAM_STORE_DIR } from './team'

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
