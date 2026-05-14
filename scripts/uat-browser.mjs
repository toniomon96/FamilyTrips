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

async function assertNoSensitivePublicText(page, label) {
  const bodyText = await page.locator('body').innerText()
  const sensitivePatterns = [
    /\+1\s*\d{3}[\s.-]*\d{3}[\s.-]*\d{4}/,
    /\b(?:HMM[A-Z0-9]{5,}|RES-\d{3,}|C\d{8,}|210838\d*)\b/i,
    /\bpassword:\s*\S+/i,
    /\b(?:key in|outlet box|behind (?:the )?vase|door code|gate code|access code)\b/i,
    /\b(?:1127\s+Northwest|2718\s+Gulf|1771\s+Dixon|109\s+Genovese)\b/i,
  ]
  const hit = sensitivePatterns.find((pattern) => pattern.test(bodyText))
  if (hit) throw new Error(`${label} rendered sensitive public text matching ${hit}.`)
}

async function checkAccessibilityBasics(page, viewport) {
  const issues = await page.evaluate((isMobile) => {
    function isVisible(element) {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }

    const found = []
    for (const control of Array.from(document.querySelectorAll('input, select, textarea'))) {
      if (!(control instanceof HTMLElement) || !isVisible(control)) continue
      if (control instanceof HTMLInputElement && (control.type === 'hidden' || control.type === 'checkbox' || control.type === 'radio')) continue
      if (control.getAttribute('tabindex') === '-1') continue
      const labels = 'labels' in control ? control.labels : null
      const hasName = Boolean(
        labels?.length ||
        control.getAttribute('aria-label') ||
        control.getAttribute('aria-labelledby') ||
        control.getAttribute('title') ||
        control.getAttribute('placeholder')
      )
      if (!hasName) found.push(`Unlabeled ${control.tagName.toLowerCase()}`)
    }

    for (const tab of Array.from(document.querySelectorAll('[role="tab"]'))) {
      if (!(tab instanceof HTMLElement) || !isVisible(tab)) continue
      if (!tab.hasAttribute('aria-selected')) found.push('Tab missing aria-selected')
    }

    for (const pressed of Array.from(document.querySelectorAll('button[aria-pressed]'))) {
      if (!(pressed instanceof HTMLElement) || !isVisible(pressed)) continue
      const value = pressed.getAttribute('aria-pressed')
      if (value !== 'true' && value !== 'false') found.push('Toggle button has invalid aria-pressed')
    }

    if (isMobile) {
      for (const control of Array.from(document.querySelectorAll('button, input:not([type="checkbox"]):not([type="radio"]), select, textarea'))) {
        if (!(control instanceof HTMLElement) || !isVisible(control)) continue
        if (control.getAttribute('tabindex') === '-1') continue
        const rect = control.getBoundingClientRect()
        if (rect.width < 28 || rect.height < 28) {
          const label = control.innerText || control.getAttribute('aria-label') || control.getAttribute('name') || control.tagName.toLowerCase()
          found.push(`Small mobile target: ${label.trim().slice(0, 40)} (${Math.round(rect.width)}x${Math.round(rect.height)})`)
        }
      }
    }

    return found
  }, viewport.width <= 480)

  if (issues.length > 0) throw new Error(`Accessibility basics failed: ${issues.slice(0, 8).join(' | ')}`)
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
    const horizontalOverflow = await page.evaluate(() => (
      Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth
    ))
    if (horizontalOverflow > 2) throw new Error(`Horizontal overflow detected: ${horizontalOverflow}px.`)
    await checkAccessibilityBasics(page, viewport)
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
        await expect(page.getByRole('heading', { name: 'Build the plan from real context.' })).toBeVisible({ timeout: 30000 })
        await expect(page.locator('header').getByRole('button', { name: 'Build my plan' })).toBeVisible()
        await page.getByRole('button', { name: 'Start blank' }).click()
        await expect(page.locator('header').getByRole('button', { name: 'Start blank' })).toHaveClass(/bg-white/)
        await expect(page.locator('header').getByRole('button', { name: 'Start blank' })).toHaveAttribute('aria-pressed', 'true')
        await page.locator('header').getByRole('button', { name: 'Build my plan' }).click()
        await expect(page.locator('header').getByRole('button', { name: 'Build my plan' })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByText('Start with the essentials')).toBeVisible()
        await expect(page.getByText('Toni shares this with trusted family and friends')).toBeVisible()
        const startDate = page.getByLabel('Start date')
        const endDate = page.getByLabel('End date')
        await startDate.fill('2026-07-23')
        await expect(endDate).toHaveValue('2026-07-23')
        await expect(endDate).toHaveAttribute('min', '2026-07-23')
        await endDate.fill('2026-07-19')
        await expect(page.getByText('End date must be the same day or after the start date.')).toBeVisible()
        await expect(page.locator('form').getByRole('button', { name: 'Start planning' })).toBeDisabled()
        const bodyText = await page.locator('body').innerText()
        if (/Logan|Morgan/i.test(bodyText)) throw new Error('Trips/new still exposes Logan or Morgan as public example copy.')
        await screenshot(page, `trips-new-${label}`)
      })
    })
  }
}

