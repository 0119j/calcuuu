/**
 * Shared helpers: HTML escaping, ids, and local-time date utilities
 * used by the Study Planner, Goal Tracker and Dashboard.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

const pad = (n) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD. */
export function toDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function isValidTimeString(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')
}

/** Moment a task is due. Tasks without a time are due at the end of their day. */
export function dueTimestamp(task) {
  const [y, m, d] = task.date.split('-').map(Number)
  if (isValidTimeString(task.time)) {
    const [hh, mm] = task.time.split(':').map(Number)
    return new Date(y, m - 1, d, hh, mm, 0).getTime()
  }
  return new Date(y, m - 1, d, 23, 59, 59).getTime()
}

/** Whole calendar days from `now` to the task's date (negative = past). */
export function daysFromToday(dateString, now = new Date()) {
  const [y, m, d] = dateString.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target - today) / 86400000)
}

export function formatDate(dateString, now = new Date()) {
  const [y, m, d] = dateString.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const opts = { weekday: 'short', month: 'short', day: 'numeric' }
  if (y !== now.getFullYear()) opts.year = 'numeric'
  return date.toLocaleDateString('en-US', opts)
}

export function formatTime(time) {
  if (!isValidTimeString(time)) return ''
  const [hh, mm] = time.split(':').map(Number)
  const suffix = hh >= 12 ? 'PM' : 'AM'
  return `${hh % 12 || 12}:${pad(mm)} ${suffix}`
}

export function relativeDayLabel(dateString, now = new Date()) {
  const diff = daysFromToday(dateString, now)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1) return `In ${diff} days`
  return `${Math.abs(diff)} days ago`
}
