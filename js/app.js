/**
 * CalCalculator - Vanilla Application Orchestrator
 * Bootstraps the application, mounts views, handles DOM event delegation, and manages state reactivity.
 */

import { icons } from './icons.js'
import { auth, validateSubjectData } from './auth.js'
import { storage } from './storage.js'
import { store } from './state.js'
import { getMetrics, emptySubject, buildInsights } from './calculations.js'

import { renderAuthView } from './views/authView.js'
import { renderDashboardView } from './views/dashboardView.js'
import { renderSubjectsView } from './views/subjectsView.js'
import { renderPredictorView } from './views/predictorView.js'
import { renderRiskView } from './views/riskView.js'
import { renderPlannerView, bindPlannerEvents, plannerUI } from './views/plannerView.js'
import { renderGoalsView, bindGoalEvents, goalsUI } from './views/goalsView.js'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layoutDashboard' },
  { id: 'subjects', label: 'Subject Details', icon: 'bookOpen' },
  { id: 'predictor', label: 'Grade Predictor', icon: 'barChart3' },
  { id: 'risk', label: 'At Risk', icon: 'shieldAlert' },
  { id: 'planner', label: 'Study Planner', icon: 'calendarDays' },
  { id: 'goals', label: 'Goal Tracker', icon: 'target' },
]

// Ephemeral UI state for the auth view
let authUIState = {
  mode: 'login',
  email: '',
  password: '',
  showPassword: false,
  loading: false,
  error: '',
  forgotOpen: false,
}

const appElement = document.getElementById('app')

/**
 * The whole UI is re-rendered through innerHTML on every state change, which would
 * normally drop keyboard focus mid-typing. Remember the focused field and restore it.
 */
function captureFocus() {
  const el = document.activeElement
  if (!el || el === document.body || !appElement.contains(el)) return null
  const row = el.closest('tr[data-assessment-index]')
  const key = el.id
    ? `#${el.id}`
    : row && el.dataset.field
      ? `tr[data-assessment-index="${row.dataset.assessmentIndex}"] [data-field="${el.dataset.field}"]`
      : el.name && el.closest('form')
        ? `form#${el.closest('form').id} [name="${el.name}"]`
        : null
  if (!key) return null
  let start = null
  let end = null
  try {
    start = el.selectionStart
    end = el.selectionEnd
  } catch {
    // number/date inputs do not expose a text selection
  }
  return { key, start, end }
}

function restoreFocus(saved) {
  if (!saved) return
  const el = appElement.querySelector(saved.key)
  if (!el || el === document.activeElement) return
  el.focus({ preventScroll: true })
  if (saved.start !== null) {
    try {
      el.setSelectionRange(saved.start, saved.end)
    } catch {
      // ignore inputs without selection support
    }
  }
}

function render() {
  const focusState = captureFocus()
  renderApp()
  restoreFocus(focusState)
}

