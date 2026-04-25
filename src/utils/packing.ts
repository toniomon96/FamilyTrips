const PACKING_STATE_PREFIX = 'packing:'

export function packingStateKey(itemId: string): string {
  return `${PACKING_STATE_PREFIX}${itemId}`
}
