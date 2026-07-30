import { Notification } from 'electron'
import { getDueUnfired, markFired, updateReminder } from './db/repos/reminders'

const CHECK_INTERVAL_MS = 30_000

function advanceRecurrence(dueAt: string, recurrence: 'none' | 'daily' | 'weekly' | 'monthly'): string | null {
  if (recurrence === 'none') return null
  const d = new Date(dueAt)
  if (recurrence === 'daily') d.setDate(d.getDate() + 1)
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

function checkReminders() {
  const now = new Date().toISOString()
  const due = getDueUnfired(now)

  for (const reminder of due) {
    if (Notification.isSupported()) {
      new Notification({
        title: reminder.title,
        body: reminder.notes || 'Reminder due now',
      }).show()
    }
    markFired(reminder.id, now)

    const nextDue = advanceRecurrence(reminder.dueAt, reminder.recurrence)
    if (nextDue) {
      updateReminder(reminder.id, { dueAt: nextDue })
    } else {
      updateReminder(reminder.id, { completed: true })
    }
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null

export function startReminderScheduler() {
  if (intervalHandle) return
  checkReminders()
  intervalHandle = setInterval(checkReminders, CHECK_INTERVAL_MS)
}

export function stopReminderScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