function renderApp() {
  if (!store.currentUser) {
    appElement.innerHTML = renderAuthView(authUIState)
    bindAuthEvents()
    return
  }

  // Calculate analytics for authenticated user
  const analyzed = store.subjects
    .filter((s) => !s.isDraft)
    .map((subject) => ({ subject, metrics: getMetrics(subject) }))

  const insights = buildInsights(analyzed)

  const atRiskCount = analyzed.filter((item) => item.metrics.risk !== 'Safe').length
  const currentNav = navItems.find((item) => item.id === store.activeTab) || navItems[0]

  appElement.innerHTML = `
    <div class="clay-app app-container">
      <!-- Mobile Sidebar Backdrop -->
      ${store.sidebarOpen ? '<div id="sidebar-backdrop" class="sidebar-backdrop"></div>' : ''}

      <!-- Sidebar -->
      <aside class="app-sidebar ${store.sidebarOpen ? 'open' : ''}">
        <div class="sidebar-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="clay-icon" style="width: 2.5rem; height: 2.5rem; border-radius: 1rem; background-color: var(--clay-coral); color: #ffffff;">
              ${icons.calculator({ size: 21 })}
            </div>
            <div>
              <p style="font-weight: 700; letter-spacing: -0.025em; color: #ffffff;">CalCalculator</p>
              <p style="font-size: 0.6875rem; color: rgba(255, 255, 255, 0.45);">Grade workspace</p>
            </div>
          </div>
          <button id="close-sidebar-btn" class="sidebar-close-btn" style="color: rgba(255, 255, 255, 0.7); display: grid; place-items: center;" aria-label="Close navigation">
            ${icons.x({ size: 20 })}
          </button>
        </div>

        <nav class="sidebar-nav">
          <p class="sidebar-section-title">Workspace</p>
          ${navItems
            .map(
              (item) => `
            <button
              class="nav-item ${store.activeTab === item.id ? 'active' : ''}"
              data-nav-tab="${item.id}"
              type="button"
            >
              ${icons[item.icon]({ size: 18 })}
              <span>${item.label}</span>
              ${store.activeTab === item.id ? `<span class="nav-chevron">${icons.chevronRight({ size: 17 })}</span>` : ''}
            </button>
          `,
            )
            .join('')}
        </nav>

        <div class="sidebar-user-card">
          <div class="sidebar-user-info">
            <div class="sidebar-user-avatar">
              ${icons.userRound({ size: 17 })}
            </div>
            <div style="min-width: 0;">
              <p style="font-size: 0.75rem; font-weight: 600; color: #ffffff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${store.currentUser.email || 'Student'}
              </p>
              <p style="margin-top: 0.125rem; font-size: 0.625rem; color: rgba(255, 255, 255, 0.38);">Student account</p>
            </div>
          </div>
          <button id="logout-btn" class="sidebar-logout-btn" type="button">
            ${icons.logOut({ size: 14 })}
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <!-- Main Workspace Area -->
      <main class="app-main">
        <header class="app-header">
          <div class="app-header-left">
            <button id="open-sidebar-btn" class="mobile-menu-btn" aria-label="Open navigation">
              ${icons.menu({ size: 20 })}
            </button>
            <div>
              <h1 class="header-title">${currentNav.label}</h1>
              <p class="header-subtitle">
                ${store.activeTab === 'dashboard' ? 'A quick look at your academic progress' : ''}
                ${store.activeTab === 'subjects' ? 'Add assessments and keep every score up to date' : ''}
                ${store.activeTab === 'predictor' ? 'See how your current performance translates' : ''}
                ${store.activeTab === 'risk' ? 'Know which subjects need your attention' : ''}
                ${store.activeTab === 'planner' ? 'Schedule study sessions and keep track of deadlines' : ''}
                ${store.activeTab === 'goals' ? 'Set targets and watch your real grades close the gap' : ''}
              </p>
            </div>
          </div>
          <button id="header-add-subject-btn" class="clay-button app-header-add-btn" type="button">
            ${icons.plus({ size: 16 })}
            <span class="hide-on-mobile">Add subject</span>
          </button>
        </header>

        <div class="app-content-body">
          ${store.activeTab === 'dashboard' ? renderDashboardView({ analyzed, atRiskCount, insights, tasks: store.tasks, goals: store.goals, subjects: store.subjects }) : ''}
          ${
            store.activeTab === 'subjects'
              ? renderSubjectsView({
                  subjects: store.subjects,
                  selected: store.getSelectedSubject(),
                  selectedId: store.selectedId,
                  saving: store.saving,
                  notice: store.notice,
                  error: store.error,
                })
              : ''
          }
          ${store.activeTab === 'predictor' ? renderPredictorView({ analyzed, selectedId: store.selectedId }) : ''}
          ${store.activeTab === 'risk' ? renderRiskView({ analyzed }) : ''}
          ${store.activeTab === 'planner' ? renderPlannerView({ tasks: store.tasks, subjects: store.subjects }) : ''}
          ${store.activeTab === 'goals' ? renderGoalsView({ goals: store.goals, analyzed, insights, subjects: store.subjects }) : ''}
        </div>
      </main>
    </div>
  `

  bindAppEvents()
}

// -----------------------------------------------------------------------------
// Event Bindings for Authentication
// -----------------------------------------------------------------------------

