import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const productionUrl = process.env.UAT_PRODUCTION_URL || 'https://thegroupchat.voyage'
const keepDeployment = process.env.UAT_KEEP_DEPLOYMENT === '1'
const keepData = process.env.UAT_KEEP_DATA === '1'
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const runSuffix = crypto.randomBytes(3).toString('hex')
const reportDir = path.resolve('uat-results', `ai-production-${stamp}-${crypto.randomBytes(4).toString('hex')}`)
const reportJsonPath = path.join(reportDir, 'ai-production-report.json')
const reportMarkdownPath = path.join(reportDir, 'ai-production-report.md')
const uatPin = `uat-${crypto.randomBytes(12).toString('hex')}`
const slug = process.env.UAT_AI_SLUG || `codex-uat-ai-${stamp}-${runSuffix}`
let deploymentUrl = null
let deploymentId = null
let bypassCookieHeader = ''
let created = false
const checks = []
const cleanup = []

function run(label, command, args, options = {}) {
  const commandLine = [command, ...args].map((part) => {
    if (/^[A-Za-z0-9_./:=@%{}-]+$/.test(part)) return part
    return `"${part.replace(/(["])/g, '\\$1')}"`
  }).join(' ')
  const result = spawnSync(commandLine, {
    cwd: process.cwd(),
    shell: true,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  })
  return {
    label,
    command: commandLine,
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  }
}

function addCheck(name, ok, details = {}, error = undefined) {
  checks.push({ name, ok, details, ...(error ? { error } : {}) })
}

function parseDeploymentUrl(output) {
  return output.match(/https:\/\/[^\s]+\.vercel\.app/g)?.at(-1) ?? null
}

function parseDeploymentId(output) {
  return output.match(/dpl_[A-Za-z0-9]+/)?.[0] ?? null
}

function getBypassCookieHeader() {
  if (!deploymentUrl) throw new Error('No deployment URL available.')
  const result = run('Vercel deployment protection bypass cookie', 'vercel', [
    'curl',
    '/',
    '--deployment',
    deploymentUrl,
    '--yes',
    '--',
    '--silent',
    '--show-error',
    '--include',
    '--header',
    'x-vercel-set-bypass-cookie: true',
  ])
  if (!result.ok) throw new Error(result.stderr || result.stdout || 'Could not obtain Vercel bypass cookie.')
  const cookies = []
  for (const match of result.stdout.matchAll(/^set-cookie:\s*([^;\r\n]+)/gim)) {
    cookies.push(match[1].trim())
  }
  if (cookies.length === 0) throw new Error('Vercel did not return a deployment bypass cookie.')
  return cookies.join('; ')
}

async function deploymentPost(pathname, body, options = {}) {
  if (!deploymentUrl) throw new Error('No deployment URL available.')
  const url = new URL(pathname, deploymentUrl)
  let lastError = null
  const timeoutMs = options.timeoutMs ?? 240000
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(bypassCookieHeader ? { cookie: bypassCookieHeader } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
      return {
        status: response.status,
        content: await response.text(),
      }
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, attempt * 2500))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Deployment request failed.')
}

