import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const productionUrl = process.env.UAT_PRODUCTION_URL || 'https://thegroupchat.voyage'
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const reportDir = path.resolve('uat-results', `production-readiness-${stamp}`)
const reportJsonPath = path.join(reportDir, 'readiness-report.json')
const reportMarkdownPath = path.join(reportDir, 'readiness-report.md')

const requiredEnv = [
  'ADMIN_PIN',
  'TRIP_EDITOR_PIN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
]

const optionalResearchEnv = [
  'OPENAI_API_KEY',
  'TRIP_RESEARCH_ENABLED',
  'TRIP_RESEARCH_MODEL',
  'TRIP_RESEARCH_MAX_QUERIES',
]

function run(label, command, args) {
  const commandLine = [command, ...args].map((part) => {
    if (/^[A-Za-z0-9_./:=@-]+$/.test(part)) return part
    return `"${part.replace(/(["])/g, '\\$1')}"`
  }).join(' ')
  const result = spawnSync(commandLine, {
    cwd: process.cwd(),
    shell: true,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })

  return {
    label,
    command: commandLine,
    status: result.status ?? 1,
    ok: result.status === 0,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  }
}

function envNamesFromVercel(output) {
  const names = new Set()
  for (const line of output.split(/\r?\n/g)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s+Encrypted\s+/)
    if (match) names.add(match[1])
  }
  return names
}

function markdown(report) {
  const lines = [
    `# Production Readiness - ${report.status}`,
    '',
    `- Generated: ${report.generatedAt}`,
    `- Production URL: ${report.productionUrl}`,
    `- Git clean: ${report.git.clean ? 'yes' : 'no'}`,
    `- Required envs: ${report.env.missingRequired.length === 0 ? 'present' : `missing ${report.env.missingRequired.join(', ')}`}`,
    `- Optional AI research envs: ${report.env.missingOptionalResearch.length === 0 ? 'configured' : `not fully configured (${report.env.missingOptionalResearch.join(', ')})`}`,
    '',
    '## Checks',
    '',
    ...report.checks.map((check) => `- ${check.ok ? 'PASS' : 'FAIL'}: ${check.label}`),
  ]

  if (report.warnings.length > 0) {
    lines.push('', '## Warnings', '', ...report.warnings.map((warning) => `- ${warning}`))
  }

  if (report.failures.length > 0) {
    lines.push('', '## Failures', '', ...report.failures.map((failure) => `- ${failure}`))
  }

  lines.push('', '## Notes', '')
  lines.push('- This report never prints secret values; it only checks environment variable names.')
  lines.push('- Missing optional AI research envs do not block the deterministic planner, but live web-search planning will be weaker until they are configured.')

  return `${lines.join('\n')}\n`
}

const gitStatus = run('git status', 'git', ['status', '--porcelain'])
const privacyScan = run('privacy scan', 'npm', ['run', 'privacy:scan'])
const vercelEnv = run('Vercel env list', 'vercel', ['env', 'ls'])
const productionSmoke = run('production UAT smoke', 'npm', ['run', 'uat:production'])
const inspect = run('Vercel production inspect', 'vercel', ['inspect', productionUrl])

const envNames = vercelEnv.ok ? envNamesFromVercel(vercelEnv.stdout) : new Set()
const missingRequired = requiredEnv.filter((name) => !envNames.has(name))
const missingOptionalResearch = optionalResearchEnv.filter((name) => !envNames.has(name))
const warnings = []
const failures = []

if (!gitStatus.ok) failures.push('Could not read git status.')
if (gitStatus.ok && gitStatus.stdout.length > 0) warnings.push('Working tree has local changes.')
if (!privacyScan.ok) failures.push('Privacy scan failed.')
if (!vercelEnv.ok) failures.push('Could not list Vercel environment variables.')
if (missingRequired.length > 0) failures.push(`Missing required production env names: ${missingRequired.join(', ')}.`)
if (missingOptionalResearch.length > 0) warnings.push(`Live AI research is not fully configured: ${missingOptionalResearch.join(', ')}.`)
if (!productionSmoke.ok) failures.push('Production UAT smoke failed.')
if (!inspect.ok) failures.push(`Could not inspect ${productionUrl}.`)

const report = {
  ok: failures.length === 0,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  generatedAt: new Date().toISOString(),
  productionUrl,
  git: {
    clean: gitStatus.ok && gitStatus.stdout.length === 0,
    status: gitStatus.stdout,
  },
  env: {
    required: requiredEnv,
    optionalResearch: optionalResearchEnv,
    missingRequired,
    missingOptionalResearch,
  },
  checks: [gitStatus, privacyScan, vercelEnv, productionSmoke, inspect].map(({ label, command, status, ok }) => ({ label, command, status, ok })),
  warnings,
  failures,
}

fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`)
fs.writeFileSync(reportMarkdownPath, markdown(report))

console.log(JSON.stringify({
  ok: report.ok,
  status: report.status,
  productionUrl,
  warnings,
  failures,
  reportJson: reportJsonPath,
  reportMarkdown: reportMarkdownPath,
}, null, 2))

if (!report.ok) process.exit(1)
