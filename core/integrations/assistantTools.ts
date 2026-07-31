import type Anthropic from '@anthropic-ai/sdk'
import * as reminders from '../db/repos/reminders'
import * as goals from '../db/repos/goals'
import * as budget from '../db/repos/budget'
import * as fitness from '../db/repos/fitness'
import * as canvasRepo from '../db/repos/canvas'
import * as calendarRepo from '../db/repos/calendar'
import * as ouraRepo from '../db/repos/oura'
import type { Reminder } from '../../src/shared/types'

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_reminder',
    description: 'Create a reminder that will fire as a desktop notification at the given due time.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What the reminder is about' },
        dueAt: { type: 'string', description: 'ISO 8601 datetime the reminder is due' },
        recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
        notes: { type: 'string' },
      },
      required: ['title', 'dueAt'],
    },
  },
  {
    name: 'create_goal',
    description: 'Create a new personal goal to track progress toward a numeric target (fitness, work, personal, finance, education, etc).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string', description: 'e.g. fitness, work, personal, finance, education' },
        targetValue: { type: 'number' },
        unit: { type: 'string', description: 'e.g. books, miles, dollars, reps' },
        description: { type: 'string' },
      },
      required: ['title', 'category', 'targetValue', 'unit'],
    },
  },
  {
    name: 'log_goal_progress',
    description: 'Add progress toward an existing goal, matched by (partial) title.',
    input_schema: {
      type: 'object',
      properties: {
        goalTitle: { type: 'string', description: 'Title or partial title of the existing goal' },
        delta: { type: 'number', description: 'Amount of progress to add (can be negative to correct)' },
        note: { type: 'string' },
      },
      required: ['goalTitle', 'delta'],
    },
  },
  {
    name: 'create_transaction',
    description: 'Log a budget transaction (expense or income) under a category, creating the category if it does not exist.',
    input_schema: {
      type: 'object',
      properties: {
        categoryName: { type: 'string' },
        kind: { type: 'string', enum: ['expense', 'income'] },
        amount: { type: 'number', description: 'Positive amount' },
        description: { type: 'string' },
      },
      required: ['categoryName', 'kind', 'amount'],
    },
  },
  {
    name: 'create_food_entry',
    description: 'Log a food/calorie entry for calorie tracking.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        consumedAt: { type: 'string', description: 'ISO 8601 datetime, defaults to now' },
      },
      required: ['name', 'calories'],
    },
  },
  {
    name: 'create_exercise_entry',
    description: 'Log a workout/exercise entry, optionally with calories burned, for athletic progress tracking.',
    input_schema: {
      type: 'object',
      properties: {
        activity: { type: 'string' },
        durationMinutes: { type: 'number' },
        caloriesBurned: { type: 'number' },
        notes: { type: 'string' },
        occurredAt: { type: 'string', description: 'ISO 8601 datetime, defaults to now' },
      },
      required: ['activity'],
    },
  },
  {
    name: 'get_overview',
    description:
      "Fetch the user's current reminders, active goals, this month's budget summary, upcoming Canvas assignments, upcoming calendar events, and recent Oura sleep/readiness/activity scores. Use this before answering questions about what's due, owed, in progress, or how they've been sleeping/recovering.",
    input_schema: { type: 'object', properties: {} },
  },
]

export function executeTool(name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case 'create_reminder': {
      const i = input as { title: string; dueAt: string; recurrence?: Reminder['recurrence']; notes?: string }
      return reminders.createReminder({
        title: i.title,
        dueAt: i.dueAt,
        recurrence: i.recurrence ?? 'none',
        notes: i.notes ?? null,
      })
    }
    case 'create_goal': {
      const i = input as { title: string; category: string; targetValue: number; unit: string; description?: string }
      return goals.createGoal({
        title: i.title,
        category: i.category,
        targetValue: i.targetValue,
        unit: i.unit,
        description: i.description ?? null,
        dueDate: null,
      })
    }
    case 'log_goal_progress': {
      const i = input as { goalTitle: string; delta: number; note?: string }
      const goal = goals.findGoalByTitle(i.goalTitle)
      if (!goal) return { error: `No goal found matching "${i.goalTitle}"` }
      return goals.logGoalProgress(goal.id, i.delta, i.note)
    }
    case 'create_transaction': {
      const i = input as { categoryName: string; kind: 'expense' | 'income'; amount: number; description?: string }
      const category = budget.findOrCreateCategory(i.categoryName, i.kind)
      return budget.createTransaction({
        categoryId: category.id,
        amount: i.amount,
        description: i.description ?? null,
        occurredAt: new Date().toISOString(),
      })
    }
    case 'create_food_entry': {
      const i = input as {
        name: string
        calories: number
        protein?: number
        carbs?: number
        fat?: number
        consumedAt?: string
      }
      return fitness.createFood({
        name: i.name,
        calories: i.calories,
        protein: i.protein ?? null,
        carbs: i.carbs ?? null,
        fat: i.fat ?? null,
        consumedAt: i.consumedAt ?? new Date().toISOString(),
      })
    }
    case 'create_exercise_entry': {
      const i = input as {
        activity: string
        durationMinutes?: number
        caloriesBurned?: number
        notes?: string
        occurredAt?: string
      }
      return fitness.createExercise({
        activity: i.activity,
        durationMinutes: i.durationMinutes ?? null,
        caloriesBurned: i.caloriesBurned ?? null,
        notes: i.notes ?? null,
        occurredAt: i.occurredAt ?? new Date().toISOString(),
      })
    }
    case 'get_overview': {
      const today = new Date().toISOString().slice(0, 10)
      return {
        reminders: reminders.listReminders().filter((r) => !r.completed).slice(0, 15),
        goals: goals.listGoals().filter((g) => !g.archived),
        budget: budget.summary(),
        assignments: canvasRepo.listCachedAssignments().filter((a) => !a.submitted).slice(0, 15),
        calendarEvents: calendarRepo.listCachedEvents().slice(0, 15),
        fitnessToday: fitness.dailyTotals(today),
        ouraRecent: ouraRepo.listCachedOuraDays().slice(0, 7),
      }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
