import { Notification } from 'electron'
import { checkDueReminders } from '../core/reminderEngine'

const CHECK_INTERVAL_MS = 30_000

function checkReminders() {
  const fired = checkDueReminders()
  for (const reminder of fired) {
    if (Notification.isSupported()) {
      new Notification({
        title: reminder.title,
        body: reminder.notes || 'Reminder due now',
      }).show()
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
