import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readline from 'readline'
import { TEAM_STORE_DIR } from './team'
import { WORKSPACE_DIR } from './recon'

export interface StagedLesson {
  role: string
  slug: string
  body: string
}

export function readStagedLessons(cwd: string): StagedLesson[] {
  const wsDir = path.join(cwd, WORKSPACE_DIR)
  if (!fs.existsSync(wsDir)) return []

  const staged: StagedLesson[] = []
  const files = fs.readdirSync(wsDir).filter(f => f.startsWith('lessons.staging.') && f.endsWith('.md'))

  for (const file of files) {
    const role = file.replace('lessons.staging.', '').replace('.md', '')
    const content = fs.readFileSync(path.join(wsDir, file), 'utf-8').trim()
    if (!content) continue

    // Split on `## slug` headers
    const blocks = content.split(/\n(?=## )/).filter(b => b.trim())
    for (const block of blocks) {
      const match = block.match(/^## (.+)\n([\s\S]*)/)
      if (!match) continue
      staged.push({ role, slug: match[1].trim(), body: match[2].trim() })
    }
  }

  return staged
}

export async function promoteInteractive(cwd: string): Promise<void> {
  const staged = readStagedLessons(cwd)
  if (staged.length === 0) {
    console.log('No staged lessons found in .hexis/lessons.staging.*.md')
    return
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve))

  let promoted = 0
  let skipped = 0

  for (const lesson of staged) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Role: ${lesson.role}   Slug: ${lesson.slug}`)
    console.log('─'.repeat(60))
    console.log(lesson.body)
    console.log('─'.repeat(60))

    const answer = (await ask('Promote? [y/n/q] ')).trim().toLowerCase()
    if (answer === 'q') break
    if (answer !== 'y') {
      skipped++
      continue
    }

    writeLessonToStore(lesson)
    promoted++
    console.log(`  → Promoted to ~/.hexis/lessons/${lesson.role}/${lesson.slug}.md`)
  }

  rl.close()
  console.log(`\nDone. ${promoted} promoted, ${skipped} skipped.`)
  if (promoted > 0) {
    console.log('Run `hexis install` to recompile the team with the new lessons.')
  }
}

function writeLessonToStore(lesson: StagedLesson): void {
  const dir = path.join(TEAM_STORE_DIR, 'lessons', lesson.role)
  fs.mkdirSync(dir, { recursive: true })
  const slug = lesson.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const filePath = path.join(dir, `${slug}.md`)
  const today = new Date().toISOString().slice(0, 10)
  const content = matter.stringify(lesson.body, {
    id: slug,
    role: lesson.role,
    created: today,
    tags: [],
  })
  fs.writeFileSync(filePath, content, 'utf-8')
}
