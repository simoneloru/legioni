import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Role, RoleFrontmatter, Lesson, LessonsStore } from '../types'

export const HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp'
export const TEAM_STORE_DIR = path.join(HOME_DIR, '.legioni')

export function teamStoreExists(): boolean {
  return fs.existsSync(path.join(TEAM_STORE_DIR, 'roles'))
}

export function loadRole(roleId: string): Role {
  const filePath = path.join(TEAM_STORE_DIR, 'roles', `${roleId}.md`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = matter(raw)
  return {
    frontmatter: parsed.data as RoleFrontmatter,
    body: parsed.content.trim(),
  }
}

export function loadAllRoles(): Role[] {
  const rolesDir = path.join(TEAM_STORE_DIR, 'roles')
  return fs
    .readdirSync(rolesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => loadRole(path.basename(f, '.md')))
}

export class FileLessonsStore implements LessonsStore {
  getLessonsForRole(roleId: string): Lesson[] {
    const dir = path.join(TEAM_STORE_DIR, 'lessons', roleId)
    if (!fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
        const parsed = matter(raw)
        return {
          id: (parsed.data.id as string) || path.basename(f, '.md'),
          role: roleId,
          created: (parsed.data.created as string) || '',
          tags: (parsed.data.tags as string[]) || [],
          body: parsed.content.trim(),
        } satisfies Lesson
      })
      .sort((a, b) => a.created.localeCompare(b.created))
  }
}
