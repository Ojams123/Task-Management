import { useEffect, useState } from 'react'
import type { DailyFitnessSummary, ExerciseEntry, FoodEntry, Goal, OuraDailySummary } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { OuraIcon } from '../components/icons'
import { OuraPanel } from '../components/OuraPanel'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Fitness({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [summary, setSummary] = useState<DailyFitnessSummary | null>(null)
  const [food, setFood] = useState<FoodEntry[]>([])
  const [exercise, setExercise] = useState<ExerciseEntry[]>([])
  const [fitnessGoals, setFitnessGoals] = useState<Goal[]>([])
  const [targetInput, setTargetInput] = useState('2000')

  const [ouraConfigured, setOuraConfigured] = useState<boolean | null>(null)
  const [ouraDays, setOuraDays] = useState<OuraDailySummary[]>([])
  const [ouraSyncing, setOuraSyncing] = useState(false)
  const [ouraError, setOuraError] = useState<string | null>(null)

  const [foodName, setFoodName] = useState('')
  const [foodCalories, setFoodCalories] = useState('')

  const [activity, setActivity] = useState('')
  const [duration, setDuration] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')

  async function refresh() {
    const date = today()
    const [sum, foodList, exerciseList, goals, target, ouraStatus] = await Promise.all([
      window.api.fitness.dailySummary(date),
      window.api.fitness.listFood(date),
      window.api.fitness.listExercise(date),
      window.api.goals.list(),
      window.api.fitness.getCalorieTarget(),
      window.api.oura.getStatus(),
    ])
    setSummary(sum)
    setFood(foodList)
    setExercise(exerciseList)
    setFitnessGoals(goals.filter((g) => !g.archived && g.category.toLowerCase() === 'fitness'))
    setTargetInput(String(target))
    setOuraConfigured(ouraStatus.configured)
    if (ouraStatus.configured) setOuraDays(await window.api.oura.listCached())
  }

  async function syncOura() {
    setOuraSyncing(true)
    setOuraError(null)
    try {
      setOuraDays(await window.api.oura.sync())
    } catch (e) {
      setOuraError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setOuraSyncing(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function addFood() {
    const calories = Number(foodCalories)
    if (!foodName.trim() || !calories) return
    await window.api.fitness.createFood({
      name: foodName.trim(),
      calories,
      protein: null,
      carbs: null,
      fat: null,
      consumedAt: new Date().toISOString(),
    })
    setFoodName('')
    setFoodCalories('')
    await refresh()
  }

  async function removeFood(id: string) {
    await window.api.fitness.removeFood(id)
    await refresh()
  }

  async function addExercise() {
    if (!activity.trim()) return
    await window.api.fitness.createExercise({
      activity: activity.trim(),
      durationMinutes: duration ? Number(duration) : null,
      caloriesBurned: caloriesBurned ? Number(caloriesBurned) : null,
      notes: null,
      occurredAt: new Date().toISOString(),
    })
    setActivity('')
    setDuration('')
    setCaloriesBurned('')
    await refresh()
  }

  async function removeExercise(id: string) {
    await window.api.fitness.removeExercise(id)
    await refresh()
  }

  async function saveTarget() {
    const target = Number(targetInput)
    if (!target) return
    await window.api.fitness.setCalorieTarget(target)
    await refresh()
  }

  const pct = summary && summary.target > 0 ? Math.min(100, (summary.net / summary.target) * 100) : 0
  const overTarget = !!summary && summary.net > summary.target

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="stat">
            <span className="stat-label">Consumed today</span>
            <span className="stat-value">{summary?.consumed ?? 0}</span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="stat-label">Burned today</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>
              {summary?.burned ?? 0}
            </span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="stat-label">Net vs {summary?.target ?? 0} target</span>
            <span className="stat-value" style={{ color: overTarget ? 'var(--danger)' : undefined }}>
              {summary?.net ?? 0}
            </span>
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className={`progress-bar-fill${overTarget ? ' over' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Daily calorie target</h3>
        <div className="inline-form">
          <input
            type="number"
            style={{ width: 120 }}
            className="btn-sm"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
          />
          <button className="btn btn-sm btn-primary" onClick={saveTarget}>
            Save target
          </button>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Food log</h3>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>Food</label>
              <input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Chicken salad" />
            </div>
            <div className="field">
              <label>Calories</label>
              <input type="number" value={foodCalories} onChange={(e) => setFoodCalories(e.target.value)} placeholder="450" />
            </div>
            <button className="btn btn-primary" onClick={addFood}>
              Log food
            </button>
          </div>
          {food.length === 0 ? (
            <div className="empty-state">Nothing logged today.</div>
          ) : (
            <div className="list">
              {food.map((f) => (
                <div className="list-row" key={f.id}>
                  <div className="list-row-main">
                    <div className="list-row-title">{f.name}</div>
                    <div className="list-row-sub">{new Date(f.consumedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                  <div className="list-row-actions">
                    <span className="badge">{f.calories} cal</span>
                    <button className="btn btn-sm btn-danger" onClick={() => removeFood(f.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Exercise log</h3>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>Activity</label>
              <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Running" />
            </div>
            <div className="field">
              <label>Minutes</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" />
            </div>
            <div className="field">
              <label>Calories burned</label>
              <input
                type="number"
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(e.target.value)}
                placeholder="300"
              />
            </div>
            <button className="btn btn-primary" onClick={addExercise}>
              Log workout
            </button>
          </div>
          {exercise.length === 0 ? (
            <div className="empty-state">Nothing logged today.</div>
          ) : (
            <div className="list">
              {exercise.map((ex) => (
                <div className="list-row" key={ex.id}>
                  <div className="list-row-main">
                    <div className="list-row-title">{ex.activity}</div>
                    <div className="list-row-sub">
                      {ex.durationMinutes != null && `${ex.durationMinutes} min`}
                      {ex.caloriesBurned != null && ` · ${ex.caloriesBurned} cal`}
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <button className="btn btn-sm btn-danger" onClick={() => removeExercise(ex.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>
          <span className="heading-with-icon">
            <OuraIcon size={20} />
            Oura Ring
          </span>
          {ouraConfigured && (
            <button className="btn btn-sm" onClick={syncOura} disabled={ouraSyncing}>
              {ouraSyncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
        </h3>
        {ouraConfigured === false ? (
          <div className="empty-state">
            Add your Oura personal access token in Settings to see sleep, readiness, and activity scores here.{' '}
            <button className="link" onClick={() => onNavigate?.('settings')}>
              Go to Settings
            </button>
          </div>
        ) : ouraError ? (
          <p className="muted" style={{ color: 'var(--danger)' }}>
            {ouraError}
          </p>
        ) : (
          <OuraPanel days={ouraDays} />
        )}
      </div>

      <div className="card">
        <h3>Athletic progress</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Fitness targets (5k time, max lift, etc.) are tracked as goals tagged "fitness" — add one from the
          Goals page.
        </p>
        {fitnessGoals.length === 0 ? (
          <div className="empty-state">No fitness goals yet.</div>
        ) : (
          <div className="list">
            {fitnessGoals.map((g) => {
              const pct = g.targetValue > 0 ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0
              return (
                <div key={g.id} style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{g.title}</span>
                    <span className="muted">
                      {g.currentValue}/{g.targetValue} {g.unit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