async function testTripsNewSlowProgress(browser) {
  await runStep('browser.trips-new.slow-progress', async () => {
    await withCheckedPage(browser, 'trips-new-slow-progress', { width: 390, height: 844 }, async (page) => {
      await page.route('**/api/trips', async (route) => {
        const payload = route.request().postDataJSON()
        await page.waitForTimeout(900)
        if (payload.action === 'briefQuestions') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              quality: {
                score: 7,
                draftStrength: 'medium',
                missingInputs: [],
                warnings: [],
                questions: [],
              },
            }),
          })
          return
        }
        if (payload.action === 'preview') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              trip: {
                slug: 'mock-progress-trip',
                name: 'Mock Progress Trip',
                location: 'Mock City',
                startDate: '2026-07-19',
                endDate: '2026-07-20',
                visibility: 'unlisted',
                currency: '$',
                stay: { name: 'Mock stay', address: 'Mock area', checkIn: 'Confirm time', checkOut: 'Confirm time', amenities: [] },
                bookings: [],
                itinerary: [{ date: '2026-07-19', title: 'Arrival', items: [{ title: 'Settle in', status: 'suggested' }] }],
                thingsToDo: [],
                people: [],
                contacts: [],
                checklist: [],
                packing: [],
                copyBlocks: [],
                budget: [],
                planner: {
                  draftStrength: 'medium',
                  warnings: [],
                  missingInputs: [],
                  generatedAt: '2026-05-14T00:00:00.000Z',
                  sourceMode: 'deterministic',
                  sourceRefs: [],
                  questions: [],
                  notes: [],
                },
              },
              generationSummary: {
                source: 'deterministic',
                draftStrength: 'medium',
                notes: [],
                needsConfirmation: [],
                missingInputs: [],
                questions: [],
                sourceRefs: [],
              },
            }),
          })
          return
        }
        await route.continue()
      })

      await page.goto(`${baseUrl}/trips/new`, { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Trip edit PIN').fill(pin)
      await page.getByLabel(/Destination/).fill('Mock City')
      await page.getByLabel('Start date').fill('2026-07-19')
      await page.getByLabel('End date').fill('2026-07-20')
      await page.getByLabel('Tell us everything you already know').fill('Mock trip with enough context to test slow progress messaging.')
      await page.getByRole('button', { name: /Start planning/i }).click()
      await page.locator('form').getByRole('button', { name: 'Get smart questions' }).click()
      await expect(page.getByRole('status')).toContainText('Checking your brief')
      await expect(page.getByText('Nothing is saved here.')).toBeVisible()
      await expect(page.getByText('Smart follow-up questions')).toBeVisible({ timeout: 10000 })
      await page.locator('form').getByRole('button', { name: 'Build draft preview' }).click()
      await expect(page.getByRole('status')).toContainText('Building your draft')
      await expect(page.getByText('Nothing is saved until you accept the preview.')).toBeVisible()
      await expect(page.getByText('Review the draft before saving')).toBeVisible({ timeout: 10000 })
      await screenshot(page, 'trips-new-slow-progress')
    })
  })
}

