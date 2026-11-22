/**
 * Dashboard View Component
 * Personal academic dashboard: GWA, subject averages, semester progress,
 * highest/lowest subjects, improvement areas and an overall standing summary.
 * Every figure is derived from the student's own entered grades (see buildInsights).
 */

import { icons } from '../icons.js'
import { percent, riskBadgeClass, PASSING_PERCENT, evaluateSubjectGoal, evaluateGwaGoal } from '../calculations.js'
import { escapeHtml, dueTimestamp, formatTime, relativeDayLabel } from '../utils.js'

export function renderEmptyState({ title, copy, buttonText = 'Add your first subject', buttonId = 'empty-state-add-btn', buttonAttrs = '', icon = 'bookOpen' }) {
  return `
    <div class="clay-card empty-state">
      <div>
        <div class="empty-state-icon">
          ${icons[icon]({ size: 24 })}
        </div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-copy">${copy}</p>
        <button id="${buttonId}" ${buttonAttrs} class="clay-button empty-state-btn" type="button">
          ${icons.plus({ size: 16 })}
          <span>${buttonText}</span>
        </button>
      </div>
    </div>
  `
}

const gradeTone = (p) => (p >= 80 ? 'good' : p >= PASSING_PERCENT ? 'warn' : 'bad')

function standingSummary(insights, atRiskCount) {
  const { withData, total, gwa, standing, semesterProgress } = insights
  const parts = []
  parts.push(
    `Your current GWA is ${gwa.toFixed(2)} across ${withData.length} graded ${withData.length === 1 ? 'subject' : 'subjects'}${
      withData.length < total ? ` (${total - withData.length} still waiting for grades)` : ''
    }.`,
  )
  parts.push(`${Math.round(semesterProgress)}% of your semester coursework has been graded.`)
  if (insights.needsImprovement.length) {
    parts.push(
      `${insights.needsImprovement.length} ${insights.needsImprovement.length === 1 ? 'subject needs' : 'subjects need'} extra attention.`,
    )
  } else if (atRiskCount === 0) {
    parts.push('Every graded subject is currently on track.')
  }
  return parts.join(' ')
}

function renderSubjectAverages(analyzed) {
  return analyzed
    .map(({ subject, metrics }) => {
      const hasData = metrics.totalWeight > 0
      const avg = Math.min(100, Math.max(0, metrics.currentAverage))
      return `
        <div class="clay-inset snapshot-item">
          <div class="snapshot-letter">${escapeHtml((subject.name || 'S').charAt(0).toUpperCase())}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.875rem;">
              <span class="truncate" style="font-weight: 600;">${escapeHtml(subject.name || 'Untitled subject')}</span>
              <span style="font-weight: 700; white-space: nowrap;">
                ${hasData ? `${percent(metrics.currentAverage)} <span class="muted-small">· ${metrics.grade}</span>` : '<span class="muted-small">No grades yet</span>'}
              </span>
            </div>
            <div class="meter-wrap" style="margin-top: 0.5rem;">
              <div class="clay-progress meter">
                <div class="tone-${hasData ? gradeTone(avg) : 'none'}" style="width: ${hasData ? avg : 0}%;"></div>
              </div>
              <span class="meter-marker" style="left: ${PASSING_PERCENT}%;" title="Passing mark (${PASSING_PERCENT}%)"></span>
            </div>
          </div>
          ${hasData ? `<span class="${riskBadgeClass(metrics.risk)} hide-on-mobile">${metrics.risk}</span>` : ''}
        </div>`
    })
    .join('')
}

function renderDonut(value) {
  const r = 52
  const c = 2 * Math.PI * r
  const filled = (Math.min(100, Math.max(0, value)) / 100) * c
  return `
    <svg class="donut" viewBox="0 0 128 128" role="img" aria-label="${Math.round(value)} percent of coursework graded">
      <circle cx="64" cy="64" r="${r}" class="donut-track"></circle>
      <circle cx="64" cy="64" r="${r}" class="donut-fill" stroke-dasharray="${filled} ${c}" transform="rotate(-90 64 64)"></circle>
      <text x="64" y="62" text-anchor="middle" class="donut-value">${Math.round(value)}%</text>
      <text x="64" y="80" text-anchor="middle" class="donut-caption">graded</text>
    </svg>`
}

