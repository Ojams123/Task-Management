import { getDueUnfired, markFired, updateReminder } from './db/repos/reminders'
import type { Reminder } from '../src/shared/types'

function advanceRecurrence(dueAt: string, recurrence: Reminder['recurrence']): string | null {
  if (recurrence === 'none') return null
  const d = new Date(dueAt)
  if (recurrence === 'daily') d.setDate(d.getDate() + 1)
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

/**
 * Finds reminders due-but-not-yet-fired, marks them fired (advancing
 * recurring ones to their next occurrence), and returns the ones that just
 * fired so the caller can surface a notification however fits its host
 * (native Notification in Electron, Web Notification from a browser poll).
 */
export function checkDueReminders(): Reminder[] {
  const now = new Date().toISOString()
  const due = getDueUnfired(now)
  const fired: Reminder[] = []

  for (const reminder of due) {
    markFired(reminder.id, now)
    const nextDue = advanceRecurrence(reminder.dueAt, reminder.recurrence)
    const updated = nextDue
      ? updateReminder(reminder.id, { dueAt: nextDue })
      : updateReminder(reminder.id, { completed: true })
    fired.push({ ...updated, dueAt: reminder.dueAt })
  }

  return fired
}
