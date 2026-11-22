/**
 * Reactive Central State Store
 * Manages active user, selected tabs, subject list, active selections, and UI banners.
 */

import { storage } from './storage.js'
import { auth } from './auth.js'

class StateStore {
  constructor() {
    this.currentUser = auth.getCurrentUser()
    this.activeTab = 'dashboard'
    this.subjects = this.currentUser ? storage.getSubjects(this.currentUser.id) : []
    this.tasks = this.currentUser ? storage.getTasks(this.currentUser.id) : []
    this.goals = this.currentUser ? storage.getGoals(this.currentUser.id) : []
    this.selectedId = this.subjects[0]?.id || ''
    this.sidebarOpen = false
    this.saving = false
    this.notice = ''
    this.error = ''
    this.listeners = new Set()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this)
      } catch (err) {
        console.error('State subscriber error', err)
      }
    }
  }

  setUser(user) {
    this.currentUser = user
    if (user) {
      this.subjects = storage.getSubjects(user.id)
      this.tasks = storage.getTasks(user.id)
      this.goals = storage.getGoals(user.id)
      this.selectedId = this.subjects[0]?.id || ''
    } else {
      this.subjects = []
      this.tasks = []
      this.goals = []
      this.selectedId = ''
    }
    this.notice = ''
    this.error = ''
    this.notify()
  }

  setTab(tab) {
    this.activeTab = tab
    this.sidebarOpen = false
    this.notice = ''
    this.error = ''
    this.notify()
  }

  setSelectedId(id) {
    this.selectedId = id
    this.notice = ''
    this.error = ''
    this.notify()
  }

  setSidebarOpen(open) {
    this.sidebarOpen = Boolean(open)
    this.notify()
  }

  setSaving(saving) {
    this.saving = Boolean(saving)
    this.notify()
  }

  setFeedback(notice = '', error = '') {
    this.notice = notice
    this.error = error
    this.notify()
  }

  getSelectedSubject() {
    return this.subjects.find((s) => s.id === this.selectedId) || this.subjects[0]
  }

  // `silent` updates the data without re-rendering, used while the student is typing
  // so the focused input (and its cursor) is left untouched.
  updateSelectedSubject(change, { silent = false } = {}) {
    const selected = this.getSelectedSubject()
    if (!selected) return

    this.subjects = this.subjects.map((item) =>
      item.id === selected.id ? { ...item, ...change } : item,
    )
    if (!silent) this.notify()
  }

  addSubject(newSubject) {
    this.subjects = [...this.subjects, newSubject]
    this.selectedId = newSubject.id
    this.activeTab = 'subjects'
    this.notice = ''
    this.error = ''
    this.notify()
  }

  replaceSubject(savedSubject) {
    this.subjects = this.subjects.map((item) =>
      item.id === this.selectedId || item.id === savedSubject.id ? savedSubject : item,
    )
    this.selectedId = savedSubject.id
    this.notify()
  }

  removeCurrentSubject() {
    const selected = this.getSelectedSubject()
    if (!selected) return

    if (this.currentUser && !selected.isDraft) {
      storage.deleteSubject(this.currentUser.id, selected.id)
      this.detachSubjectFromPlanning(selected.id)
    }

    this.subjects = this.subjects.filter((item) => item.id !== selected.id)
    this.selectedId = this.subjects[0]?.id || ''
    this.notice = ''
    this.error = ''
    this.notify()
  }

  // ---------------------------------------------------------------------------
  // Study planner tasks
  // ---------------------------------------------------------------------------

  /** Insert or update a task. Throws if browser storage rejects the write. */
  saveTask(task) {
    const exists = this.tasks.some((t) => t.id === task.id)
    const next = exists ? this.tasks.map((t) => (t.id === task.id ? task : t)) : [...this.tasks, task]
    storage.saveTasks(this.currentUser.id, next)
    this.tasks = next
    this.notify()
  }

  toggleTask(id) {
    const next = this.tasks.map((t) =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null }
        : t,
    )
    storage.saveTasks(this.currentUser.id, next)
    this.tasks = next
    this.notify()
  }

  deleteTask(id) {
    const next = this.tasks.filter((t) => t.id !== id)
    storage.saveTasks(this.currentUser.id, next)
    this.tasks = next
    this.notify()
  }

  // ---------------------------------------------------------------------------
  // Academic goals
  // ---------------------------------------------------------------------------

  saveGoal(goal) {
    const exists = this.goals.some((g) => g.id === goal.id)
    const next = exists ? this.goals.map((g) => (g.id === goal.id ? goal : g)) : [...this.goals, goal]
    storage.saveGoals(this.currentUser.id, next)
    this.goals = next
    this.notify()
  }

  deleteGoal(id) {
    const next = this.goals.filter((g) => g.id !== id)
    storage.saveGoals(this.currentUser.id, next)
    this.goals = next
    this.notify()
  }

  /** When a subject is deleted its goals are removed and its tasks become unassigned. */
  detachSubjectFromPlanning(subjectId) {
    const userId = this.currentUser.id
    if (this.goals.some((g) => g.subjectId === subjectId)) {
      this.goals = this.goals.filter((g) => g.subjectId !== subjectId)
      storage.saveGoals(userId, this.goals)
    }
    if (this.tasks.some((t) => t.subjectId === subjectId)) {
      this.tasks = this.tasks.map((t) => (t.subjectId === subjectId ? { ...t, subjectId: '' } : t))
      storage.saveTasks(userId, this.tasks)
    }
  }
}

export const store = new StateStore()
