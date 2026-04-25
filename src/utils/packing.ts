const PACKING_STATE_PREFIX = 'packing:'
const SUPPLIES_STATE_PREFIX = 'supplies:'

export function packingStateKey(itemId: string): string {
  return `${PACKING_STATE_PREFIX}${itemId}`
}

export function suppliesStateKey(itemId: string): string {
  return `${SUPPLIES_STATE_PREFIX}${itemId}`
}