async function testStaticAndEventManageCopy(browser) {
  await runStep('browser.static-manage-copy.mobile', async () => {
    await withCheckedPage(browser, 'static-manage-copy-mobile', { width: 390, height: 844 }, async (page) => {
      await page.goto(`${baseUrl}/okc/manage`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: /Manage/i })).toBeVisible({ timeout: 45000 })
      await expect(page.getByText('Hand-built plan')).toBeVisible()
      await expect(page.getByText('No generated source notes yet')).toBeVisible()
      await expect(page.getByText('Draft confidence')).toHaveCount(0)
      await expect(page.getByText('Deterministic fallback')).toHaveCount(0)
      await screenshot(page, 'static-manage-copy-mobile')
    })
  })

  await runStep('browser.event-manage-copy.mobile', async () => {
    await withCheckedPage(browser, 'event-manage-copy-mobile', { width: 390, height: 844 }, async (page) => {
      await page.goto(`${baseUrl}/family-cookout/manage`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: /Manage/i })).toBeVisible({ timeout: 45000 })
      const picker = page.getByLabel('Workspace section')
      await expect(picker).toBeVisible()
      await expect(picker.locator('option', { hasText: 'Run of show' })).toHaveCount(1)
      await expect(picker.locator('option', { hasText: 'Moments' })).toHaveCount(1)
      await expect(picker.locator('option', { hasText: 'Event tasks' })).toHaveCount(1)
      await expect(picker.locator('option', { hasText: 'Supplies' })).toHaveCount(1)
      await expect(page.getByText('Confirm, assign, then share.')).toBeVisible()
      await expect(page.getByText('Book, confirm, then share.')).toHaveCount(0)
      await screenshot(page, 'event-manage-copy-mobile')
    })
  })
}

