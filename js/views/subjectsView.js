/**
 * Subject Details View Component
 * Renders subject master list, basic information inputs, and interactive assessments table.
 */

import { icons } from '../icons.js'
import { renderEmptyState } from './dashboardView.js'

export function renderSubjectsView({ subjects, selected, selectedId, saving, notice, error }) {
  if (!selected) {
    return renderEmptyState({
      title: 'Add your first subject',
      copy: 'Enter the subject, professor, and assessment scores to start calculating.',
    })
  }

  const totalWeight = (selected.assessments || []).reduce(
    (sum, a) => sum + (Number(a.weight) || 0),
    0,
  )

  return `
    <div class="subject-details-grid">
      <!-- Left Subjects List Column -->
      <aside class="clay-card subject-sidebar-card">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem;">
          <p style="font-size: 0.625rem; font-weight: 700; letter-spacing: 0.17em; text-transform: uppercase; color: #8490a0;">
            Your subjects
          </p>
          <span style="border-radius: 9999px; background-color: rgba(16, 42, 76, 0.08); padding: 0.125rem 0.5rem; font-size: 0.625rem; font-weight: 700;">
            ${subjects.length}
          </span>
        </div>

        <div class="subject-tabs-container">
          ${subjects
            .map(
              (subject) => `
            <button
              class="subject-tab-btn ${selectedId === subject.id ? 'active' : 'inactive'}"
              data-subject-id="${subject.id}"
              type="button"
            >
              <p style="font-size: 0.875rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${subject.name || 'Untitled subject'}
              </p>
              <p style="margin-top: 0.25rem; font-size: 0.625rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${selectedId === subject.id ? 'color: rgba(255, 255, 255, 0.45);' : 'color: #8490a0;'}">
                ${subject.professor || 'Professor not set'}
              </p>
            </button>
          `,
            )
            .join('')}
        </div>

        <button id="add-subject-sidebar-btn" class="clay-button-light" style="margin-top: 0.75rem; height: 2.75rem; width: 100%; border-radius: 0.75rem; border: 1px dashed rgba(255, 255, 255, 0.7); font-size: 0.75rem; font-weight: 700; color: #5c6d82;" type="button">
          ${icons.plus({ size: 15 })}
          <span>Add subject</span>
        </button>
      </aside>

      <!-- Right Subject Editor Section -->
      <section class="clay-card" style="border-radius: 28px; padding: 1.5rem; min-width: 0;">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem;">
          <div>
            <p style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--clay-coral-accent);">
              Subject setup
            </p>
            <h2 style="margin-top: 0.5rem; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em;">
              Basic information
            </h2>
          </div>
          <button id="delete-subject-btn" class="action-icon-btn" style="border: 1px solid #e3d8c9; color: #a34a3c; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem;" title="Delete subject" type="button">
            ${icons.trash2({ size: 17 })}
          </button>
        </div>

        <!-- Subject Name & Professor Fields -->
        <div style="margin-top: 1.75rem; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
          <label>
            <span style="margin-bottom: 0.5rem; display: block; font-size: 0.75rem; font-weight: 700; color: #42566f;">Subject name</span>
            <input
              id="subject-name-input"
              class="clay-input table-input"
              style="height: 3rem; border-radius: 0.75rem; padding: 0 1rem;"
              placeholder="e.g. Calculus II"
              value="${selected.name || ''}"
            />
          </label>
          <label>
            <span style="margin-bottom: 0.5rem; display: block; font-size: 0.75rem; font-weight: 700; color: #42566f;">Professor's name</span>
            <input
              id="subject-professor-input"
              class="clay-input table-input"
              style="height: 3rem; border-radius: 0.75rem; padding: 0 1rem;"
              placeholder="e.g. Prof. Maria Santos"
              value="${selected.professor || ''}"
            />
          </label>
        </div>

        <!-- Assessments Section Header -->
        <div style="margin-top: 2.25rem; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 0.75rem;">
          <div>
            <h3 style="font-weight: 700;">Assessments</h3>
            <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #7d8999;">Add every graded item for this subject.</p>
          </div>
          <div id="total-weight-badge" style="border-radius: 9999px; padding: 0.375rem 0.75rem; font-size: 0.75rem; font-weight: 700; ${
            totalWeight > 100 ? 'background-color: #fbe0da; color: #b14a39;' : 'background-color: #e8e2d8; color: #52657c;'
          }">
            Total weight: ${totalWeight.toFixed(1)}%
          </div>
        </div>

        <!-- Assessments Table -->
        <div class="clay-inset assessments-table-wrapper">
          <table class="assessments-table">
            <thead>
              <tr>
                <th style="width: 35%;">Enter Assessment</th>
                <th style="width: 20%;">Weight %</th>
                <th style="width: 20%;">Your Score</th>
                <th style="width: 20%;">Max Score</th>
                <th style="width: 5%;"></th>
              </tr>
            </thead>
            <tbody>
              ${(selected.assessments || [])
                .map(
                  (a, index) => `
                <tr data-assessment-index="${index}">
                  <td>
                    <input
                      class="clay-input table-input assessment-field"
                      data-field="name"
                      placeholder="Assessment name"
                      value="${a.name || ''}"
                    />
                  </td>
                  <td>
                    <input
                      class="clay-input table-input assessment-field"
                      data-field="weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value="${a.weight}"
                    />
                  </td>
                  <td>
                    <input
                      class="clay-input table-input assessment-field"
                      data-field="score"
                      type="number"
                      min="0"
                      step="0.01"
                      value="${a.score}"
                    />
                  </td>
                  <td>
                    <input
                      class="clay-input table-input assessment-field"
                      data-field="maxScore"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value="${a.maxScore}"
                    />
                  </td>
                  <td>
                    <button class="action-icon-btn remove-assessment-btn" data-index="${index}" title="Remove assessment" type="button">
                      ${icons.x({ size: 16 })}
                    </button>
                  </td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <button id="add-assessment-row-btn" class="clay-button-light" style="margin-top: 1rem; height: 2.5rem; border-radius: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.7); background-color: #f4ecdf; padding: 0 1rem; font-size: 0.75rem; font-weight: 700;" type="button">
          ${icons.plus({ size: 15 })}
          <span>Add assessment</span>
        </button>

        ${
          notice || error
            ? `
          <div class="notification-banner ${error ? 'error' : 'success'}">
            ${error || notice}
          </div>
        `
            : ''
        }

        <div style="margin-top: 1.75rem; display: flex; justify-content: flex-end;">
          <button id="save-subject-btn" class="clay-button" style="height: 2.75rem; border-radius: 0.75rem; background-color: var(--clay-navy); padding: 0 1.25rem; font-size: 0.875rem; font-weight: 700; color: #ffffff;" ${saving ? 'disabled' : ''} type="button">
            ${icons.save({ size: 16 })}
            <span>${saving ? 'Saving…' : 'Save subject'}</span>
          </button>
        </div>
      </section>
    </div>
  `
}
