import { getDb } from '../index'
import type { CanvasAssignment } from '../../../src/shared/types'

interface CanvasAssignmentRow extends Omit<CanvasAssignment, 'submitted'> {
  submitted: number
  syncedAt: string
}

export function replaceCachedAssignments(assignments: CanvasAssignment[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  const tx = db.transaction((rows: CanvasAssignment[]) => {
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
    .prepare('SELECT * FROM canvas_assignments ORDER BY (dueAt IS NULL), dueAt ASC')
    .all() as CanvasAssignmentRow[]
  return rows.map((r) => ({ ...r, submitted: !!r.submitted }))
}
