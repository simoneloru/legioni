const fs = require('fs')
const yamlPath = process.argv[2]
const content = fs.readFileSync(yamlPath, 'utf8')
const lines = content.split('\n')

const modes = {}
let current = null
let currentGroups = []
let inGroups = false

for (const line of lines) {
  const m = line.match(/^  - slug: (\S+)/)
  if (m) {
    if (current) modes[current] = inGroups ? currentGroups : []
    current = m[1]
    currentGroups = []
    inGroups = false
    continue
  }
  if (!current) continue
  if (/^    groups:/.test(line)) { inGroups = true; continue }
  if (inGroups) {
    const gm = line.match(/^      - (\S+)/)
    if (gm) { currentGroups.push(gm[1]); continue }
    if (/^    \w/.test(line)) { inGroups = false }
  }
}
if (current) modes[current] = inGroups ? currentGroups : []

const checks = [
  ['orchestrator', ['read', 'edit', 'modes'], ['command']],
  ['architect', ['read', 'edit', 'command'], ['modes']],
  ['implementer', ['read', 'edit', 'command'], []],
  ['reviewer', ['read', 'command'], ['edit', 'modes']],
  ['test-strategist', ['read', 'edit', 'command'], []],
  ['db-expert', ['read', 'edit', 'command'], []],
]

let failed = false
for (const [slug, expected, forbidden] of checks) {
  const actual = modes[slug] || []
  for (const g of expected) {
    if (actual.includes(g)) {
      console.log('PASS: ' + slug + ' has ' + g)
    } else {
      console.log('FAIL: ' + slug + ' missing ' + g)
      failed = true
    }
  }
  for (const g of forbidden) {
    if (!actual.includes(g)) {
      console.log('PASS: ' + slug + ' no ' + g)
    } else {
      console.log('FAIL: ' + slug + ' should not have ' + g)
      failed = true
    }
  }
}

if (failed) process.exit(1)