function renderHighlight(label, item, tone, icon) {
  if (!item) {
    return `
      <div class="clay-inset highlight-card">
        <p class="eyebrow">${label}</p>
        <p class="muted-small" style="margin-top: 0.5rem;">Add grades to at least two subjects to compare them.</p>
      </div>`
  }
  return `
    <div class="clay-inset highlight-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
        <p class="eyebrow">${label}</p>
        <span class="tone-text-${tone}">${icons[icon]({ size: 18 })}</span>
      </div>
      <p class="truncate" style="margin-top: 0.5rem; font-size: 1.0625rem; font-weight: 700;">${escapeHtml(item.subject.name || 'Untitled subject')}</p>
      <p style="margin-top: 0.25rem; font-size: 0.8125rem; color: #657286;">${percent(item.metrics.currentAverage)} · Grade ${item.metrics.grade}</p>
    </div>`
}

function renderNeedsImprovement(list) {
  if (!list.length) {
    return `
      <div class="all-clear">
        ${icons.checkCircle2({ size: 26 })}
        <p style="margin-top: 0.5rem; font-weight: 700;">Nothing needs urgent attention</p>
        <p style="margin-top: 0.25rem; font-size: 0.75rem; opacity: 0.75;">All graded subjects are on track.</p>
      </div>`
  }
  return list
    .map(({ subject, metrics }) => {
      const impossible = metrics.bestPossible < PASSING_PERCENT
      const need = impossible
        ? 'Passing is no longer reachable with the remaining work'
        : metrics.remainingWeight > 0
          ? `Needs ${percent(metrics.requiredToPass)} on the remaining ${percent(metrics.remainingWeight)} to pass`
          : 'All weight is graded; below the passing mark'
      return `
        <div class="clay-inset improve-item">
          <div style="min-width: 0;">
            <p class="truncate" style="font-weight: 700; font-size: 0.875rem;">${escapeHtml(subject.name || 'Untitled subject')}</p>
            <p style="margin-top: 0.125rem; font-size: 0.75rem; color: #7b8798;">${need}</p>
          </div>
          <span class="${riskBadgeClass(metrics.risk)}">${percent(metrics.currentAverage)}</span>
        </div>`
    })
    .join('')
}

function renderUpcoming(tasks, subjects) {
  const now = Date.now()
  const upcoming = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => dueTimestamp(a) - dueTimestamp(b))
  const overdue = upcoming.filter((t) => dueTimestamp(t) < now).length
  const next = upcoming.filter((t) => dueTimestamp(t) >= now).slice(0, 3)
  const nameOf = (id) => subjects.find((s) => s.id === id)?.name

  const rows = next.length
    ? next
        .map(
          (t) => `
        <div class="clay-inset improve-item">
          <div style="min-width: 0;">
            <p class="truncate" style="font-weight: 700; font-size: 0.875rem;">${escapeHtml(t.title)}</p>
            <p class="truncate" style="margin-top: 0.125rem; font-size: 0.75rem; color: #7b8798;">${escapeHtml(nameOf(t.subjectId) || 'No subject')} · ${relativeDayLabel(t.date)}${t.time ? ` ${formatTime(t.time)}` : ''}</p>
          </div>
        </div>`,
        )
        .join('')
    : `<p class="muted-small" style="margin-top: 0.75rem;">${tasks.length ? 'No upcoming tasks. Nice work!' : 'No tasks yet. Plan a study session or add a deadline.'}</p>`

  return `
    <div class="clay-card glance-card">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
        <h3 style="font-weight: 700;">Upcoming tasks</h3>
        <button class="link-btn" data-go-tab="planner" type="button">Open planner</button>
      </div>
      ${overdue ? `<p class="pill-overdue" style="margin-top: 0.75rem;">${overdue} overdue</p>` : ''}
      <div style="margin-top: 0.5rem;">${rows}</div>
    </div>`
}

function renderGoalGlance(goals, analyzed, insights) {
  let achieved = 0
  let ongoing = 0
  let behind = 0
  let waiting = 0
  for (const goal of goals) {
    const result =
      goal.type === 'gwa'
        ? evaluateGwaGoal(goal, insights)
        : evaluateSubjectGoal(goal, analyzed.find((a) => a.subject.id === goal.subjectId))
    if (result.status === 'achieved') achieved++
    else if (result.status === 'ongoing') ongoing++
    else if (result.status === 'behind') behind++
    else waiting++
  }
  return `
    <div class="clay-card glance-card">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
        <h3 style="font-weight: 700;">Goals</h3>
        <button class="link-btn" data-go-tab="goals" type="button">Open goal tracker</button>
      </div>
      ${
        goals.length
          ? `<div class="goal-glance-grid">
              <div class="clay-inset glance-stat tone-bg-good"><strong>${achieved}</strong><span>Achieved</span></div>
              <div class="clay-inset glance-stat tone-bg-warn"><strong>${ongoing}</strong><span>Ongoing</span></div>
              <div class="clay-inset glance-stat tone-bg-bad"><strong>${behind}</strong><span>Not yet</span></div>
            </div>
            ${waiting ? `<p class="muted-small" style="margin-top: 0.75rem;">${waiting} ${waiting === 1 ? 'goal is' : 'goals are'} waiting for grades.</p>` : ''}`
          : '<p class="muted-small" style="margin-top: 0.75rem;">You have not set any goals yet. Set a target GWA or a target grade for a subject.</p>'
      }
    </div>`
}

