/**
 * Storage Layer for CalCalculator
 * Uses localStorage with multi-user isolation and starter data.
 */

const STORAGE_PREFIX = 'calcalc_'
const USERS_KEY = `${STORAGE_PREFIX}users`
const SESSION_KEY = `${STORAGE_PREFIX}session`
const SUBJECTS_KEY_PREFIX = `${STORAGE_PREFIX}subjects_`
const TASKS_KEY_PREFIX = `${STORAGE_PREFIX}tasks_`
const GOALS_KEY_PREFIX = `${STORAGE_PREFIX}goals_`

const DEFAULT_STARTER_SUBJECTS = [
  {
    id: 'starter-1',
    name: 'Calculus II',
    professor: 'Dr. Maria Santos',
    assessments: [
      { id: 'a1', name: 'Problem Set 1', weight: 15, score: 92, maxScore: 100 },
      { id: 'a2', name: 'Problem Set 2', weight: 15, score: 88, maxScore: 100 },
      { id: 'a3', name: 'Midterm Exam', weight: 30, score: 85, maxScore: 100 },
      { id: 'a4', name: 'Final Exam', weight: 40, score: 0, maxScore: 100 },
    ],
  },
  {
    id: 'starter-2',
    name: 'Data Structures & Algorithms',
    professor: 'Prof. David Lee',
    assessments: [
      { id: 'b1', name: 'Coding Lab 1', weight: 20, score: 95, maxScore: 100 },
      { id: 'b2', name: 'Midterm Project', weight: 30, score: 90, maxScore: 100 },
      { id: 'b3', name: 'Final Capstone', weight: 50, score: 0, maxScore: 100 },
    ],
  },
  {
    id: 'starter-3',
    name: 'Physics for Engineers',
    professor: 'Dr. Robert Chen',
    assessments: [
      { id: 'c1', name: 'Lab Experiment 1', weight: 20, score: 72, maxScore: 100 },
      { id: 'c2', name: 'Midterm Exam', weight: 35, score: 68, maxScore: 100 },
      { id: 'c3', name: 'Final Exam', weight: 45, score: 0, maxScore: 100 },
    ],
  },
]

export const storage = {
  getUsers() {
    try {
      const data = localStorage.getItem(USERS_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    } catch (e) {
      console.error('Failed to save users', e)
    }
  },

  getSession() {
    try {
      const data = localStorage.getItem(SESSION_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },

  setSession(user) {
    try {
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
    } catch (e) {
      console.error('Failed to set session', e)
    }
  },

  getSubjects(userId) {
    if (!userId) return []
    try {
      const key = `${SUBJECTS_KEY_PREFIX}${userId}`
      const data = localStorage.getItem(key)
      if (data) return JSON.parse(data)

      // Seed starter subjects for new users
      this.saveSubjects(userId, DEFAULT_STARTER_SUBJECTS)
      return DEFAULT_STARTER_SUBJECTS
    } catch {
      return []
    }
  },

  saveSubjects(userId, subjects) {
    if (!userId) return
    try {
      const key = `${SUBJECTS_KEY_PREFIX}${userId}`
      localStorage.setItem(key, JSON.stringify(subjects))
    } catch (e) {
      console.error('Failed to save subjects', e)
    }
  },

  saveSubject(userId, subject) {
    const list = this.getSubjects(userId)
    const cleanSubject = {
      ...subject,
      id: subject.id.startsWith('draft-') ? `sub-${Date.now()}` : subject.id,
      isDraft: false,
    }

    const index = list.findIndex((item) => item.id === subject.id || item.id === cleanSubject.id)
    if (index >= 0) {
      list[index] = cleanSubject
    } else {
      list.push(cleanSubject)
    }

    this.saveSubjects(userId, list)
    return cleanSubject
  },

  deleteSubject(userId, subjectId) {
    const list = this.getSubjects(userId).filter((item) => item.id !== subjectId)
    this.saveSubjects(userId, list)
    return list
  },

  // Study planner tasks and academic goals live beside subjects, isolated per user.
  getTasks(userId) {
    return readList(`${TASKS_KEY_PREFIX}${userId}`, userId)
  },

  saveTasks(userId, tasks) {
    writeList(`${TASKS_KEY_PREFIX}${userId}`, userId, tasks, 'tasks')
  },

  getGoals(userId) {
    return readList(`${GOALS_KEY_PREFIX}${userId}`, userId)
  },

  saveGoals(userId, goals) {
    writeList(`${GOALS_KEY_PREFIX}${userId}`, userId, goals, 'goals')
  },
}

function readList(key, userId) {
  if (!userId) return []
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(key, userId, list, label) {
  if (!userId) return
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch (e) {
    console.error(`Failed to save ${label}`, e)
    throw new Error(`Unable to save ${label}. Your browser storage may be full or disabled.`)
  }
}
