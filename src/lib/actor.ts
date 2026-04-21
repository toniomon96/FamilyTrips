const KEY_PREFIX = 'familytrips:actor:'

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getStoredActorId(tripSlug: string): string | null {
  if (!hasWindow()) return null
  try {
    return window.localStorage.getItem(KEY_PREFIX + tripSlug)
  } catch {
    return null
  }
}

export function setStoredActorId(tripSlug: string, actorId: string | null): void {
  if (!hasWindow()) return
  try {
    if (actorId) {
      window.localStorage.setItem(KEY_PREFIX + tripSlug, actorId)
    } else {
      window.localStorage.removeItem(KEY_PREFIX + tripSlug)
    }
  } catch {
    // ignore storage failures (Safari private mode etc.)
  }
}