function bindAuthEvents() {
  const form = document.getElementById('auth-form')
  const emailInput = document.getElementById('auth-email')
  const passwordInput = document.getElementById('auth-password')
  const toggleBtn = document.getElementById('toggle-password-btn')
  const switchBtn = document.getElementById('switch-mode-btn')
  const openForgotBtn = document.getElementById('open-forgot-btn')
  const closeForgotBtn = document.getElementById('close-forgot-btn')
  const forgotModal = document.getElementById('forgot-modal-backdrop')

  if (emailInput) {
    emailInput.addEventListener('input', (e) => {
      authUIState.email = e.target.value
    })
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      authUIState.password = e.target.value
    })
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      authUIState.showPassword = !authUIState.showPassword
      render()
    })
  }

  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      authUIState.mode = authUIState.mode === 'login' ? 'signup' : 'login'
      authUIState.error = ''
      render()
    })
  }

  if (openForgotBtn) {
    openForgotBtn.addEventListener('click', () => {
      authUIState.forgotOpen = true
      render()
    })
  }

  if (closeForgotBtn) {
    closeForgotBtn.addEventListener('click', () => {
      authUIState.forgotOpen = false
      render()
    })
  }

  if (forgotModal) {
    forgotModal.addEventListener('mousedown', (e) => {
      if (e.target === forgotModal) {
        authUIState.forgotOpen = false
        render()
      }
    })
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      authUIState.loading = true
      authUIState.error = ''
      render()

      setTimeout(() => {
        const result =
          authUIState.mode === 'login'
            ? auth.login(authUIState.email, authUIState.password)
            : auth.signUp(authUIState.email, authUIState.password)

        if (result.error) {
          authUIState.loading = false
          authUIState.error = result.error
          render()
        } else {
          authUIState.loading = false
          authUIState.error = ''
          store.setUser(result.user)
        }
      }, 200)
    })
  }
}

// -----------------------------------------------------------------------------
// Event Bindings for Main Application Shell & Views
// -----------------------------------------------------------------------------

function refreshWeightBadge() {
  const badge = document.getElementById('total-weight-badge')
  const selected = store.getSelectedSubject()
  if (!badge || !selected) return
  const total = (selected.assessments || []).reduce((sum, a) => sum + (Number(a.weight) || 0), 0)
  badge.textContent = `Total weight: ${total.toFixed(1)}%`
  badge.style.backgroundColor = total > 100 ? '#fbe0da' : '#e8e2d8'
  badge.style.color = total > 100 ? '#b14a39' : '#52657c'
}

