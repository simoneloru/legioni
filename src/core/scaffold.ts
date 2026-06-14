import fs from 'fs'
import path from 'path'
import { TEAM_STORE_DIR } from './team'

const DEFAULTS_DIR = path.join(__dirname, '..', '..', 'defaults')

export function scaffoldDefaultTeam(): void {
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
}
