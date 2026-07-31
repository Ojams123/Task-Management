import { useCallback, useState } from 'react'
import { useSpeechRecognition } from '../voice/useSpeechRecognition'
import { parseVoiceCommand } from '../voice/commandParser'
import { speak } from '../voice/speak'
import type { Page } from './Sidebar'

export function VoiceBar({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [feedback, setFeedback] = useState('')

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const intent = parseVoiceCommand(transcript)

      try {
        if (intent.type === 'add-reminder') {
          await window.api.reminders.create({
            title: intent.title,
            notes: null,
            dueAt: intent.dueAt,
            recurrence: 'none',
          })
          const when = new Date(intent.dueAt).toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })
          const message = `Reminder set: "${intent.title}" for ${when}`
          setFeedback(message)
          speak(message)
          return
        }

        if (intent.type === 'add-goal') {
          await window.api.goals.create({
            title: intent.title,
            description: null,
            category: intent.category,
            targetValue: intent.targetValue,
            unit: intent.unit,
            dueDate: null,
          })
          const message = `Goal added: "${intent.title}" — target ${intent.targetValue} ${intent.unit}`
          setFeedback(message)
          speak(message)
          return
        }

        if (intent.type === 'add-transaction') {
          const categories = await window.api.budget.listCategories()
          let category = categories.find((c) => c.name.toLowerCase() === intent.categoryName.toLowerCase())
          if (!category) {
            category = await window.api.budget.createCategory({
              name: intent.categoryName,
              monthlyLimit: 0,
              kind: intent.kind,
            })
          }
          await window.api.budget.createTransaction({
            categoryId: category.id,
            amount: intent.amount,
            description: null,
            occurredAt: new Date().toISOString(),
          })
          const message = `Logged ${intent.kind === 'income' ? 'income' : 'expense'} of $${intent.amount} for ${intent.categoryName}`
          setFeedback(message)
          speak(message)
          return
        }

        if (intent.type === 'add-food') {
          await window.api.fitness.createFood({
            name: intent.name,
            calories: intent.calories,
            protein: null,
            carbs: null,
            fat: null,
            consumedAt: new Date().toISOString(),
          })
          const message = `Logged ${intent.name} — ${intent.calories} calories`
          setFeedback(message)
          speak(message)
          return
        }

        if (intent.type === 'add-exercise') {
          await window.api.fitness.createExercise({
            activity: intent.activity,
            durationMinutes: intent.durationMinutes,
            caloriesBurned: intent.caloriesBurned,
            notes: null,
            occurredAt: new Date().toISOString(),
          })
          const message = `Logged workout: ${intent.activity}`
          setFeedback(message)
          speak(message)
          return
        }

        if (intent.type === 'navigate') {
          onNavigate(intent.page)
          setFeedback(`Heard: "${transcript}" — opening ${intent.page}`)
          return
        }

        setFeedback(`Heard: "${transcript}" — I didn't recognize that command.`)
      } catch {
        setFeedback('Sorry, something went wrong handling that command.')
      }
    },
    [onNavigate]
  )

  const { supported, listening, interim, start, stop } = useSpeechRecognition(handleTranscript)

  if (!supported) {
    return <span className="muted">Voice commands unavailable in this build</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        className={`mic-button${listening ? ' listening' : ''}`}
        onClick={() => (listening ? stop() : start())}
      >
        {listening ? 'Listening…' : 'Voice command'}
      </button>
      <span className="voice-feedback">{listening ? interim || 'Say a command…' : feedback}</span>
    </div>
  )
}
