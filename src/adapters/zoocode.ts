/// <reference types="node" />
import fs from 'fs'
import path from 'path'
import { CompiledRole, RoleTools } from '../types'
import { HOME_DIR } from '../core/team'

const LEGIONI_SLUGS = ['orchestrator', 'architect', 'implementer', 'reviewer', 'test-strategist', 'db-expert']

function getZoocodeSettingsDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(HOME_DIR, 'AppData', 'Roaming')
    return path.join(appData, 'Code', 'User', 'settings')
  }
  if (process.platform === 'darwin') {
    return path.join(HOME_DIR, 'Library', 'Application Support', 'Code', 'User', 'settings')
  }
  // Linux
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(HOME_DIR, '.config')
  return path.join(xdgConfig, 'Code', 'User', 'settings')
}

const ZOOCODE_SETTINGS_DIR = getZoocodeSettingsDir()
const CUSTOM_MODES_YAML = path.join(ZOOCODE_SETTINGS_DIR, 'custom_modes.yaml')
const CUSTOM_MODES_JSON = path.join(ZOOCODE_SETTINGS_DIR, 'custom_modes.json')

interface ZooCodeMode {
  slug: string
  name: string
  roleDefinition: string
  groups: (string | [string, { fileRegex: string; description?: string }])[]
  customInstructions?: string
}

function mapToolsToGroups(tools: RoleTools): string[] {
  const groups = new Set<string>()
  const toolToGroup: Record<string, string> = {
    read: 'read',
    grep: 'read',
    glob: 'read',
    list: 'read',
    write: 'edit',
    edit: 'edit',
    bash: 'command',
    task: 'modes',
  }
  for (const tool of tools.allow) {
    const group = toolToGroup[tool]
    if (group) groups.add(group)
  }
  return Array.from(groups)
}

function buildZoocodeMode(role: CompiledRole): ZooCodeMode {
  return {
    slug: role.id,
    name: role.frontmatter.name,
    roleDefinition: role.prompt,
    groups: mapToolsToGroups(role.frontmatter.tools),
  }
}

function readExistingModes(): Record<string, ZooCodeMode> {
  const existing: Record<string, ZooCodeMode> = {}

  const yamlPath = CUSTOM_MODES_YAML
  if (fs.existsSync(yamlPath)) {
    try {
      const content = fs.readFileSync(yamlPath, 'utf-8')
      const parsed = parseSimpleYaml(content)
      for (const mode of parsed) {
        existing[mode.slug] = mode
      }
    } catch {
      // ignore parse errors, will overwrite
    }
    return existing
  }

  const jsonPath = CUSTOM_MODES_JSON
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8')
      const cfg = JSON.parse(content)
      const customModes: ZooCodeMode[] = cfg.customModes ?? []
      for (const mode of customModes) {
        existing[mode.slug] = mode
      }
    } catch {
      // ignore parse errors, will overwrite
    }
    return existing
  }

  return existing
}

function parseSimpleYaml(content: string): ZooCodeMode[] {
  const modes: ZooCodeMode[] = []
  let current: Partial<ZooCodeMode> | null = null
  let inBlock = false
  let blockKey = ''
  let blockLines: string[] = []

  const lines = content.split('\n')
  for (const line of lines) {
    const slugMatch = line.match(/^(\s*)-\s+slug:\s*(.+)$/)
    if (slugMatch) {
      if (current && current.slug) {
        if (inBlock && blockLines.length > 0) {
          assignBlock(current, blockKey, blockLines)
        }
        if (current.slug && current.roleDefinition && current.groups && current.groups.length > 0) {
          modes.push(current as ZooCodeMode)
        }
      }
      current = { slug: slugMatch[2].trim(), name: '', roleDefinition: '', groups: [] }
      inBlock = false
      blockKey = ''
      blockLines = []
      continue
    }

    if (!current) continue

    // Block scalar continuation (lines indented deeper than mode props, but not a new key)
    if (inBlock) {
      if (/^\s*-\s+slug:/.test(line)) {
        // New mode starting — finalize block and reprocess this line
        assignBlock(current, blockKey, blockLines)
        if (current.slug && current.roleDefinition && current.groups && current.groups.length > 0) {
          modes.push(current as ZooCodeMode)
        }
        current = null
        inBlock = false
        blockKey = ''
        blockLines = []
        // Reprocess slug line
        const m = line.match(/^(\s*)-\s+slug:\s*(.+)$/)
        if (m) {
          current = { slug: m[2].trim(), name: '', roleDefinition: '', groups: [] }
        }
        continue
      }
      if (!/^ {6,}/.test(line) && /^ {0,5}\S/.test(line)) {
        assignBlock(current, blockKey, blockLines)
        inBlock = false
        blockKey = ''
        blockLines = []
      } else {
        blockLines.push(line.slice(6))
        continue
      }
    }

    // name
    const nameMatch = line.match(/^\s{2,}name:\s*(.+)$/)
    if (nameMatch) { current.name = nameMatch[1].trim(); continue }

    // customInstructions block
    const ciBlock = line.match(/^\s{2,}customInstructions:\s*\|\s*$/)
    if (ciBlock) { inBlock = true; blockKey = 'customInstructions'; blockLines = []; continue }
    const ciInline = line.match(/^\s{2,}customInstructions:\s*(.+)$/)
    if (ciInline) { current.customInstructions = ciInline[1].trim(); continue }

    // roleDefinition block
    const rdBlock = line.match(/^\s{2,}roleDefinition:\s*\|\s*$/)
    if (rdBlock) { inBlock = true; blockKey = 'roleDefinition'; blockLines = []; continue }
    const rdInline = line.match(/^\s{2,}roleDefinition:\s*(.+)$/)
    if (rdInline) { current.roleDefinition = rdInline[1].trim(); continue }

    // groups (skip, parsed separately)
    if (/^\s{2,}groups:\s*$/.test(line)) continue

    // group item: "      - read"
    const groupItem = line.match(/^\s{4,}-\s+(\S+)$/)
    if (groupItem) {
      const g = groupItem[1]
      if (!current.groups) current.groups = []
      if (!current.groups.includes(g)) (current.groups as string[]).push(g)
    }
  }

  if (current && current.slug) {
    if (inBlock && blockLines.length > 0) {
      assignBlock(current, blockKey, blockLines)
    }
    if (current.slug && current.roleDefinition && current.groups && current.groups.length > 0) {
      modes.push(current as ZooCodeMode)
    }
  }

  return modes
}