function bindAppEvents() {
  // Mobile Sidebar Drawer
  const openSidebarBtn = document.getElementById('open-sidebar-btn')
  const closeSidebarBtn = document.getElementById('close-sidebar-btn')
  const sidebarBackdrop = document.getElementById('sidebar-backdrop')

  if (openSidebarBtn) {
    openSidebarBtn.addEventListener('click', () => store.setSidebarOpen(true))
  }
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => store.setSidebarOpen(false))
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => store.setSidebarOpen(false))
  }

  // Navigation Items
  document.querySelectorAll('[data-nav-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-nav-tab')
      store.setTab(tab)
    })
  })

  // Sign out
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.logout()
      plannerUI.form = null
      goalsUI.form = null
      store.setUser(null)
    })
  }

  // Add Subject Action (Header & Empty states)
  const headerAddBtn = document.getElementById('header-add-subject-btn')
  const emptyStateAddBtn = document.getElementById('empty-state-add-btn')
  const sidebarAddBtn = document.getElementById('add-subject-sidebar-btn')

  const triggerAddSubject = () => {
    const newSubject = emptySubject(store.subjects.length + 1)
    store.addSubject(newSubject)
  }

  if (headerAddBtn) headerAddBtn.addEventListener('click', triggerAddSubject)
  if (emptyStateAddBtn) emptyStateAddBtn.addEventListener('click', triggerAddSubject)
  if (sidebarAddBtn) sidebarAddBtn.addEventListener('click', triggerAddSubject)

  // Dashboard Specific Links
  const viewPredBtn = document.getElementById('dashboard-view-predictions-btn')
  const manageSubBtn = document.getElementById('dashboard-manage-subjects-btn')
  if (viewPredBtn) viewPredBtn.addEventListener('click', () => store.setTab('predictor'))
  if (manageSubBtn) manageSubBtn.addEventListener('click', () => store.setTab('subjects'))

  // Generic "go to tab" links used by the dashboard cards and empty states
  document.querySelectorAll('[data-go-tab]').forEach((btn) => {
    btn.addEventListener('click', () => store.setTab(btn.getAttribute('data-go-tab')))
  })

  // Study planner and goal tracker
  if (store.activeTab === 'planner') bindPlannerEvents(store)
  if (store.activeTab === 'goals') bindGoalEvents(store)

  // Subject Selection in Sidebar Column
  document.querySelectorAll('[data-subject-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-subject-id')
      store.setSelectedId(id)
    })
  })

  // Subject Basic Info Inputs
  const nameInput = document.getElementById('subject-name-input')
  const profInput = document.getElementById('subject-professor-input')

  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      store.updateSelectedSubject({ name: e.target.value }, { silent: true })
      const label = document.querySelector('.subject-tab-btn.active p')
      if (label) label.textContent = e.target.value || 'Untitled subject'
    })
  }

  if (profInput) {
    profInput.addEventListener('input', (e) => {
      store.updateSelectedSubject({ professor: e.target.value }, { silent: true })
    })
  }

  // Delete Subject Button
  const deleteBtn = document.getElementById('delete-subject-btn')
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this subject?')) {
        store.removeCurrentSubject()
      }
    })
  }

  // Assessment Row Modifications
  document.querySelectorAll('.assessment-field').forEach((input) => {
    input.addEventListener('input', (e) => {
      const row = e.target.closest('tr')
      const index = parseInt(row.getAttribute('data-assessment-index'), 10)
      const field = e.target.getAttribute('data-field')
      const value = field === 'name' ? e.target.value : Number(e.target.value)

      const selected = store.getSelectedSubject()
      if (!selected) return

      const assessments = selected.assessments.map((a, i) =>
        i === index ? { ...a, [field]: value } : a,
      )

      // Silent: do not re-render mid-typing (it moved the cursor and scrambled numbers)
      store.updateSelectedSubject({ assessments }, { silent: true })
      refreshWeightBadge()
    })

    // Select the existing value on focus so typing replaces the default 0
    if (input.type === 'number') {
      input.addEventListener('focus', () => {
        input.select()
        input.dataset.justFocused = '1'
      })
      // A mouse click would otherwise immediately clear the selection
      input.addEventListener('mouseup', (e) => {
        if (input.dataset.justFocused) {
          e.preventDefault()
          delete input.dataset.justFocused
        }
      })
    }
  })

  // Add Assessment Row
  const addAssessmentBtn = document.getElementById('add-assessment-row-btn')
  if (addAssessmentBtn) {
    addAssessmentBtn.addEventListener('click', () => {
      const selected = store.getSelectedSubject()
      if (!selected) return

      const assessments = [
        ...(selected.assessments || []),
        { name: '', weight: 0, score: 0, maxScore: 100 },
      ]
      store.updateSelectedSubject({ assessments })
    })
  }

  // Remove Assessment Row
  document.querySelectorAll('.remove-assessment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.getAttribute('data-index'), 10)
      const selected = store.getSelectedSubject()
      if (!selected) return

      const assessments = selected.assessments.filter((_, i) => i !== index)
      store.updateSelectedSubject({ assessments })
    })
  })

  // Save Subject
  const saveBtn = document.getElementById('save-subject-btn')
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const selected = store.getSelectedSubject()
      if (!selected) return

      const validated = validateSubjectData(selected)
      if (validated.error) {
        store.setFeedback('', validated.error)
        return
      }

      store.setSaving(true)
      setTimeout(() => {
        try {
          const saved = storage.saveSubject(store.currentUser.id, {
            ...selected,
            ...validated.data,
          })
          store.replaceSubject(saved)
          store.setSaving(false)
          store.setFeedback('Subject saved successfully.', '')
        } catch (err) {
          store.setSaving(false)
          store.setFeedback('', err.message || 'Unable to save subject.')
        }
      }, 250)
    })
  }

  // Predictor Subject Dropdown
  const predictorSelect = document.getElementById('predictor-subject-select')
  if (predictorSelect) {
    predictorSelect.addEventListener('change', (e) => {
      store.setSelectedId(e.target.value)
    })
  }
}

// Escape closes any open planner/goal dialog
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (plannerUI.form || goalsUI.form) {
    plannerUI.form = null
    goalsUI.form = null
    store.notify()
  }
})

// Overdue status depends on the clock, so refresh time-sensitive views once a minute
setInterval(() => {
  const timeSensitive = store.activeTab === 'planner' || store.activeTab === 'dashboard'
  if (store.currentUser && timeSensitive && !plannerUI.form) store.notify()
}, 60000)

// Subscribe orchestrator to store updates
store.subscribe(() => {
  render()
})

// Initial application launch
render()
