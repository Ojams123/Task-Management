import type { CanvasAssignment, CanvasSettings } from '../../src/shared/types'

interface CanvasCourse {
  id: number
  name: string
  workflow_state: string
}

interface CanvasApiAssignment {
  id: number
  name: string
  due_at: string | null
  html_url: string
  points_possible: number | null
  submission?: { workflow_state: string }
}

function normalizeDomain(domain: string): string {
  let d = domain.trim()
  if (!/^https?:\/\//.test(d)) d = `https://${d}`
  return d.replace(/\/+$/, '')
}

async function canvasFetch<T>(settings: CanvasSettings, endpoint: string): Promise<T> {
  const base = normalizeDomain(settings.domain)
  const res = await fetch(`${base}${endpoint}`, {
    headers: { Authorization: `Bearer ${settings.token}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Canvas API error ${res.status}: ${body || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function fetchAssignments(settings: CanvasSettings): Promise<Omit<CanvasAssignment, 'completedLocally'>[]> {
  const courses = await canvasFetch<CanvasCourse[]>(
    settings,
    '/api/v1/courses?enrollment_state=active&per_page=100'
  )

  const results: Omit<CanvasAssignment, 'completedLocally'>[] = []

  for (const course of courses) {
    if (course.workflow_state !== 'available') continue
    try {
      const assignments = await canvasFetch<CanvasApiAssignment[]>(
        settings,
        `/api/v1/courses/${course.id}/assignments?include[]=submission&order_by=due_at&per_page=100`
      )
      for (const a of assignments) {
        results.push({
          id: `${course.id}-${a.id}`,
          courseId: String(course.id),
          courseName: course.name,
          name: a.name,
          dueAt: a.due_at,
          htmlUrl: a.html_url,
          submitted: a.submission?.workflow_state === 'submitted' || a.submission?.workflow_state === 'graded',
          pointsPossible: a.points_possible,
        })
      }
    } catch {
      // Skip courses we can't read assignments for (e.g. concluded/restricted) rather than failing the whole sync.
      continue
    }
  }

  return results
}