async function testPublicRouteMatrix(browser) {
  const routes = [
    { path: '/okc', heading: /Morgan/i },
    { path: '/stpete', heading: /St\. Pete/i },
    { path: '/logan-bachelor', heading: /Logan/i },
    { path: '/family-cookout', heading: /Family Cookout/i },
    { path: '/mothers-day-2026', heading: /^Mother's Day weekend command center$/i },
  ]

  for (const route of routes) {
    await runStep(`browser.public-route.${safeName(route.path || 'home')}.mobile`, async () => {
      await withCheckedPage(browser, `public-route-${safeName(route.path)}-mobile`, { width: 390, height: 844 }, async (page) => {
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: route.heading })).toBeVisible({ timeout: 45000 })
        await assertNoSensitivePublicText(page, route.path)
        await screenshot(page, `public-route-${safeName(route.path)}-mobile`)
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
        await assertNoSensitivePublicText(page, `/${generatedSlug}`)
        await screenshot(page, `generated-trip-${label}`)
      })
    })

    await runStep(`browser.generated-manage.${label}`, async () => {
      await withCheckedPage(browser, `generated-manage-${label}`, viewport, async (page) => {
        await page.goto(`${baseUrl}/${generatedSlug}/manage?created=1&draft=generated`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByText('Draft created')).toBeVisible({ timeout: 45000 })
        if (label === 'mobile') {
          await expect(page.getByLabel('Workspace section')).toBeVisible()
          await expect(page.getByLabel('Workspace section').locator('option', { hasText: 'Advanced Editor' })).toHaveCount(1)
        } else {
          await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
          await expect(page.getByRole('tab', { name: 'Advanced Editor' })).toBeVisible()
        }
        await expect(page.getByText('Draft confidence')).toBeVisible()
        await expect(page.getByText('Based on this brief')).toBeVisible()
        await expect(page.getByText('Recommended places')).toBeVisible()
        await expect(page.getByRole('link', { name: 'View trip' })).toBeVisible()
        if (label === 'mobile') {
          const height = await page.evaluate(() => document.documentElement.scrollHeight)
          if (height > 14000) throw new Error(`Generated manage page is too tall for the command center: ${height}px.`)
        }
        if (label === 'mobile') {
          await page.getByLabel('Trip edit PIN').fill(pin)
          await page.getByLabel('Workspace section').selectOption('bookings')
          await expect(page.getByText('Add flights and timing later.')).toBeVisible()
          await page.getByLabel('Arrival flight / time').fill('AA 123 lands 2:15 PM at SJD')
          await page.getByRole('button', { name: 'Save travel details' }).click()
          await expect(page.getByText(/Saved version/i)).toBeVisible({ timeout: 45000 })
          await page.getByLabel('Workspace section').selectOption('share')
        } else {
          await page.getByRole('tab', { name: 'Share' }).click()
        }
        await expect(page.getByRole('button', { name: 'Copy message' }).first()).toBeVisible()
        if (label === 'mobile') await page.getByLabel('Workspace section').selectOption('assist')
        else await page.getByRole('tab', { name: 'Smart Assist' }).click()
        await expect(page.getByLabel('Assist action').locator('option', { hasText: 'Rewrite group-chat summary' })).toHaveCount(1)
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
      await expect(page.getByRole('heading', { name: 'Build the plan from real context.' })).toBeVisible({ timeout: 30000 })
      await page.getByLabel('Trip edit PIN').fill(pin)
      await page.getByLabel(/Destination/).fill('Le Blanc Los Cabos')
      await page.getByLabel('Start date').fill('2026-07-19')
      await page.getByLabel('End date').fill('2026-07-23')
      await page.getByLabel('Tell us everything you already know').fill(
        'Honeymoon at Le Blanc Los Cabos with golf, horseback riding on the beach, Lovers Beach, relaxed resort time, and dinner reservation reminders.',
      )
      await page.getByRole('button', { name: /Start planning/i }).click()
      await page.getByLabel('Plan name').fill(formName)
      await page.getByLabel('Share URL').fill(formSlug)
      await page.getByLabel('Travelers').fill('Logan, Morgan')
      await page.getByLabel('Template').selectOption('honeymoon')
      await page.getByLabel('Must-dos').fill('Golf\nHorseback riding on the beach\nLovers Beach')
      await page.getByLabel('Stay name').fill('Le Blanc Spa Resort Los Cabos')
      await page.getByLabel('Created by').fill('Codex UAT')
      await page.locator('form').getByRole('button', { name: 'Get smart questions' }).click()
      await expect(page.getByText('Smart follow-up questions')).toBeVisible({ timeout: 45000 })
      await page.locator('form').getByRole('button', { name: 'Build draft preview' }).click()
      await expect(page.getByText('Review the draft before saving')).toBeVisible({ timeout: 120000 })
      await page.locator('form').getByRole('button', { name: 'Accept and create trip' }).click()
      await page.waitForURL(new RegExp(`/${formSlug}/manage`), { timeout: 120000 })
      browserCreatedSlugs.push(formSlug)
      await expect(page.getByText('Draft created')).toBeVisible({ timeout: 45000 })
      await expect(page.getByRole('tab', { name: 'Advanced Editor' })).toBeVisible()
      await expect(page.getByText('Draft confidence')).toBeVisible()
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
      await testTripsNewSlowProgress(browser)
      await testPublicRouteMatrix(browser)
      await testGeneratedRoutes(browser)
      await testStaticAndEventManageCopy(browser)
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
