import fs from 'fs'
import path from 'path'
import { TEAM_STORE_DIR } from './team'
import { applyProvider, getModelsForProvider } from './providers'

const DEFAULTS_DIR = path.join(__dirname, '..', '..', 'defaults')

function scaffoldConfig(providerId: string): void {
  const configPath = path.join(TEAM_STORE_DIR, 'config.json')
  if (fs.existsSync(configPath)) return

  const models = getModelsForProvider(providerId)
  fs.writeFileSync(configPath, JSON.stringify({ provider: providerId, models }, null, 2) + '\n')
}

export function scaffoldDefaultTeam(providerId: string = 'anthropic'): void {
  const rolesDir = path.join(DEFAULTS_DIR, 'roles')
  const destRoles = path.join(TEAM_STORE_DIR, 'roles')
  fs.mkdirSync(destRoles, { recursive: true })
  for (const f of fs.readdirSync(rolesDir)) {
    fs.copyFileSync(path.join(rolesDir, f), path.join(destRoles, f))
  }

  const lessonsDir = path.join(DEFAULTS_DIR, 'lessons')
  for (const role of fs.readdirSync(lessonsDir)) {
    fs.mkdirSync(path.join(TEAM_STORE_DIR, 'lessons', role), { recursive: true })
  }

  scaffoldConfig(providerId)
}
