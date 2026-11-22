/**
 * Goal Tracker View
 * Semester GWA target plus per-subject target grades, compared against the student's
 * real grades. Progress is only drawn when there is grade data to support it.
 */

import { icons } from '../icons.js'
import {
  gradeBands,
  percent,
  evaluateSubjectGoal,
  evaluateGwaGoal,
  GOAL_CLOSE_MARGIN_PERCENT,
} from '../calculations.js'
import { escapeHtml, uid } from '../utils.js'

// Targets from 1.00 up to the passing grade of 3.00.
const TARGET_BANDS = gradeBands.filter(([grade]) => Number(grade) <= 3)

export const goalsUI = { form: null, focusForm: false }

const STATUS_LABEL = {
  achieved: 'Achieved',
  ongoing: 'Ongoing',
  behind: 'Not yet achieved',
  nodata: 'Waiting for grades',
}
const STATUS_TONE = { achieved: 'good', ongoing: 'warn', behind: 'bad', nodata: 'none' }

function statusPill(status) {
  return `<span class="goal-pill ${STATUS_TONE[status]}">${STATUS_LABEL[status]}</span>`
}

function meter({ fill, marker, tone, label }) {
  return `
    <div class="meter-wrap" role="img" aria-label="${escapeHtml(label)}">
      <div class="clay-progress meter meter-lg"><div class="tone-${tone}" style="width: ${Math.min(100, Math.max(0, fill))}%;"></div></div>
      <span class="meter-marker" style="left: ${Math.min(100, Math.max(0, marker))}%;" title="Target"></span>
    </div>`
}

function noDataMeter(message) {
  return `
    <div class="no-data-meter">
      <div class="clay-progress meter meter-lg meter-empty"></div>
      <p class="muted-small" style="margin-top: 0.5rem;">${message}</p>
    </div>`
}

function cardActions(id) {
  return `
    <div class="task-actions">
      <button class="action-icon-btn" data-goal-action="edit" data-goal-id="${escapeHtml(id)}" title="Edit goal" aria-label="Edit goal" type="button">${icons.pencil({ size: 16 })}</button>
      <button class="action-icon-btn" data-goal-action="delete" data-goal-id="${escapeHtml(id)}" title="Delete goal" aria-label="Delete goal" type="button">${icons.trash2({ size: 16 })}</button>
    </div>`
}

function renderGwaGoal(goal, insights) {
  const r = evaluateGwaGoal(goal, insights)
  const target = Number(goal.target).toFixed(2)
  const toPos = (gp) => ((5 - gp) / 4) * 100 // 5.00 -> 0%, 1.00 -> 100%

  let body
  if (r.status === 'nodata') {
    body = noDataMeter('Enter scores in at least one subject to see your progress toward this target.')
  } else {
    const note =
      r.status === 'achieved'
        ? `Your GWA is ${r.gwa.toFixed(2)}, which meets your ${target} target.`
        : `You are ${r.gap.toFixed(2)} grade ${r.gap === 1 ? 'point' : 'points'} away from your ${target} target.`
    body = `
      ${meter({
        fill: toPos(r.gwa),
        marker: toPos(r.target),
        tone: STATUS_TONE[r.status],
        label: `GWA ${r.gwa.toFixed(2)} against target ${target}`,
      })}
      <div class="scale-labels"><span>5.00</span><span>Grade scale (lower is better)</span><span>1.00</span></div>
      <p class="goal-note">${note}${r.counted < r.total ? ` Based on ${r.counted} of ${r.total} subjects that have grades.` : ''}</p>
      ${
        r.status !== 'achieved' && r.dragging.length
          ? `<p class="goal-note"><strong>Pulling it down:</strong> ${r.dragging.map((d) => `${escapeHtml(d.subject.name || 'Untitled subject')} (${d.metrics.grade})`).join(', ')}</p>`
          : ''
      }`
  }

  return `
    <article class="clay-card goal-hero">
      <div class="goal-head">
        <div>
          <p class="eyebrow-coral">Semester target</p>
          <h3 style="margin-top: 0.375rem; font-size: 1.25rem; font-weight: 700;">Target GWA</h3>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">${statusPill(r.status)}${cardActions(goal.id)}</div>
      </div>
      <div class="compare">
        <div class="compare-box"><p>Current GWA</p><strong>${r.status === 'nodata' ? '—' : r.gwa.toFixed(2)}</strong></div>
        <div class="compare-arrow">${icons.chevronRight({ size: 20 })}</div>
        <div class="compare-box target"><p>Target GWA</p><strong>${target}</strong></div>
      </div>
      ${body}
    </article>`
}

