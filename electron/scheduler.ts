import { Notification } from 'electron'
import { checkDueReminders } from '../core/reminderEngine'
import { checkBudgetAlerts } from '../core/budgetEngine'

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

  const budgetAlerts = checkBudgetAlerts()
  for (const alert of budgetAlerts) {
    if (Notification.isSupported()) {
      new Notification({
        title: alert.level === 'over' ? `Over budget: ${alert.categoryName}` : `Approaching limit: ${alert.categoryName}`,
        body: `$${alert.spent.toFixed(2)} of $${alert.limit.toFixed(2)} spent this month`,
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
