import { getDb } from '../index'
import type { CanvasAssignment } from '../../../src/shared/types'

interface CanvasAssignmentRow extends Omit<CanvasAssignment, 'submitted' | 'completedLocally'> {
  submitted: number
  syncedAt: string
  completedLocally: number | null
}

export function replaceCachedAssignments(assignments: Omit<CanvasAssignment, 'completedLocally'>[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  const tx = db.transaction((rows: Omit<CanvasAssignment, 'completedLocally'>[]) => {
    db.prepare('DELETE FROM canvas_assignments').run()
    const insert = db.prepare(
      `INSERT INTO canvas_assignments (id, courseId, courseName, name, dueAt, htmlUrl, submitted, pointsPossible, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const a of rows) {
      insert.run(
        a.id,
        a.courseId,
        a.courseName,
        a.name,
        a.dueAt,
        a.htmlUrl,
        a.submitted ? 1 : 0,
        a.pointsPossible,
        syncedAt
      )
    }
  })
  tx(assignments)
}

export function listCachedAssignments(): CanvasAssignment[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT ca.*, lc.assignmentId IS NOT NULL AS completedLocally
       FROM canvas_assignments ca
       LEFT JOIN canvas_local_completion lc ON lc.assignmentId = ca.id
       ORDER BY (ca.dueAt IS NULL), ca.dueAt ASC`
    )
    .all() as CanvasAssignmentRow[]
  return rows.map((r) => ({ ...r, submitted: !!r.submitted, completedLocally: !!r.completedLocally }))
}

export function setLocalCompletion(assignmentId: string, completed: boolean) {
  const db = getDb()
  if (completed) {
    db.prepare(
      `INSERT INTO canvas_local_completion (assignmentId, completedAt) VALUES (?, ?)
       ON CONFLICT(assignmentId) DO UPDATE SET completedAt = excluded.completedAt`
    ).run(assignmentId, new Date().toISOString())
  } else {
    db.prepare('DELETE FROM canvas_local_completion WHERE assignmentId = ?').run(assignmentId)
  }
}
