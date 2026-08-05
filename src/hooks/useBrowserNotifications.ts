import { useEffect, useRef } from 'react'
import { pollBudgetAlerts, pollFiredReminders } from '../api/httpClient'

const POLL_INTERVAL_MS = 30_000

/** Browser-mode substitute for the Electron desktop scheduler: since there's
 * no background process to fire native notifications, poll the server for
 * reminders that fired and budget alerts that triggered since our last
 * check, and show a Web Notification for each. No-op when `enabled` is
 * false (Electron mode, which gets native notifications from its own
 * scheduler instead). */
export function useBrowserNotifications(enabled: boolean) {
  const reminderCursorRef = useRef(new Date().toISOString())
  const budgetCursorRef = useRef(new Date().toISOString())

  useEffect(() => {
    if (!enabled) return

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const interval = setInterval(async () => {
      const canNotify = 'Notification' in window && Notification.permission === 'granted'

      try {
        const fired = await pollFiredReminders(reminderCursorRef.current)
        reminderCursorRef.current = new Date().toISOString()
        if (canNotify) {
          for (const reminder of fired) {
            new Notification(reminder.title, { body: reminder.notes || 'Reminder due now' })
          }
        }
      } catch {
        // Transient network hiccup — next poll will catch up.
      }

      try {
        const alerts = await pollBudgetAlerts(budgetCursorRef.current)
        budgetCursorRef.current = new Date().toISOString()
        if (canNotify) {
          for (const alert of alerts) {
            const title =
              alert.level === 'over' ? `Over budget: ${alert.categoryName}` : `Approaching limit: ${alert.categoryName}`
            new Notification(title, {
              body:
                alert.level === 'over'
                  ? `You've gone over your monthly budget for ${alert.categoryName}.`
                  : `You're getting close to your monthly budget for ${alert.categoryName}.`,
            })
          }
        }
      } catch {
        // Transient network hiccup — next poll will catch up.
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [enabled])
}
