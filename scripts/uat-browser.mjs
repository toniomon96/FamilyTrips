import { chromium, expect, request } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = (process.env.UAT_BROWSER_BASE_URL ?? '').replace(/\/+$/, '')
const pin = process.env.UAT_BROWSER_PIN ?? ''
const generatedSlug = process.env.UAT_BROWSER_SLUG ?? ''
const generatedTripName = process.env.UAT_BROWSER_TRIP_NAME ?? 'Logan + Morgan Honeymoon'
const reportDir = process.env.UAT_BROWSER_REPORT_DIR ?? path.join(process.cwd(), 'uat-results', 'browser')
const keepData = process.env.UAT_KEEP_DATA === '1'
const expectListedSlug = process.env.UAT_BROWSER_EXPECT_LISTED_SLUG ?? ''
const bypassCookieHeaders = JSON.parse(process.env.UAT_BROWSER_BYPASS_COOKIES_JSON || '[]')
const requestedChecks = new Set(
  (process.env.UAT_BROWSER_CHECKS ?? 'render,form,checklist-packing,listed-index')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
)

const screenshotsDir = path.join(reportDir, 'screenshots')
const checks = []
const screenshots = []
const cleanup = []
const browserCreatedSlugs = []
const bypassCookies = Array.isArray(bypassCookieHeaders)
  ? bypassCookieHeaders.map((header) => parseSetCookie(header, baseUrl)).filter(Boolean)
  : []
const bypassCookieHeader = bypassCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')

function parseSetCookie(header, url) {
  if (!header || !url) return null
  const [pair] = String(header).split(';')
  const equalsIndex = pair.indexOf('=')
  if (equalsIndex <= 0) return null
  return {
    name: pair.slice(0, equalsIndex).trim(),
    value: pair.slice(equalsIndex + 1).trim(),
    url,
  }
}

function pass(name, details = {}) {
  checks.push({ name, ok: true, ...details })
}

function fail(name, error, details = {}) {
  checks.push({
    name,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    ...details,
  })
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

async function screenshot(page, name) {
  await mkdir(screenshotsDir, { recursive: true })
  const filePath = path.join(screenshotsDir, `${safeName(name)}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  screenshots.push(filePath)
}

async function runStep(name, fn) {
  try {
    await fn()
    pass(name)
  } catch (error) {
    fail(name, error)
  }
}

async function withCheckedPage(browser, name, viewport, fn) {
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
  })
  if (bypassCookies.length > 0) {
    await context.addCookies(bypassCookies)
  }
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  try {
    await fn(page)
    const hasViteOverlay = await page.locator('vite-error-overlay').count()
    if (hasViteOverlay > 0) throw new Error('Vite error overlay is visible.')
    if (pageErrors.length > 0) throw new Error(`Page runtime errors: ${pageErrors.join(' | ')}`)
    if (consoleErrors.length > 0) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`)
  } finally {
    await context.close()
  }
}

async function apiPost(apiContext, urlPath, body) {
  const response = await apiContext.post(urlPath, {
    data: body,
    headers: { 'content-type': 'application/json' },
  })
  let json = null
  try {
    json = await response.json()
  } catch {
    // Keep null body for plain failure responses.
  }
  return { status: response.status(), body: json }
}

async function cleanupSlug(apiContext, slug) {
  if (keepData) {
    cleanup.push({ slug, status: 'kept' })
    return
  }
  const result = await apiPost(apiContext, '/api/trips', {
    action: 'deleteUat',
    pin,
    tripSlug: slug,
  })
  cleanup.push({ slug, status: result.status, ok: result.status === 200 || result.status === 404 })
}