function renderSubjectGoal(goal, item) {
  const r = evaluateSubjectGoal(goal, item)
  const name = item ? escapeHtml(item.subject.name || 'Untitled subject') : 'Unknown subject'
  const target = Number(goal.target).toFixed(2)
  let body

  if (r.status === 'nodata' || r.status === 'missing') {
    body = noDataMeter('No graded assessments yet. Enter scores in Subject Details to track this goal.')
  } else {
    let note
    if (r.status === 'achieved') {
      note =
        r.remainingWeight > 0
          ? `You are meeting this target. ${percent(r.remainingWeight)} of the grade is still to come, so keep it up.`
          : 'You met this target.'
    } else if (!r.reachable) {
      note = r.remainingWeight > 0
        ? `Even a perfect score on the remaining ${percent(r.remainingWeight)} would not reach ${target}.`
        : `All assessments are graded and your final grade is below ${target}.`
    } else {
      note = `You need about ${percent(r.requiredOnRemaining)} on the remaining ${percent(r.remainingWeight)} to reach ${target}.`
    }
    body = `
      ${meter({
        fill: r.current,
        marker: r.targetPercent,
        tone: STATUS_TONE[r.status],
        label: `Average ${percent(r.current)} against the ${percent(r.targetPercent)} needed for grade ${target}`,
      })}
      <div class="scale-labels"><span>Average ${percent(r.current)}</span><span>Target ≥ ${percent(r.targetPercent)}</span></div>
      <p class="goal-note">${note}</p>
      ${
        r.status === 'behind'
          ? `<p class="goal-note falling-behind">${icons.alertTriangle({ size: 14 })} Falling behind${r.gap > GOAL_CLOSE_MARGIN_PERCENT ? `: ${r.gap.toFixed(1)} points under target` : ''}</p>`
          : ''
      }`
  }

  return `
    <article class="clay-card-soft goal-card ${STATUS_TONE[r.status]}">
      <div class="goal-head">
        <div style="min-width: 0;">
          <h3 class="truncate" style="font-size: 1.0625rem; font-weight: 700;">${name}</h3>
          <div style="margin-top: 0.375rem;">${statusPill(r.status === 'missing' ? 'nodata' : r.status)}</div>
        </div>
        ${cardActions(goal.id)}
      </div>
      <div class="compare small">
        <div class="compare-box"><p>Current grade</p><strong>${r.status === 'nodata' || r.status === 'missing' ? '—' : r.currentGrade}</strong></div>
        <div class="compare-arrow">${icons.chevronRight({ size: 18 })}</div>
        <div class="compare-box target"><p>Target grade</p><strong>${target}</strong></div>
      </div>
      ${body}
    </article>`
}