function assignBlock(mode: Partial<ZooCodeMode>, key: string, lines: string[]): void {
  const value = lines.join('\n').trim()
  if (!value) return
  switch (key) {
    case 'roleDefinition': mode.roleDefinition = value; break
    case 'customInstructions': mode.customInstructions = value; break
  }
}

function writeCustomModesYaml(legioniModes: ZooCodeMode[]): void {
  const existing = readExistingModes()

  // Merge: replace legioni modes, keep others
  for (const mode of legioniModes) {
    existing[mode.slug] = mode
  }

  fs.mkdirSync(ZOOCODE_SETTINGS_DIR, { recursive: true })

  const lines: string[] = ['customModes:']
  for (const mode of Object.values(existing)) {
    lines.push(`  - slug: ${mode.slug}`)
    lines.push(`    name: ${mode.name}`)
    writeYamlBlock(lines, '    roleDefinition', mode.roleDefinition)
    if (mode.customInstructions) {
      writeYamlBlock(lines, '    customInstructions', mode.customInstructions)
    }
    lines.push('    groups:')
    for (const group of mode.groups) {
      if (typeof group === 'string') {
        lines.push(`      - ${group}`)
      } else {
        lines.push(`      - - ${group[0]}`)
        lines.push(`        - fileRegex: ${group[1].fileRegex}`)
        if (group[1].description) {
          lines.push(`          description: ${group[1].description}`)
        }
      }
    }
  }

  fs.writeFileSync(CUSTOM_MODES_YAML, lines.join('\n') + '\n', 'utf-8')

  // Clean up legacy JSON if it exists
  if (fs.existsSync(CUSTOM_MODES_JSON)) {
    try {
      fs.renameSync(CUSTOM_MODES_JSON, CUSTOM_MODES_JSON + '.legioni-bak')
    } catch {
      // best effort
    }
  }
}

function writeYamlBlock(lines: string[], key: string, value: string): void {
  if (value.includes('\n')) {
    lines.push(`${key}: |`)
    for (const l of value.split('\n')) {
      lines.push(`      ${l}`)
    }
  } else {
    lines.push(`${key}: ${value}`)
  }
}

export function writeAgents(roles: CompiledRole[]): string[] {
  const legioniModes = roles.map(buildZoocodeMode)
  writeCustomModesYaml(legioniModes)
  return [CUSTOM_MODES_YAML]
}

export function upsertProjectInstructions(cwd: string): {
  configPath: string
  added: boolean
  tracked: boolean
} {
  const rulesDir = path.join(cwd, '.roo', 'rules')
  const configPath = path.join(rulesDir, 'legioni.md')

  fs.mkdirSync(rulesDir, { recursive: true })

  if (fs.existsSync(configPath)) {
    return { configPath, added: false, tracked: false }
  }

  const content = [
    '# legioni project profile',
    '',
    'This project uses [legioni](https://github.com/simoneloru/legioni) for AI agent management.',
    'The project profile is at `.legioni/project.md`.',
  ].join('\n')

  fs.writeFileSync(configPath, content + '\n', 'utf-8')

  return { configPath, added: true, tracked: false }
}
