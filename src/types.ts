export interface RoleTools {
  allow: string[]
  deny: string[]
}

export interface RoleFrontmatter {
  id: string
  name: string
  model: string
  mode: 'primary' | 'subagent' | 'all'
  steps?: number
  tools: RoleTools
  temperature?: number
}

export interface Role {
  frontmatter: RoleFrontmatter
  body: string
}

export interface Lesson {
  id: string
  role: string
  created: string
  tags: string[]
  body: string
}

export interface CompiledRole {
  id: string
  frontmatter: RoleFrontmatter
  prompt: string
}

export interface LessonsStore {
  getLessonsForRole(roleId: string): Lesson[]
}