function renderForm(form, subjects, goals) {
  const editing = Boolean(form.id)
  const isGwa = form.type === 'gwa'
  const takenIds = new Set(goals.filter((g) => g.type === 'subject' && g.id !== form.id).map((g) => g.subjectId))
  const available = subjects.filter((s) => !takenIds.has(s.id))
  const title = isGwa ? 'Target GWA' : 'Target grade'

  return `
    <div id="goal-modal-backdrop" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="goal-form-title">
      <div class="clay-card modal-card modal-wide">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div>
            <p class="eyebrow-coral">${editing ? 'Edit goal' : 'New goal'}</p>
            <h2 id="goal-form-title" style="margin-top: 0.375rem; font-size: 1.375rem; font-weight: 700;">${isGwa ? 'Set your semester GWA target' : 'Set a subject target'}</h2>
          </div>
          <button class="action-icon-btn" data-goal-action="close-form" aria-label="Close" type="button">${icons.x({ size: 18 })}</button>
        </div>

        <form id="goal-form" class="form-stack" novalidate>
          ${
            isGwa
              ? `<label>
                  <span class="field-label">${title}</span>
                  <input id="goal-target-input" name="target" type="number" min="1" max="5" step="0.01" class="clay-input field-input" value="${escapeHtml(form.target)}" placeholder="e.g. 1.75" required />
                  <span class="muted-small" style="display: block; margin-top: 0.375rem;">Use the 1.00–5.00 scale. 1.00 is the highest grade and 3.00 is passing.</span>
                </label>`
              : `<label>
                  <span class="field-label">Subject</span>
                  <select name="subjectId" class="clay-input field-input" ${editing ? 'disabled' : ''} required>
                    ${available.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === form.subjectId ? 'selected' : ''}>${escapeHtml(s.name || 'Untitled subject')}</option>`).join('')}
                  </select>
                </label>
                <label>
                  <span class="field-label">${title}</span>
                  <select id="goal-target-input" name="target" class="clay-input field-input" required>
                    ${TARGET_BANDS.map(([grade, range]) => `<option value="${grade}" ${Number(form.target) === Number(grade) ? 'selected' : ''}>${grade} (${range}%)</option>`).join('')}
                  </select>
                </label>`
          }

          ${form.error ? `<div class="notification-banner error" role="alert" style="margin-top: 0;">${escapeHtml(form.error)}</div>` : ''}

          <div class="form-actions">
            <button class="clay-button-light btn-secondary" data-goal-action="close-form" type="button">Cancel</button>
            <button class="clay-button btn-primary" type="submit">${icons.save({ size: 16 })}<span>${editing ? 'Save changes' : 'Save goal'}</span></button>
          </div>
        </form>
      </div>
    </div>`
}

export function renderGoalsView({ goals, analyzed, insights, subjects }) {
  const saved = subjects.filter((s) => !s.isDraft)
  const gwaGoal = goals.find((g) => g.type === 'gwa')
  const subjectGoals = goals.filter((g) => g.type === 'subject')
  const unusedSubjects = saved.filter((s) => !subjectGoals.some((g) => g.subjectId === s.id))

  const evaluated = [
    ...(gwaGoal ? [{ goal: gwaGoal, result: evaluateGwaGoal(gwaGoal, insights) }] : []),
    ...subjectGoals.map((goal) => ({
      goal,
      result: evaluateSubjectGoal(goal, analyzed.find((a) => a.subject.id === goal.subjectId)),
    })),
  ]
  const count = (s) => evaluated.filter((e) => e.result.status === s).length

  const behindSubjects = subjectGoals
    .map((goal) => ({ goal, item: analyzed.find((a) => a.subject.id === goal.subjectId) }))
    .filter(({ goal, item }) => evaluateSubjectGoal(goal, item).status === 'behind' && item)

  const toolbar = `
    <div class="goal-toolbar">
      <button id="add-gwa-goal-btn" class="clay-button-light btn-secondary" type="button" ${gwaGoal ? 'disabled title="You already have a GWA target. Edit it below."' : ''}>${icons.target({ size: 16 })}<span>Set target GWA</span></button>
      <button id="add-subject-goal-btn" class="clay-button btn-primary" type="button" ${unusedSubjects.length ? '' : 'disabled'} ${!saved.length ? 'title="Add a subject first"' : !unusedSubjects.length ? 'title="Every subject already has a goal"' : ''}>${icons.plus({ size: 16 })}<span>Add subject goal</span></button>
    </div>`

  const emptyAll = !goals.length
    ? `<div class="clay-card empty-state" style="min-height: 320px;">
        <div>
          <div class="empty-state-icon">${icons.target({ size: 24 })}</div>
          <h3 class="empty-state-title">Set your first academic goal</h3>
          <p class="empty-state-copy">Choose a target GWA for the semester or a target grade for a subject, and CalCalculator will track your progress from your real scores.${saved.length ? '' : ' Add a subject first to set subject targets.'}</p>
        </div>
      </div>`
    : ''

  return `
    <div class="goals-container">
      ${toolbar}
      ${
        goals.length
          ? `<section class="goal-summary">
              <div class="clay-card-soft summary-tile good"><span>${count('achieved')}</span><p>Achieved</p></div>
              <div class="clay-card-soft summary-tile warn"><span>${count('ongoing')}</span><p>Ongoing</p></div>
              <div class="clay-card-soft summary-tile bad"><span>${count('behind')}</span><p>Not yet achieved</p></div>
              <div class="clay-card-soft summary-tile blue"><span>${count('nodata')}</span><p>Waiting for grades</p></div>
            </section>`
          : ''
      }
      ${emptyAll}
      ${gwaGoal ? renderGwaGoal(gwaGoal, insights) : ''}
      ${
        behindSubjects.length
          ? `<section class="clay-card-soft behind-banner">
              <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <span class="tone-text-bad">${icons.alertTriangle({ size: 20 })}</span>
                <div>
                  <h3 style="font-weight: 700;">Falling behind your targets</h3>
                  <p style="margin-top: 0.25rem; font-size: 0.8125rem; color: #657286;">${behindSubjects.map(({ item }) => escapeHtml(item.subject.name || 'Untitled subject')).join(', ')}. A goal is marked not yet achieved when your average is more than ${GOAL_CLOSE_MARGIN_PERCENT} points under the target, or the target can no longer be reached.</p>
                </div>
              </div>
            </section>`
          : ''
      }
      ${
        subjectGoals.length
          ? `<section>
              <h3 class="section-title">Subject goals</h3>
              <div class="goal-grid">
                ${subjectGoals.map((g) => renderSubjectGoal(g, analyzed.find((a) => a.subject.id === g.subjectId))).join('')}
              </div>
            </section>`
          : ''
      }
    </div>
    ${goalsUI.form ? renderForm(goalsUI.form, saved, goals) : ''}
  `
}

export function bindGoalEvents(store) {
  const saved = () => store.subjects.filter((s) => !s.isDraft)
  const rerender = () => store.notify()
  const open = (form) => {
    goalsUI.form = { id: null, error: '', ...form }
    goalsUI.focusForm = true
    rerender()
  }

  document.getElementById('add-gwa-goal-btn')?.addEventListener('click', () => open({ type: 'gwa', subjectId: '', target: '' }))
  document.getElementById('add-subject-goal-btn')?.addEventListener('click', () => {
    const used = new Set(store.goals.filter((g) => g.type === 'subject').map((g) => g.subjectId))
    const first = saved().find((s) => !used.has(s.id))
    if (first) open({ type: 'subject', subjectId: first.id, target: '2.00' })
  })

  document.querySelectorAll('[data-goal-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-goal-action')
      const goal = store.goals.find((g) => g.id === btn.getAttribute('data-goal-id'))
      if (action === 'edit' && goal) {
        open({ id: goal.id, type: goal.type, subjectId: goal.subjectId || '', target: String(goal.target) })
      } else if (action === 'delete' && goal) {
        if (confirm('Delete this goal? Your grades will not be affected.')) store.deleteGoal(goal.id)
      } else if (action === 'close-form') {
        goalsUI.form = null
        rerender()
      }
    })
  })

  const backdrop = document.getElementById('goal-modal-backdrop')
  if (backdrop) {
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) {
        goalsUI.form = null
        rerender()
      }
    })
  }

  const form = document.getElementById('goal-form')
  if (form && goalsUI.form) {
    form.addEventListener('input', (e) => {
      if (e.target.name) goalsUI.form[e.target.name] = e.target.value
    })
    form.addEventListener('change', (e) => {
      if (e.target.name) goalsUI.form[e.target.name] = e.target.value
    })
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const draft = goalsUI.form
      const target = Number(draft.target)
      let error = ''
      if (draft.target === '' || !Number.isFinite(target)) error = 'Enter a target.'
      else if (draft.type === 'gwa' && (target < 1 || target > 5)) error = 'Target GWA must be between 1.00 and 5.00.'
      else if (draft.type === 'subject' && !saved().some((s) => s.id === draft.subjectId)) error = 'Choose a subject.'
      else if (
        draft.type === 'subject' &&
        store.goals.some((g) => g.type === 'subject' && g.subjectId === draft.subjectId && g.id !== draft.id)
      ) error = 'This subject already has a goal.'
      if (error) {
        draft.error = error
        rerender()
        return
      }

      const existing = store.goals.find((g) => g.id === draft.id)
      const goal = {
        id: draft.id || uid('goal'),
        type: draft.type,
        subjectId: draft.type === 'subject' ? draft.subjectId : '',
        target: draft.type === 'gwa' ? Math.round(target * 100) / 100 : target.toFixed(2),
        createdAt: existing ? existing.createdAt : Date.now(),
      }
      try {
        store.saveGoal(goal)
        goalsUI.form = null
        rerender()
      } catch (err) {
        draft.error = err.message
        rerender()
      }
    })

    if (goalsUI.focusForm) {
      goalsUI.focusForm = false
      document.getElementById('goal-target-input')?.focus()
    }
  }
}

