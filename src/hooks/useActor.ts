import { useCallback, useSyncExternalStore } from 'react'
import { getStoredActorId, setStoredActorId } from '../lib/actor'

const listeners = new Set<() => void>()

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function notify(): void {
  for (const l of Array.from(listeners)) l()
}

export function useActor(tripSlug: string): {
  actorId: string | null
  setActor: (actorId: string | null) => void
} {
  const actorId = useSyncExternalStore(
    subscribe,
    () => getStoredActorId(tripSlug),
    () => null,
  )

  const setActor = useCallback(
    (id: string | null) => {
      setStoredActorId(tripSlug, id)
      notify()
    },
    [tripSlug],
  )

  return { actorId, setActor }
}