function markdown(report) {
  const lines = [
    `# AI Production UAT - ${report.status}`,
    '',
    `- Generated: ${report.generatedAt}`,
    `- Production URL: ${productionUrl}`,
    `- Temporary deployment: ${deploymentUrl ?? 'not created'}`,
    `- Generated slug: \`${slug}\``,
    '',
    '## Checks',
    '',
    ...report.checks.map((check) => `- ${check.ok ? 'PASS' : 'FAIL'}: ${check.name}${check.error ? ` - ${check.error}` : ''}`),
    '',
    '## Cleanup',
    '',
    ...report.cleanup.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'}: ${item.action}${item.status ? ` (${item.status})` : ''}`),
  ]
  return `${lines.join('\n')}\n`
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true })

  try {
    const deploy = run('Vercel production-shaped AI UAT deploy', 'vercel', [
      'deploy',
      '--prod',
      '--skip-domain',
      '--yes',
      '--env',
      `TRIP_EDITOR_PIN=${uatPin}`,
    ])
    deploymentUrl = parseDeploymentUrl(`${deploy.stdout}\n${deploy.stderr}`)
    addCheck('deploy-temp-production-shaped-app', deploy.ok && Boolean(deploymentUrl), { deploymentUrl }, deploy.ok ? undefined : deploy.stderr || deploy.stdout)
    if (!deploy.ok || !deploymentUrl) throw new Error('Could not create temporary production-shaped deployment.')

    const inspect = run('Vercel inspect temp deployment', 'vercel', ['inspect', deploymentUrl])
    deploymentId = parseDeploymentId(`${inspect.stdout}\n${inspect.stderr}`)
    addCheck('inspect-temp-deployment', inspect.ok, { deploymentId }, inspect.ok ? undefined : inspect.stderr || inspect.stdout)

    bypassCookieHeader = getBypassCookieHeader()
    addCheck('deployment-protection-bypass-cookie', Boolean(bypassCookieHeader), { cookieCount: bypassCookieHeader.split(';').filter(Boolean).length })

    const generate = await deploymentPost('/api/trips', {
      action: 'generate',
      pin: uatPin,
      createdBy: 'Codex UAT',
      brief: {
        slug,
        name: `Codex UAT AI Research Trip ${stamp}`,
        destination: 'Le Blanc Los Cabos',
        startDate: '2026-07-19',
        endDate: '2026-07-23',
        template: 'honeymoon',
        travelers: 'Logan, Morgan',
        stayName: 'Le Blanc Spa Resort Los Cabos',
        createdBy: 'Codex UAT',
        brief:
          'Honeymoon at Le Blanc Los Cabos. Research official resort dining and practical activity planning for golf, horseback riding on the beach, Lovers Beach, relaxed resort time, and dinner reservations.',
        vibe: ['honeymoon', 'romantic', 'resort', 'relaxed'],
        pace: 'very-loose',
        planningHelp: 'mostly-plan-for-me',
        mustDos: [
          { title: 'Play a round of golf', type: 'activity', timing: 'middle', required: true },
          { title: 'Ride horses on the beach', type: 'activity', timing: 'middle', required: true },
          { title: 'Visit Lovers Beach in Cabo', type: 'activity', timing: 'last-full-day', required: true },
        ],
      },
    }, { timeoutMs: 240000 })

    addCheck('generate-ai-trip', generate.status === 200, { status: generate.status }, generate.status === 200 ? undefined : generate.content)
    if (generate.status !== 200) throw new Error(`AI UAT generation failed with status ${generate.status}.`)

    const generated = JSON.parse(generate.content)
    created = Boolean(generated?.row?.trip_slug === slug)
    const notesText = JSON.stringify(generated?.generationSummary?.notes ?? [])
    const sourceRefs = generated?.generationSummary?.sourceRefs ?? []
    const sourceRefsCount = Array.isArray(sourceRefs) ? sourceRefs.length : 0
    const sourceMode = generated?.trip?.planner?.sourceMode
    const recommendationsCount = generated?.trip?.planner?.recommendations?.length ?? 0
    const miniPlansCount = generated?.trip?.planner?.miniPlans?.length ?? 0
    const hasSavedBrief = Boolean(generated?.trip?.planner?.brief)
    const usedLiveResearch = /Live web research was used/i.test(notesText) || sourceMode === 'search'
    const plannerFallback = /AI planner did not return valid output/i.test(notesText)

    addCheck('created-dynamic-uat-row', created && generated.row.source === 'dynamic' && generated.row.visibility === 'unlisted', {
      source: generated?.row?.source,
      visibility: generated?.row?.visibility,
    })
    addCheck('live-research-used', usedLiveResearch, { sourceMode, notes: generated?.generationSummary?.notes ?? [] }, usedLiveResearch ? undefined : 'Generation did not report live web research.')
    addCheck('no-invalid-ai-planner-fallback', !plannerFallback, { sourceMode }, plannerFallback ? 'AI composer failed validation instead of cleanly using the source-aware planner path.' : undefined)
    addCheck('source-refs-present', sourceRefsCount > 0, { sourceRefsCount }, sourceRefsCount > 0 ? undefined : 'No source refs returned.')
    addCheck('recommendation-candidates-present', recommendationsCount > 0, { recommendationsCount }, recommendationsCount > 0 ? undefined : 'No recommendation candidates were stored.')
    addCheck('mini-plans-present', miniPlansCount >= 3, { miniPlansCount }, miniPlansCount >= 3 ? undefined : 'Expected at least three must-do mini-plans.')
    addCheck('planner-brief-saved', hasSavedBrief, { hasSavedBrief }, hasSavedBrief ? undefined : 'Planner brief was not persisted.')

    const tripText = JSON.stringify(generated?.trip ?? {}).toLowerCase()
    for (const term of ['golf', 'horse', 'lovers beach']) {
      const includesTerm = tripText.includes(term)
      addCheck(
        `generated-content-includes-${term.replace(/\s+/g, '-')}`,
        includesTerm,
        {},
        includesTerm ? undefined : `Generated trip missing ${term}.`,
      )
    }
  } catch (error) {
    addCheck('ai-production-uat-runner', false, {}, error instanceof Error ? error.message : String(error))
  } finally {
    const shouldAttemptDelete = created || slug.startsWith('codex-uat-ai-')
    if (shouldAttemptDelete && deploymentUrl && !keepData) {
      try {
        const deleted = await deploymentPost('/api/trips', {
          action: 'deleteUat',
          pin: uatPin,
          tripSlug: slug,
        }, { timeoutMs: 60000 })
        cleanup.push({ action: 'delete-uat-row', ok: deleted.status === 200 || deleted.status === 404, status: deleted.status })
      } catch (error) {
        cleanup.push({ action: 'delete-uat-row', ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    } else if (shouldAttemptDelete && keepData) {
      cleanup.push({ action: 'delete-uat-row', ok: true, status: 'kept' })
    }

    if (deploymentUrl && !keepDeployment) {
      const target = deploymentId || deploymentUrl
      const removed = run('remove temp deployment', 'vercel', ['remove', target, '--yes'])
      cleanup.push({ action: 'remove-temp-deployment', ok: removed.ok, status: removed.status, ...(removed.ok ? {} : { error: removed.stderr || removed.stdout }) })
    } else if (deploymentUrl) {
      cleanup.push({ action: 'remove-temp-deployment', ok: true, status: 'kept' })
    }

    const failures = checks.filter((check) => !check.ok)
    const cleanupFailures = cleanup.filter((item) => !item.ok)
    const report = {
      ok: failures.length === 0 && cleanupFailures.length === 0,
      status: failures.length === 0 && cleanupFailures.length === 0 ? 'PASS' : 'FAIL',
      generatedAt: new Date().toISOString(),
      productionUrl,
      deploymentUrl,
      deploymentId,
      slug,
      checks,
      cleanup,
      reportJson: reportJsonPath,
      reportMarkdown: reportMarkdownPath,
    }
    fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`)
    fs.writeFileSync(reportMarkdownPath, markdown(report))
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok) process.exit(1)
  }
}

main()
