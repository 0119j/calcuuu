/**
 * Authentication Management Module
 * Validates inputs, handles registration, login, and active user session.
 */

import { storage } from './storage.js'

export function validateCredentials({ email, password }) {
  if (!email || typeof email !== 'string') {
    return { error: 'Please enter your email address.' }
  }
  const cleanEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { error: 'Enter a valid email address.' }
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  return { email: cleanEmail, password }
}

export function validateSubjectData(subject) {
  if (!subject || typeof subject !== 'object') {
    return { error: 'Invalid subject details.' }
  }
  const name = typeof subject.name === 'string' ? subject.name.trim() : ''
  const professor = typeof subject.professor === 'string' ? subject.professor.trim() : ''
  const assessments = Array.isArray(subject.assessments) ? subject.assessments : []

  if (!name || name.length > 100) {
    return { error: 'Enter a subject name under 100 characters.' }
  }
  if (!professor || professor.length > 100) {
    return { error: 'Enter a professor name under 100 characters.' }
  }
  if (assessments.length > 50) {
    return { error: 'A subject can have up to 50 assessments.' }
  }

  const cleanAssessments = []
  for (const item of assessments) {
    const aName = typeof item.name === 'string' ? item.name.trim() : ''
    const weight = Number(item.weight)
    const score = Number(item.score)
    const maxScore = Number(item.maxScore)

    if (!aName || aName.length > 100) {
      return { error: 'Every assessment needs a name under 100 characters.' }
    }
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      return { error: 'Assessment weights must be between 0 and 100.' }
    }
    if (!Number.isFinite(score) || score < 0) {
      return { error: 'Scores cannot be negative.' }
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      return { error: 'Max scores must be greater than zero.' }
    }
    if (score > maxScore) {
      return { error: 'Your score cannot be greater than the max score.' }
    }

    cleanAssessments.push({
      id: item.id || `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: aName,
      weight,
      score,
      maxScore,
    })
  }

  const totalWeight = cleanAssessments.reduce((sum, a) => sum + a.weight, 0)
  if (totalWeight > 100.001) {
    return { error: 'Total assessment weight cannot exceed 100%.' }
  }

  return { data: { name, professor, assessments: cleanAssessments } }
}

export const auth = {
  getCurrentUser() {
    return storage.getSession()
  },

  login(email, password) {
    const validated = validateCredentials({ email, password })
    if (validated.error) return { error: validated.error }

    const users = storage.getUsers()
    const user = users.find(
      (u) => u.email === validated.email && u.password === validated.password,
    )

    if (!user) {
      // If user list is empty and demo credentials entered, allow convenience access
      if (users.length === 0) {
        const demoUser = {
          id: `usr-${Date.now()}`,
          email: validated.email,
          password: validated.password,
        }
        storage.saveUsers([demoUser])
        storage.setSession(demoUser)
        return { user: demoUser }
      }
      return { error: 'The email or password is incorrect.' }
    }

    storage.setSession(user)
    return { user }
  },

  signUp(email, password) {
    const validated = validateCredentials({ email, password })
    if (validated.error) return { error: validated.error }

    const users = storage.getUsers()
    if (users.some((u) => u.email === validated.email)) {
      return { error: 'An account with this email already exists.' }
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      email: validated.email,
      password: validated.password,
    }

    users.push(newUser)
    storage.saveUsers(users)
    storage.setSession(newUser)
    return { user: newUser }
  },

  logout() {
    storage.setSession(null)
  },
}