async function testTripsNewModes(browser) {
  const viewports = [
    { label: 'mobile', viewport: { width: 390, height: 844 } },
    { label: 'desktop', viewport: { width: 1280, height: 900 } },
  ]

  for (const { label, viewport } of viewports) {
    await runStep(`browser.trips-new.${label}`, async () => {
      await withCheckedPage(browser, `trips-new-${label}`, viewport, async (page) => {
        await page.goto(`${baseUrl}/trips/new`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Build a first draft' })).toBeVisible({ timeout: 30000 })
        await expect(page.locator('header').getByRole('button', { name: 'Build my trip' })).toBeVisible()
        await page.getByRole('button', { name: 'Start blank' }).click()
        await expect(page.getByRole('heading', { name: 'Start with a blank trip' })).toBeVisible()
        await page.locator('header').getByRole('button', { name: 'Build my trip' }).click()
        await expect(page.getByRole('heading', { name: 'Build a first draft' })).toBeVisible()
        await screenshot(page, `trips-new-${label}`)
      })
    })
  }
}

async function testGeneratedRoutes(browser) {
  const viewports = [
    { label: 'mobile', viewport: { width: 390, height: 844 } },
    { label: 'desktop', viewport: { width: 1280, height: 900 } },
  ]

  for (const { label, viewport } of viewports) {
    await runStep(`browser.generated-trip.${label}`, async () => {
      await withCheckedPage(browser, `generated-trip-${label}`, viewport, async (page) => {
        await page.goto(`${baseUrl}/${generatedSlug}`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: new RegExp(generatedTripName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })).toBeVisible({
          timeout: 45000,
        })
        await screenshot(page, `generated-trip-${label}`)
      })
    })

    await runStep(`browser.generated-manage.${label}`, async () => {
      await withCheckedPage(browser, `generated-manage-${label}`, viewport, async (page) => {
        await page.goto(`${baseUrl}/${generatedSlug}/manage?created=1&draft=generated`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByText('Draft created')).toBeVisible({ timeout: 45000 })
        await expect(page.getByRole('link', { name: 'View trip' })).toBeVisible()
        await screenshot(page, `generated-manage-${label}`)
      })
    })
  }
}

