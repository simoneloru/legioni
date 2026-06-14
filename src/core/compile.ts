import { Role, Lesson, CompiledRole, LessonsStore } from '../types'

export function compileRole(role: Role, store: LessonsStore): CompiledRole {
  const lessons = store.getLessonsForRole(role.frontmatter.id)
  let prompt = role.body

  if (lessons.length > 0) {
    const body = lessons.map(l => `### ${l.id}\n\n${l.body}`).join('\n\n')
    prompt += `\n\n## Lessons\n\nThe following lessons were distilled from past work. Apply them when the situation matches.\n\n${body}`
  }

  return {
    id: role.frontmatter.id,
    frontmatter: role.frontmatter,
    prompt,
  }
}

export function compileAllRoles(roles: Role[], store: LessonsStore): CompiledRole[] {
  return roles.map(r => compileRole(r, store))
}
