/**
 * Study Planner View
 * Add / edit / delete tasks tied to a subject, with deadlines, completion state,
 * overdue detection, and grouping by date or subject. Tasks persist per student.
 */

import { icons } from '../icons.js'
import {
  escapeHtml,
  uid,
  toDateString,
  isValidDateString,
  isValidTimeString,
  dueTimestamp,
  formatDate,
  formatTime,
  relativeDayLabel,
  daysFromToday,
} from '../utils.js'
import { renderEmptyState } from './dashboardView.js'

export const TASK_TYPES = [
  { id: 'study', label: 'Study session', deadline: false },
  { id: 'assignment', label: 'Assignment', deadline: true },
  { id: 'project', label: 'Project', deadline: true },
  { id: 'quiz', label: 'Quiz', deadline: true },
  { id: 'exam', label: 'Exam', deadline: true },
]

const FILTERS = [
  { id: 'todo', label: 'To do' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
]

// Ephemeral UI state (not persisted): current filter/grouping and the open form draft.
export const plannerUI = {
  filter: 'todo',
  groupBy: 'date',
  subjectFilter: 'all',
  form: null,
  focusForm: false,
}

const typeOf = (id) => TASK_TYPES.find((t) => t.id === id) || TASK_TYPES[0]

export function taskStatus(task, now = Date.now()) {
  if (task.completed) return 'completed'
  return dueTimestamp(task) < now ? 'overdue' : 'pending'
}

function emptyForm(subjects) {
  return {
    id: null,
    title: '',
    description: '',
    subjectId: subjects[0]?.id || '',
    type: 'study',
    date: toDateString(),
    time: '',
    error: '',
  }
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

function renderTaskCard(task, subjectName, now) {
  const status = taskStatus(task, now)
  const type = typeOf(task.type)
  const dayDiff = daysFromToday(task.date)
  let statusPill
  if (status === 'completed') {
    statusPill = `<span class="status-pill done">${icons.checkCircle2({ size: 12 })} Completed</span>`
  } else if (status === 'overdue') {
    const days = Math.abs(dayDiff)
    statusPill = `<span class="status-pill overdue">${icons.alertTriangle({ size: 12 })} ${days === 0 ? 'Overdue today' : `Overdue by ${days} ${days === 1 ? 'day' : 'days'}`}</span>`
  } else {
    statusPill = `<span class="status-pill pending">${icons.clock({ size: 12 })} ${type.deadline ? `Due ${relativeDayLabel(task.date).toLowerCase()}` : relativeDayLabel(task.date)}</span>`
  }

  return `
    <article class="clay-card-soft task-card ${status}" data-task-row="${escapeHtml(task.id)}">
      <button class="task-check ${status}" data-task-action="toggle" data-task-id="${escapeHtml(task.id)}" type="button"
        aria-label="${task.completed ? 'Mark as pending' : 'Mark as completed'}: ${escapeHtml(task.title)}" aria-pressed="${task.completed}">
        ${task.completed ? icons.checkCircle2({ size: 24 }) : icons.circle({ size: 24 })}
      </button>
      <div class="task-body">
        <div class="task-title-row">
          <h3 class="task-title ${task.completed ? 'is-done' : ''}">${escapeHtml(task.title)}</h3>
          <span class="type-chip ${type.deadline ? 'deadline' : 'study'}">${type.label}</span>
        </div>
        <p class="task-meta">
          <span>${escapeHtml(subjectName || 'No subject')}</span>
          <span>${icons.calendarDays({ size: 13 })} ${formatDate(task.date)}${task.time ? ` · ${formatTime(task.time)}` : ''}</span>
        </p>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <div style="margin-top: 0.5rem;">${statusPill}</div>
      </div>
      <div class="task-actions">
        <button class="action-icon-btn" data-task-action="edit" data-task-id="${escapeHtml(task.id)}" title="Edit task" aria-label="Edit ${escapeHtml(task.title)}" type="button">${icons.pencil({ size: 16 })}</button>
        <button class="action-icon-btn" data-task-action="delete" data-task-id="${escapeHtml(task.id)}" title="Delete task" aria-label="Delete ${escapeHtml(task.title)}" type="button">${icons.trash2({ size: 16 })}</button>
      </div>
    </article>`
}

function groupTasks(tasks, subjects, now) {
  const byDue = (a, b) => dueTimestamp(a) - dueTimestamp(b)

  if (plannerUI.groupBy === 'subject') {
    const groups = new Map()
    for (const task of [...tasks].sort(byDue)) {
      const key = subjects.some((s) => s.id === task.subjectId) ? task.subjectId : ''
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(task)
    }
    const nameOf = (id) => subjects.find((s) => s.id === id)?.name || 'No subject'
    return [...groups.entries()]
      .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : nameOf(a).localeCompare(nameOf(b))))
      .map(([id, items]) => ({ key: id, title: nameOf(id), tone: '', items }))
  }

  const overdue = []
  const dated = new Map()
  const done = []
  for (const task of [...tasks].sort(byDue)) {
    const status = taskStatus(task, now)
    if (status === 'overdue') overdue.push(task)
    else if (status === 'completed') done.push(task)
    else {
      if (!dated.has(task.date)) dated.set(task.date, [])
      dated.get(task.date).push(task)
    }
  }
  const groups = []
  if (overdue.length) groups.push({ key: 'overdue', title: 'Overdue', tone: 'overdue', items: overdue })
  for (const [date, items] of dated) {
    groups.push({ key: date, title: `${relativeDayLabel(date)} · ${formatDate(date)}`, tone: '', items })
  }
  if (done.length) groups.push({ key: 'done', title: 'Completed', tone: 'done', items: done.reverse() })
  return groups
}