async function testFormSubmission(browser) {
  const formSlug = `codex-uat-browser-${Date.now()}`
  const formName = `Codex UAT Browser Trip ${Date.now()}`

  await runStep('browser.real-form-submission', async () => {
    await withCheckedPage(browser, 'real-form-submission', { width: 1280, height: 900 }, async (page) => {
      await page.goto(`${baseUrl}/trips/new`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Build a first draft' })).toBeVisible({ timeout: 30000 })
      await page.getByLabel('Trip edit PIN').fill(pin)
      await page.getByLabel('Trip name').fill(formName)
      await page.getByLabel('Share URL').fill(formSlug)
      await page.getByLabel('Destination or stay').fill('Le Blanc Los Cabos')
      await page.getByLabel('Start date').fill('2026-07-19')
      await page.getByLabel('End date').fill('2026-07-23')
      await page.getByLabel('Travelers').fill('Logan, Morgan')
      await page.getByLabel('Template').selectOption('honeymoon')
      await page.getByLabel('Trip brief').fill(
        'Honeymoon at Le Blanc Los Cabos with golf, horseback riding on the beach, Lovers Beach, relaxed resort time, and dinner reservation reminders.',
      )
      await page.getByLabel('Must-dos').fill('Golf\nHorseback riding on the beach\nLovers Beach')
      await page.getByLabel('Stay name').fill('Le Blanc Spa Resort Los Cabos')
      await page.getByLabel('Created by').fill('Codex UAT')
      await page.locator('form').getByRole('button', { name: 'Build my trip' }).click()
      await page.waitForURL(new RegExp(`/${formSlug}/manage`), { timeout: 120000 })
      browserCreatedSlugs.push(formSlug)
      await expect(page.getByText('Draft created')).toBeVisible({ timeout: 45000 })
      await screenshot(page, 'real-form-submission')
    })
  })
}

async function testChecklistAndPacking(browser) {
  await runStep('browser.checklist-refresh-persistence', async () => {
    await withCheckedPage(browser, 'checklist-refresh-persistence', { width: 390, height: 844 }, async (page) => {
      await page.goto(`${baseUrl}/${generatedSlug}/checklist`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Checklist' })).toBeVisible({ timeout: 45000 })

      const actorButtons = page.locator('button').filter({ hasText: /Logan|Morgan/i })
      if ((await actorButtons.count()) > 0) {
        await actorButtons.first().click()
      }

      const firstCheckbox = page.getByRole('checkbox').first()
      await expect(firstCheckbox).toBeVisible()
      const before = await firstCheckbox.getAttribute('aria-checked')
      await firstCheckbox.click()
      const after = before === 'true' ? 'false' : 'true'
      await expect(firstCheckbox).toHaveAttribute('aria-checked', after)
      await page.waitForTimeout(1500)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', after, { timeout: 45000 })
      await screenshot(page, 'checklist-refresh-persistence')
    })
  })

  await runStep('browser.packing-refresh-persistence', async () => {
    await withCheckedPage(browser, 'packing-refresh-persistence', { width: 390, height: 844 }, async (page) => {
      await page.goto(`${baseUrl}/${generatedSlug}/packing`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Packing' })).toBeVisible({ timeout: 45000 })
      const firstCheckbox = page.getByRole('checkbox').first()
      await expect(firstCheckbox).toBeVisible()
      const before = await firstCheckbox.getAttribute('aria-checked')
      await firstCheckbox.click()
      const after = before === 'true' ? 'false' : 'true'
      await expect(firstCheckbox).toHaveAttribute('aria-checked', after)
      await page.waitForTimeout(1500)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', after, { timeout: 45000 })
      await screenshot(page, 'packing-refresh-persistence')
    })
  })
}

async function testListedHome(browser) {
  if (!expectListedSlug) return

  await runStep('browser.visibility-listed-on-index', async () => {
    await withCheckedPage(browser, 'visibility-listed-on-index', { width: 1280, height: 900 }, async (page) => {
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Our trips' })).toBeVisible({ timeout: 30000 })
      await expect(page.getByText(generatedTripName)).toBeVisible({ timeout: 45000 })
      await screenshot(page, 'visibility-listed-on-index')
    })
  })
}

async function main() {
  await mkdir(reportDir, { recursive: true })
  if (!baseUrl) throw new Error('UAT_BROWSER_BASE_URL is required.')
  if (!pin) throw new Error('UAT_BROWSER_PIN is required.')
  if (!generatedSlug) throw new Error('UAT_BROWSER_SLUG is required.')

  const apiContext = await request.newContext({
    baseURL: baseUrl,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: bypassCookieHeader ? { cookie: bypassCookieHeader } : undefined,
  })
  const browser = await chromium.launch({ headless: true })

  try {
    if (requestedChecks.has('render')) {
      await testTripsNewModes(browser)
      await testGeneratedRoutes(browser)
    }
    if (requestedChecks.has('listed-index')) await testListedHome(browser)
    if (requestedChecks.has('form')) await testFormSubmission(browser)
    if (requestedChecks.has('checklist-packing')) await testChecklistAndPacking(browser)
  } finally {
    await browser.close()
    for (const slug of browserCreatedSlugs) {
      await cleanupSlug(apiContext, slug)
    }
    await apiContext.dispose()
  }

  const report = {
    ok: checks.every((check) => check.ok) && cleanup.every((item) => item.ok !== false),
    baseUrl,
    generatedSlug,
    checks,
    cleanup,
    screenshots,
  }
  await writeFile(path.join(reportDir, 'browser-report.json'), JSON.stringify(report, null, 2))
  return report
}

main()
  .then((report) => {
    console.log(JSON.stringify(report))
    process.exit(report.ok ? 0 : 1)
  })
  .catch(async (error) => {
    const report = {
      ok: false,
      baseUrl,
      generatedSlug,
      checks: [...checks, { name: 'browser.fatal', ok: false, error: error instanceof Error ? error.message : String(error) }],
      cleanup,
      screenshots,
    }
    await mkdir(reportDir, { recursive: true })
    await writeFile(path.join(reportDir, 'browser-report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report))
    process.exit(1)
  })
