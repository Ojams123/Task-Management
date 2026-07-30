import { useEffect, useRef } from 'react'
import { pollFiredReminders } from '../api/httpClient'

const POLL_INTERVAL_MS = 30_000

/** Browser-mode substitute for the Electron desktop scheduler: since there's
 * no background process to fire native notifications, poll the server for
 * reminders that have fired since our last check and show a Web
 * Notification for each. No-op when `enabled` is false (Electron mode). */
export function useBrowserReminderNotifications(enabled: boolean) {
  const cursorRef = useRef(new Date().toISOString())

  useEffect(() => {
    if (!enabled) return

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const interval = setInterval(async () => {
      try {
        const fired = await pollFiredReminders(cursorRef.current)
        cursorRef.current = new Date().toISOString()
        if ('Notification' in window && Notification.permission === 'granted') {
          for (const reminder of fired) {
            new Notification(reminder.title, { body: reminder.notes || 'Reminder due now' })
          }
        }
      } catch {
        // Transient network hiccup — next poll will catch up.
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [enabled])
}
