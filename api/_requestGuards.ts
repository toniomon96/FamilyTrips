import type { IncomingMessage } from 'node:http'

type JsonRequest = IncomingMessage & {
  body?: unknown
}

type RateEntry = {
  count: number
  resetAt: number
}

type RateDecision = {
  ok: boolean
  count: number
  resetAt: number
  retryAfterSeconds?: number
}

const DEFAULT_MAX_BODY_BYTES = 256 * 1024
const DEFAULT_RATE_LIMIT = 60
const DEFAULT_RATE_WINDOW_MS = 60_000
const rateBuckets = new Map<string, RateEntry>()

export class RequestGuardError extends Error {
  status: number
  publicMessage: string

  constructor(status: number, publicMessage: string) {
    super(publicMessage)
    this.status = status
    this.publicMessage = publicMessage
  }
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function checkRateLimitForKey(
  key: string,
  now = Date.now(),
  options: { limit?: number; windowMs?: number } = {},
): RateDecision {
  const limit = options.limit ?? envNumber('TRIP_API_RATE_LIMIT', DEFAULT_RATE_LIMIT)
  const windowMs = options.windowMs ?? envNumber('TRIP_API_RATE_WINDOW_MS', DEFAULT_RATE_WINDOW_MS)
  const current = rateBuckets.get(key)
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs
    rateBuckets.set(key, { count: 1, resetAt })
    return { ok: true, count: 1, resetAt }
  }

  const next = { count: current.count + 1, resetAt: current.resetAt }
  rateBuckets.set(key, next)
  if (next.count > limit) {
    return {
      ok: false,
      count: next.count,
      resetAt: next.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((next.resetAt - now) / 1000)),
    }
  }
  return { ok: true, count: next.count, resetAt: next.resetAt }
}

export function resetRequestGuardsForTests() {
  rateBuckets.clear()
}

function requestIp(req: IncomingMessage): string {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }
  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? 'unknown'
}

export function enforceRateLimit(req: IncomingMessage, scope: string) {
  const decision = checkRateLimitForKey(`${scope}:${requestIp(req)}`)
  if (!decision.ok) {
    throw new RequestGuardError(
      429,
      `Too many planning requests. Try again in ${decision.retryAfterSeconds ?? 60} seconds.`,
    )
  }
}

export function assertBodySize(bytes: number, maxBytes = envNumber('TRIP_API_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES)) {
  if (bytes > maxBytes) {
    throw new RequestGuardError(413, 'This planning request is too large. Trim the brief and try again.')
  }
}

function parseJson(raw: string): unknown {
  try {
    return raw.trim() ? JSON.parse(raw) : {}
  } catch {
    throw new RequestGuardError(400, 'Invalid JSON request body.')
  }
}

export async function readJsonBody(req: JsonRequest): Promise<unknown> {
  if (req.body !== undefined) {
    if (typeof req.body !== 'string') {
      assertBodySize(Buffer.byteLength(JSON.stringify(req.body)))
      return req.body
    }
    assertBodySize(Buffer.byteLength(req.body))
    return parseJson(req.body)
  }

  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.byteLength
    assertBodySize(bytes)
    chunks.push(buffer)
  }
  return parseJson(Buffer.concat(chunks).toString('utf8'))
}
