/**
 * @file A2A Task Manager
 * @module agents/a2a-task-manager
 * @description A2A task lifecycle management.
 *              Tasks flow: submitted -> working -> completed/failed.
 *              Auto-cleanup of tasks older than 1 hour.
 */

import { randomUUID } from 'crypto'

const tasks = new Map()

// Auto-cleanup every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 3600000 // 1 hour
  for (const [id, task] of tasks) {
    if (task.createdAt < cutoff) tasks.delete(id)
  }
}, 600000)

/**
 * Create a new A2A task.
 * @param {{ agentId: string, capability: string, input: object, parentTaskId?: string }} params
 * @returns {object} The created task
 */
export function createTask({ agentId, capability, input, parentTaskId = null }) {
  const id = randomUUID()
  const task = {
    id,
    agentId,
    capability,
    input,
    parentTaskId,
    status: 'submitted',
    output: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
  }
  tasks.set(id, task)
  return task
}

/**
 * Update an existing task.
 * Valid transitions: submitted → working → completed/failed
 * @param {string} id
 * @param {{ status?: string, output?: any, error?: string }} updates
 * @returns {object|null} Updated task, or null if not found
 */
export function updateTask(id, updates) {
  const task = tasks.get(id)
  if (!task) return null

  if (updates.status) {
    task.status = updates.status
    if (updates.status === 'completed' || updates.status === 'failed') {
      task.completedAt = Date.now()
    }
  }
  if (updates.output !== undefined) task.output = updates.output
  if (updates.error !== undefined) task.error = updates.error
  task.updatedAt = Date.now()

  return task
}

/**
 * Get a task by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getTask(id) {
  return tasks.get(id) || null
}

/**
 * Get all tasks (for debugging/admin).
 * @param {{ limit?: number, status?: string }} options
 * @returns {object[]}
 */
export function listTasks({ limit = 50, status } = {}) {
  let results = [...tasks.values()]
  if (status) results = results.filter(t => t.status === status)
  return results
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
}