function renderForm(form, subjects) {
  const editing = Boolean(form.id)
  const type = typeOf(form.type)
  return `
    <div id="task-modal-backdrop" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
      <div class="clay-card modal-card modal-wide">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div>
            <p class="eyebrow-coral">${editing ? 'Edit task' : 'New task'}</p>
            <h2 id="task-form-title" style="margin-top: 0.375rem; font-size: 1.375rem; font-weight: 700;">${editing ? 'Update your task' : 'Plan your study time'}</h2>
          </div>
          <button class="action-icon-btn" data-task-action="close-form" aria-label="Close" type="button">${icons.x({ size: 18 })}</button>
        </div>

        <form id="task-form" class="form-stack" novalidate>
          <label>
            <span class="field-label">Title</span>
            <input id="task-title-input" name="title" class="clay-input field-input" maxlength="100" placeholder="e.g. Review chapters 4–6" value="${escapeHtml(form.title)}" required />
          </label>

          <div class="form-row">
            <label>
              <span class="field-label">Subject</span>
              <select name="subjectId" class="clay-input field-input" required>
                ${subjects.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === form.subjectId ? 'selected' : ''}>${escapeHtml(s.name || 'Untitled subject')}</option>`).join('')}
              </select>
            </label>
            <label>
              <span class="field-label">Type</span>
              <select name="type" class="clay-input field-input">
                ${TASK_TYPES.map((t) => `<option value="${t.id}" ${t.id === form.type ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="form-row">
            <label>
              <span id="task-date-label" class="field-label">${type.deadline ? 'Due date' : 'Study date'}</span>
              <input name="date" type="date" class="clay-input field-input" value="${escapeHtml(form.date)}" required />
            </label>
            <label>
              <span id="task-time-label" class="field-label">${type.deadline ? 'Due time' : 'Study time'} <span class="muted-small">(optional)</span></span>
              <input name="time" type="time" class="clay-input field-input" value="${escapeHtml(form.time)}" />
            </label>
          </div>

          <label>
            <span class="field-label">Description <span class="muted-small">(optional)</span></span>
            <textarea name="description" class="clay-input field-input field-textarea" maxlength="500" rows="3" placeholder="What do you need to cover or hand in?">${escapeHtml(form.description)}</textarea>
          </label>

          ${form.error ? `<div class="notification-banner error" role="alert" style="margin-top: 0;">${escapeHtml(form.error)}</div>` : ''}

          <div class="form-actions">
            <button class="clay-button-light btn-secondary" data-task-action="close-form" type="button">Cancel</button>
            <button class="clay-button btn-primary" type="submit">${icons.save({ size: 16 })}<span>${editing ? 'Save changes' : 'Add task'}</span></button>
          </div>
        </form>
      </div>
    </div>`
}

export function renderPlannerView({ tasks, subjects }) {
  const saved = subjects.filter((s) => !s.isDraft)

  if (!saved.length) {
    return renderEmptyState({
      title: 'Add a subject to start planning',
      copy: 'Study tasks are organised by subject. Add your first subject, then come back to schedule study sessions and deadlines.',
    })
  }

  const now = Date.now()
  const nameOf = (id) => saved.find((s) => s.id === id)?.name || ''
  const scoped = tasks.filter(
    (t) => plannerUI.subjectFilter === 'all' || t.subjectId === plannerUI.subjectFilter,
  )

  const counts = {
    overdue: tasks.filter((t) => taskStatus(t, now) === 'overdue').length,
    today: tasks.filter((t) => !t.completed && t.date === toDateString()).length,
    week: tasks.filter((t) => {
      const d = daysFromToday(t.date)
      return !t.completed && d >= 0 && d <= 7
    }).length,
    done: tasks.filter((t) => t.completed).length,
  }

  const visible = scoped.filter((t) => {
    const s = taskStatus(t, now)
    if (plannerUI.filter === 'todo') return s !== 'completed'
    if (plannerUI.filter === 'overdue') return s === 'overdue'
    if (plannerUI.filter === 'completed') return s === 'completed'
    return true
  })
  const groups = groupTasks(visible, saved, now)

  const emptyCopy = !tasks.length
    ? 'No tasks yet. Add a study session or a deadline to get started.'
    : plannerUI.filter === 'overdue'
      ? 'Nothing is overdue. Great job staying on top of things.'
      : plannerUI.filter === 'completed'
        ? 'No completed tasks yet.'
        : 'No tasks match this view.'

  return `
    <div class="planner-container">
      <section class="planner-summary">
        <div class="clay-card-soft summary-tile bad"><span>${counts.overdue}</span><p>Overdue</p></div>
        <div class="clay-card-soft summary-tile warn"><span>${counts.today}</span><p>Due today</p></div>
        <div class="clay-card-soft summary-tile blue"><span>${counts.week}</span><p>Next 7 days</p></div>
        <div class="clay-card-soft summary-tile good"><span>${counts.done}</span><p>Completed</p></div>
      </section>

      <section class="clay-card planner-panel">
        <div class="toolbar">
          <div class="segmented" role="tablist" aria-label="Task filter">
            ${FILTERS.map((f) => `<button class="segment ${plannerUI.filter === f.id ? 'active' : ''}" data-task-filter="${f.id}" role="tab" aria-selected="${plannerUI.filter === f.id}" type="button">${f.label}${f.id === 'overdue' && counts.overdue ? ` <span class="count-dot">${counts.overdue}</span>` : ''}</button>`).join('')}
          </div>
          <div class="toolbar-right">
            <label class="inline-select">
              <span class="sr-only">Filter by subject</span>
              <select id="task-subject-filter" class="clay-input field-input compact">
                <option value="all">All subjects</option>
                ${saved.map((s) => `<option value="${escapeHtml(s.id)}" ${plannerUI.subjectFilter === s.id ? 'selected' : ''}>${escapeHtml(s.name || 'Untitled subject')}</option>`).join('')}
              </select>
            </label>
            <div class="segmented small" role="group" aria-label="Group tasks by">
              <button class="segment ${plannerUI.groupBy === 'date' ? 'active' : ''}" data-task-group="date" type="button">By date</button>
              <button class="segment ${plannerUI.groupBy === 'subject' ? 'active' : ''}" data-task-group="subject" type="button">By subject</button>
            </div>
            <button id="add-task-btn" class="clay-button btn-primary" type="button">${icons.plus({ size: 16 })}<span>Add task</span></button>
          </div>
        </div>

        <div class="task-groups">
          ${
            groups.length
              ? groups
                  .map(
                    (g) => `
            <div class="task-group">
              <h3 class="group-title ${g.tone}">${escapeHtml(g.title)} <span class="group-count">${g.items.length}</span></h3>
              ${g.items.map((t) => renderTaskCard(t, nameOf(t.subjectId), now)).join('')}
            </div>`,
                  )
                  .join('')
              : `<div class="planner-empty">${icons.calendarDays({ size: 28 })}<p>${emptyCopy}</p></div>`
          }
        </div>
      </section>
    </div>
    ${plannerUI.form ? renderForm(plannerUI.form, saved) : ''}
  `
}

// -----------------------------------------------------------------------------
// Behaviour
// -----------------------------------------------------------------------------

function validateTaskForm(form, subjects) {
  const title = form.title.trim()
  if (!title) return { error: 'Give your task a title.' }
  if (title.length > 100) return { error: 'Keep the title under 100 characters.' }
  if (!subjects.some((s) => s.id === form.subjectId)) return { error: 'Choose a subject for this task.' }
  if (!isValidDateString(form.date)) return { error: 'Choose a valid date.' }
  if (form.time && !isValidTimeString(form.time)) return { error: 'Choose a valid time.' }
  if (form.description.length > 500) return { error: 'Keep the description under 500 characters.' }
  return { ok: true }
}

export function bindPlannerEvents(store) {
  const saved = () => store.subjects.filter((s) => !s.isDraft)
  const rerender = () => store.notify()

  const addBtn = document.getElementById('add-task-btn')
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      plannerUI.form = emptyForm(saved())
      plannerUI.focusForm = true
      rerender()
    })
  }

  document.querySelectorAll('[data-task-filter]').forEach((btn) =>
    btn.addEventListener('click', () => {
      plannerUI.filter = btn.getAttribute('data-task-filter')
      rerender()
    }),
  )
  document.querySelectorAll('[data-task-group]').forEach((btn) =>
    btn.addEventListener('click', () => {
      plannerUI.groupBy = btn.getAttribute('data-task-group')
      rerender()
    }),
  )
  const subjectFilter = document.getElementById('task-subject-filter')
  if (subjectFilter) {
    subjectFilter.addEventListener('change', (e) => {
      plannerUI.subjectFilter = e.target.value
      rerender()
    })
  }

  document.querySelectorAll('[data-task-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-task-action')
      const id = btn.getAttribute('data-task-id')
      const task = store.tasks.find((t) => t.id === id)

      if (action === 'toggle' && task) {
        try {
          store.toggleTask(id)
        } catch (err) {
          store.setFeedback('', err.message)
        }
      } else if (action === 'edit' && task) {
        const subjectId = saved().some((s) => s.id === task.subjectId) ? task.subjectId : saved()[0]?.id || ''
        plannerUI.form = { ...task, subjectId, time: task.time || '', description: task.description || '', error: '' }
        plannerUI.focusForm = true
        rerender()
      } else if (action === 'delete' && task) {
        if (confirm(`Delete "${task.title}"? This cannot be undone.`)) store.deleteTask(id)
      } else if (action === 'close-form') {
        plannerUI.form = null
        rerender()
      }
    })
  })

  // ---- Form -----------------------------------------------------------------
  const form = document.getElementById('task-form')
  const backdrop = document.getElementById('task-modal-backdrop')
  if (backdrop) {
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) {
        plannerUI.form = null
        rerender()
      }
    })
  }
  if (form && plannerUI.form) {
    // Typing updates the draft only; no re-render, so focus is never lost.
    form.addEventListener('input', (e) => {
      const { name, value } = e.target
      if (name) plannerUI.form[name] = value
    })
    form.addEventListener('change', (e) => {
      if (e.target.name !== 'type') return
      plannerUI.form.type = e.target.value
      const deadline = typeOf(e.target.value).deadline
      document.getElementById('task-date-label').textContent = deadline ? 'Due date' : 'Study date'
      document.getElementById('task-time-label').firstChild.textContent = deadline ? 'Due time ' : 'Study time '
    })
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const draft = plannerUI.form
      const check = validateTaskForm(draft, saved())
      if (check.error) {
        draft.error = check.error
        rerender()
        return
      }
      const existing = store.tasks.find((t) => t.id === draft.id)
      const task = {
        id: draft.id || uid('task'),
        title: draft.title.trim(),
        description: draft.description.trim(),
        subjectId: draft.subjectId,
        type: draft.type,
        date: draft.date,
        time: draft.time || '',
        completed: existing ? existing.completed : false,
        completedAt: existing ? existing.completedAt || null : null,
        createdAt: existing ? existing.createdAt : Date.now(),
      }
      try {
        store.saveTask(task)
        plannerUI.form = null
        rerender()
      } catch (err) {
        draft.error = err.message
        rerender()
      }
    })

    if (plannerUI.focusForm) {
      plannerUI.focusForm = false
      document.getElementById('task-title-input')?.focus()
    }
  }
}
