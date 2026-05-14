import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const args = new Set(process.argv.slice(2))
const keepArg = process.argv.find((arg) => arg.startsWith('--keep='))
const keepIndex = process.argv.indexOf('--keep')
const keep = Number(keepArg?.split('=')[1] ?? (keepIndex >= 0 ? process.argv[keepIndex + 1] : 10))
const dryRun = !args.has('--yes')
const root = path.resolve('uat-results')

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2))
  process.exit(1)
}

if (!Number.isInteger(keep) || keep < 1) fail('--keep must be a positive integer.')
if (!fs.existsSync(root)) {
  console.log(JSON.stringify({ ok: true, dryRun, root, keep, deleted: [], kept: [], note: 'uat-results does not exist.' }, null, 2))
  process.exit(0)
}

const resolvedRoot = fs.realpathSync(root)
const expectedRoot = path.resolve(process.cwd(), 'uat-results')
if (resolvedRoot !== expectedRoot) fail(`Refusing to clean unexpected path: ${resolvedRoot}`)

const entries = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const fullPath = path.join(root, entry.name)
    const stat = fs.statSync(fullPath)
    return { name: entry.name, fullPath, mtimeMs: stat.mtimeMs }
  })
  .sort((a, b) => b.mtimeMs - a.mtimeMs)

const kept = entries.slice(0, keep)
const deleted = entries.slice(keep)

if (!dryRun) {
  for (const entry of deleted) {
    const resolvedTarget = fs.realpathSync(entry.fullPath)
    if (!resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
      fail(`Refusing to delete outside uat-results: ${resolvedTarget}`)
    }
    fs.rmSync(resolvedTarget, { recursive: true, force: true })
  }
}

console.log(JSON.stringify({
  ok: true,
  dryRun,
  root,
  keep,
  kept: kept.map((entry) => entry.name),
  deleted: deleted.map((entry) => entry.name),
  note: dryRun ? 'Dry run only. Add --yes to delete old ignored UAT report folders.' : 'Old ignored UAT report folders deleted.',
}, null, 2))
