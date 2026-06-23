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

export interface PromoteOptions {
  yes?: boolean
  no?: boolean
  slug?: string
  role?: string
}

export async function promoteNonInteractive(cwd: string, opts: PromoteOptions): Promise<void> {
  const wsDir = path.join(cwd, WORKSPACE_DIR)
  let staged = readStagedLessons(cwd)
  if (staged.length === 0) {
    console.log('No staged lessons found in .legioni/lessons.staging.*.md')
    return
  }

  if (opts.slug) {
    staged = staged.filter(l => l.slug === opts.slug)
  }
  if (opts.role) {
    staged = staged.filter(l => l.role === opts.role)
  }
  if (staged.length === 0) {
    console.log('No matching staged lessons found.')
    return
  }

  const action = opts.yes ? 'Promoting' : 'Rejecting'
  console.log(`${action} ${staged.length} lesson(s)...`)

  let promoted = 0
  let rejected = 0
  const reviewed = new Map<string, Set<string>>()

  for (const lesson of staged) {
    const filePath = path.join(wsDir, `lessons.staging.${lesson.role}.md`)
    if (!reviewed.has(filePath)) reviewed.set(filePath, new Set())
    reviewed.get(filePath)!.add(lesson.slug)

    if (opts.yes) {
      writeLessonToStore(lesson)
      promoted++
      console.log(`  ✓ ${lesson.role}/${lesson.slug}`)
    } else {
      rejected++
      console.log(`  ✗ ${lesson.role}/${lesson.slug}`)
    }
  }

  for (const [filePath, decidedSlugs] of reviewed) {
    removeSlugsFromStagingFile(filePath, decidedSlugs)
  }

  console.log(`\nDone. ${promoted} promoted, ${rejected} rejected.`)
  if (promoted > 0) {
    console.log('Run `legioni install` to recompile the team with the new lessons.')
  }
}

export async function promoteInteractive(cwd: string): Promise<void> {
  const wsDir = path.join(cwd, WORKSPACE_DIR)
  const staged = readStagedLessons(cwd)
  if (staged.length === 0) {
    console.log('No staged lessons found in .legioni/lessons.staging.*.md')
    return
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve))

  let promoted = 0
  let skipped = 0
  // Track reviewed slugs per staging file (y or n — both are decided)
  const reviewed = new Map<string, Set<string>>()

  for (const lesson of staged) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Role: ${lesson.role}   Slug: ${lesson.slug}`)
    console.log('─'.repeat(60))
    console.log(lesson.body)
    console.log('─'.repeat(60))

    const answer = (await ask('Promote? [y/n/q] ')).trim().toLowerCase()
    if (answer === 'q') break

    const filePath = path.join(wsDir, `lessons.staging.${lesson.role}.md`)
    if (!reviewed.has(filePath)) reviewed.set(filePath, new Set())
    reviewed.get(filePath)!.add(lesson.slug)

    if (answer === 'y') {
      writeLessonToStore(lesson)
      promoted++
      console.log(`  → Promoted to ~/.legioni/lessons/${lesson.role}/${lesson.slug}.md`)
    } else {
      skipped++
    }
  }

  rl.close()

  // Remove decided candidates (y or n) from their staging files.
  // Candidates not yet reached (after q) are left intact.
  for (const [filePath, decidedSlugs] of reviewed) {
    removeSlugsFromStagingFile(filePath, decidedSlugs)
  }

  console.log(`\nDone. ${promoted} promoted, ${skipped} skipped.`)
  if (promoted > 0) {
    console.log('Run `legioni install` to recompile the team with the new lessons.')
  }
}

function removeSlugsFromStagingFile(filePath: string, slugsToRemove: Set<string>): void {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8').trim()
  const blocks = content.split(/\n(?=## )/).filter(b => b.trim())
  const remaining = blocks.filter(block => {
    const match = block.match(/^## (.+)\n/)
    return !match || !slugsToRemove.has(match[1].trim())
  })
  if (remaining.length === 0) {
    fs.unlinkSync(filePath)
  } else {
    fs.writeFileSync(filePath, remaining.join('\n') + '\n', 'utf-8')
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
