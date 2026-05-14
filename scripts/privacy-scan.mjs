import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const scanRoots = [
  path.join(repoRoot, 'src', 'data', 'trips'),
  path.join(repoRoot, 'src', 'pages', 'MothersDay2026.tsx'),
]

const exactAddressPattern = /\b\d{2,6}\s+[A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z0-9][A-Za-z0-9'’.-]*){0,6}\s+(?:St|Street|Ave|Avenue|Dr|Drive|Rd|Road|Blvd|Boulevard|Circle|Cir|Lane|Ln|Court|Ct|Passage)\b/
const phonePattern = /(?:\+?1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4}\b/
const confirmationPattern = /\b(?:RES-\d{3,}|HMM[A-Z0-9]{5,}|C\d{8,}|(?:Costco|Enterprise|Airbnb|rental|reservation|booking|confirmation|record locator)[^'"\n]{0,80}\b(?=[A-Z0-9-]*\d)[A-Z0-9-]{5,})\b/i
const accessPattern = /\b(?:password|passcode|door code|gate code|alarm code|access code|entry code|entry codes|key instructions|key\s*:|key\s+is|outlet box|behind (?:the )?vase|wifi password)\b/i

const publicAddressAllowlist = [
  /901\s+N\s+Broadway\s+Ave/i,
  /2801\s+NE\s+50th\s+St/i,
  /1700\s+NE\s+63rd\s+St/i,
  /620\s+N\s+Harvey\s+Ave/i,
  /300\s+SW\s+7th\s+St/i,
  /128\s+3rd\s+Street\s+South/i,
  /5405\s+Airport\s+Service\s+Rd/i,
  /249\s+Windward\s+Passage/i,
  /600\s+2nd\s+Ave\s+NE/i,
  /1\s+Dali\s+Blvd/i,
  /7\s+Rockaway\s+St/i,
]

const safeLinePatterns = [
  /\b911\b/,
  /shared privately/i,
  /stored privately/i,
  /outside the public planner/i,
  /keep private/i,
  /private entry instructions/i,
  /private wedding-site access details/i,
  /confirmation stored privately/i,
  /confirmation numbers outside/i,
  /address and confirmation stored privately/i,
  /do not paste/i,
  /avoid pasting/i,
  /safety note/i,
  /wifiPassword:\s*'TBD'/,
]

function walk(target) {
  const stat = fs.statSync(target)
  if (stat.isFile()) return /\.(ts|tsx|js|jsx)$/.test(target) ? [target] : []
  const files = []
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const fullPath = path.join(target, entry.name)
    if (entry.isDirectory()) files.push(...walk(fullPath))
    else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(fullPath)
  }
  return files
}

function isSafeLine(line) {
  return safeLinePatterns.some((pattern) => pattern.test(line))
}

function isPublicAddress(line) {
  return publicAddressAllowlist.some((pattern) => pattern.test(line))
}

export function scanText(text, file = '<inline>') {
  const findings = []
  const lines = text.split(/\r?\n/g)

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || isSafeLine(trimmed)) return

    if (phonePattern.test(trimmed)) {
      findings.push({
        file,
        line: index + 1,
        rule: 'phone',
        message: 'Private or direct phone number in public seed data.',
      })
    }

    if (confirmationPattern.test(trimmed)) {
      findings.push({
        file,
        line: index + 1,
        rule: 'confirmation',
        message: 'Reservation or confirmation code in public seed data.',
      })
    }

    if (accessPattern.test(trimmed)) {
      findings.push({
        file,
        line: index + 1,
        rule: 'access',
        message: 'Password, access, or key instruction in public seed data.',
      })
    }

    if (exactAddressPattern.test(trimmed) && !isPublicAddress(trimmed)) {
      findings.push({
        file,
        line: index + 1,
        rule: 'private-address',
        message: 'Exact street address may be private; use group-chat/private wording unless it is a public venue.',
      })
    }
  })

  return findings
}

function runSelfTests() {
  const fixtures = [
    {
      name: 'private phone',
      text: "phone: '+1 555 123 4567'",
      rule: 'phone',
    },
    {
      name: 'confirmation code',
      text: "notes: 'Reservation RES-21753'",
      rule: 'confirmation',
    },
    {
      name: 'access instruction',
      text: "notes: 'Key in outlet box behind vase'",
      rule: 'access',
    },
    {
      name: 'private address',
      text: "address: '1127 Northwest 56th Street, Oklahoma City, OK 73118'",
      rule: 'private-address',
    },
  ]

  const failures = []
  for (const fixture of fixtures) {
    const findings = scanText(fixture.text)
    if (!findings.some((finding) => finding.rule === fixture.rule)) {
      failures.push(`Self-test "${fixture.name}" did not trigger ${fixture.rule}.`)
    }
  }

  const safeFindings = scanText("address: '128 3rd Street South, St. Petersburg, FL 33701'\nvalue: '911'\nnotes: 'Address shared privately with the group'")
  if (safeFindings.length > 0) {
    failures.push(`Self-test safe values triggered findings: ${safeFindings.map((finding) => finding.rule).join(', ')}`)
  }

  return failures
}

function main() {
  const selfTestFailures = runSelfTests()
  if (selfTestFailures.length > 0) {
    console.error(JSON.stringify({ ok: false, phase: 'self-test', failures: selfTestFailures }, null, 2))
    process.exit(1)
  }

  const files = scanRoots.flatMap((root) => fs.existsSync(root) ? walk(root) : [])
  const findings = files.flatMap((file) => scanText(fs.readFileSync(file, 'utf8'), path.relative(repoRoot, file)))
  const report = {
    ok: findings.length === 0,
    filesScanned: files.length,
    findings,
  }

  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exit(1)
}

main()