export function renderDashboardView({ analyzed, atRiskCount, insights, tasks = [], goals = [], subjects = [] }) {
  if (!analyzed.length) {
    return renderEmptyState({
      title: 'Your dashboard is ready',
      copy: 'Add a subject and its assessments to unlock grade predictions and risk insights.',
    })
  }

  if (!insights.withData.length) {
    return renderEmptyState({
      title: 'Add your first scores',
      copy: `You have ${analyzed.length} ${analyzed.length === 1 ? 'subject' : 'subjects'}, but no graded assessments yet. Enter assessments with their weights and scores to see your GWA, averages and progress.`,
      buttonText: 'Enter assessments',
      buttonId: 'empty-state-go-subjects-btn',
      buttonAttrs: 'data-go-tab="subjects"',
    })
  }

  const { gwa, average, best, worst, standing, semesterProgress, needsImprovement } = insights

  return `
    <div class="dashboard-container">
      <!-- Academic standing hero -->
      <section class="clay-dark dashboard-hero-card">
        <div class="dashboard-hero-circle-1"></div>
        <div class="dashboard-hero-circle-2"></div>
        <div class="hero-split">
          <div style="position: relative; max-width: 36rem;">
            <p style="font-size: 0.75rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #ffaa99;">Academic standing</p>
            <h2 style="margin-top: 0.75rem; font-size: clamp(1.625rem, 4vw, 2.25rem); font-weight: 600; letter-spacing: -0.04em; color: #ffffff;">${standing.label}</h2>
            <p style="margin-top: 0.75rem; font-size: 0.875rem; line-height: 1.5rem; color: rgba(255, 255, 255, 0.6);">${standingSummary(insights, atRiskCount)}</p>
            <button id="dashboard-view-predictions-btn" class="clay-button" style="margin-top: 1.5rem; border-radius: 0.75rem; background-color: var(--clay-coral); padding: 0.625rem 1rem; font-size: 0.75rem; font-weight: 700; color: #ffffff;" type="button">
              <span>View predictions</span>
              ${icons.chevronRight({ size: 15 })}
            </button>
          </div>
          <div class="hero-gwa">
            <p class="hero-gwa-label">Current GWA</p>
            <p class="hero-gwa-value">${gwa.toFixed(2)}</p>
            <p class="hero-gwa-note">1.00 is highest · 3.00 is passing</p>
          </div>
        </div>
      </section>

      <!-- Stat cards -->
      <section class="stat-cards-grid">
        <div class="clay-card-soft stat-card navy">
          <div class="stat-card-header">
            <div>
              <p style="font-size: 0.75rem; font-weight: 500; opacity: 0.6;">Subjects</p>
              <p class="stat-card-value">${analyzed.length}</p>
              <p style="margin-top: 0.25rem; font-size: 0.6875rem; opacity: 0.55;">${insights.withData.length} with grades</p>
            </div>
            <div style="opacity: 0.55;">${icons.bookOpen({ size: 20 })}</div>
          </div>
        </div>

        <div class="clay-card-soft stat-card coral">
          <div class="stat-card-header">
            <div>
              <p style="font-size: 0.75rem; font-weight: 500; opacity: 0.6;">Overall average</p>
              <p class="stat-card-value">${percent(average)}</p>
              <p style="margin-top: 0.25rem; font-size: 0.6875rem; opacity: 0.55;">Graded subjects only</p>
            </div>
            <div style="opacity: 0.55;">${icons.circleGauge({ size: 20 })}</div>
          </div>
        </div>

        <div class="clay-card-soft stat-card blue">
          <div class="stat-card-header">
            <div>
              <p style="font-size: 0.75rem; font-weight: 500; opacity: 0.6;">Semester progress</p>
              <p class="stat-card-value">${Math.round(semesterProgress)}%</p>
              <p style="margin-top: 0.25rem; font-size: 0.6875rem; opacity: 0.55;">Coursework graded</p>
            </div>
            <div style="opacity: 0.55;">${icons.trendingUp({ size: 20 })}</div>
          </div>
        </div>

        <div class="clay-card-soft stat-card gold">
          <div class="stat-card-header">
            <div>
              <p style="font-size: 0.75rem; font-weight: 500; opacity: 0.6;">Need attention</p>
              <p class="stat-card-value">${needsImprovement.length}</p>
              <p style="margin-top: 0.25rem; font-size: 0.6875rem; opacity: 0.55;">${needsImprovement.length > 0 ? 'Review recommended' : 'All on track'}</p>
            </div>
            <div style="opacity: 0.55;">${icons.alertTriangle({ size: 20 })}</div>
          </div>
        </div>
      </section>

      <!-- Subject averages + semester progress -->
      <section class="dashboard-lower-grid">
        <div class="clay-card" style="border-radius: 26px; padding: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h3 style="font-weight: 700;">Subject averages</h3>
              <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #7e8a9a;">Live from your subject details · line marks ${PASSING_PERCENT}% passing</p>
            </div>
            <button id="dashboard-manage-subjects-btn" class="link-btn" type="button">Manage</button>
          </div>
          <div style="margin-top: 1.25rem;">${renderSubjectAverages(analyzed)}</div>
        </div>

        <div class="clay-card" style="border-radius: 26px; padding: 1.5rem;">
          <h3 style="font-weight: 700;">Semester progress</h3>
          <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #7e8a9a;">Share of each subject's weight that has been graded</p>
          <div style="margin-top: 1rem; display: grid; place-items: center;">${renderDonut(semesterProgress)}</div>
          <div style="margin-top: 1rem;">
            ${analyzed
              .map(({ subject, metrics }) => {
                const done = Math.min(100, metrics.totalWeight)
                return `
                <div class="progress-row">
                  <div style="display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.75rem;">
                    <span class="truncate" style="font-weight: 600;">${escapeHtml(subject.name || 'Untitled subject')}</span>
                    <span style="font-weight: 700;">${Math.round(done)}%</span>
                  </div>
                  <div class="clay-progress meter" style="margin-top: 0.375rem;"><div class="tone-navy" style="width: ${done}%;"></div></div>
                </div>`
              })
              .join('')}
          </div>
        </div>
      </section>

      <!-- Highest / lowest + improvement -->
      <section class="dashboard-lower-grid">
        <div class="clay-card" style="border-radius: 26px; padding: 1.5rem;">
          <h3 style="font-weight: 700;">Highest and lowest grades</h3>
          <div class="highlight-grid">
            ${renderHighlight('Highest', best, 'good', 'trendingUp')}
            ${renderHighlight('Lowest', worst, 'bad', 'alertTriangle')}
          </div>
        </div>

        <div class="clay-card" style="border-radius: 26px; padding: 1.5rem;">
          <h3 style="font-weight: 700;">Needs improvement</h3>
          <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #7e8a9a;">Subjects at risk or below ${PASSING_PERCENT}%</p>
          <div style="margin-top: 0.75rem;">${renderNeedsImprovement(needsImprovement)}</div>
        </div>
      </section>

      <!-- Planner, goals and passing mark at a glance -->
      <section class="glance-grid">
        ${renderUpcoming(tasks, subjects)}
        ${renderGoalGlance(goals, analyzed, insights)}
        <div class="clay-card-soft" style="border-radius: 26px; background-color: #e9ddcb; padding: 1.5rem;">
          <div class="clay-icon" style="width: 2.75rem; height: 2.75rem; border-radius: 1rem; background-color: var(--clay-navy); color: #ffffff;">
            ${icons.target({ size: 20 })}
          </div>
          <h3 style="margin-top: 1.25rem; font-size: 1.25rem; font-weight: 700;">Grade goal</h3>
          <p style="margin-top: 0.5rem; font-size: 0.875rem; line-height: 1.5rem; color: #657286;">
            A passing grade starts at ${PASSING_PERCENT}%. Your predictor shows the exact score needed on remaining work.
          </p>
          <div class="clay-inset" style="margin-top: 1.25rem; border-radius: 1rem; background-color: #f5eddf; padding: 1rem 1.25rem;">
            <p style="font-size: 0.625rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #8a7964;">Passing mark</p>
            <p style="margin-top: 0.5rem; font-size: 2.25rem; font-weight: 600; letter-spacing: -0.025em;">${PASSING_PERCENT}%</p>
            <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #7a8796;">Equivalent to grade 3.00</p>
          </div>
        </div>
      </section>
    </div>
  `
}
