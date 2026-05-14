const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  return isIsoDate(startDate) && isIsoDate(endDate) && startDate <= endDate
}

export function dateRangeError(startDate: string, endDate: string): string | null {
  if (!startDate) return 'Start date is required.'
  if (!endDate) return 'End date is required.'
  if (!isIsoDate(startDate)) return 'Start date must be a real calendar date.'
  if (!isIsoDate(endDate)) return 'End date must be a real calendar date.'
  if (startDate > endDate) return 'End date must be the same day or after the start date.'
  return null
}

export function isDateWithinRange(date: string, startDate: string, endDate: string): boolean {
  return isIsoDate(date) && isValidDateRange(startDate, endDate) && date >= startDate && date <= endDate
}
