import { SESSIONS } from '../config/sessions'

export function toUtcDate(timestamp) {
  if (!timestamp || !timestamp.includes('T')) return null
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

export function classifySession(timestamp) {
  const utc = toUtcDate(timestamp)
  if (!utc) return { session: 'UNKNOWN', sessionSource: 'MISSING_TIME' }
  const hour = utc.getUTCHours() + utc.getUTCMinutes() / 60
  const active = SESSIONS.filter(({ start, end }) => start > end ? hour >= start || hour < end : hour >= start && hour < end)
  if (!active.length) return { session: 'UNKNOWN', sessionSource: 'AUTO' }
  // Sessions are ordered by their daily start time in the overlap precedence required by the journal.
  const primary = active.reduce((latest, item) => item.start > latest.start ? item : latest)
  return { session: primary.id, sessionSource: 'AUTO' }
}
