/**
 * Grade Predictor View Component
 * Provides live calculation metrics, breakdown progress bars, and institutional grading scale.
 */

import { icons } from '../icons.js'
import { percent, gradeBands } from '../calculations.js'
import { renderEmptyState } from './dashboardView.js'

export function renderPredictorView({ analyzed, selectedId }) {
  if (!analyzed.length) {
    return renderEmptyState({
      title: 'No grades to predict yet',
      copy: 'Save a subject with assessment scores, then return here for a complete prediction.',
    })
  }

  const current = analyzed.find((item) => item.subject.id === selectedId) || analyzed[0]

  return `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header with Subject Selector -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;">
        <div>
          <p style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--clay-coral-accent);">
            Live calculation
          </p>
          <h2 style="margin-top: 0.5rem; font-size: 1.875rem; font-weight: 700; letter-spacing: -0.025em;">
            ${current.subject.name || 'Untitled subject'}
          </h2>
          <p style="margin-top: 0.25rem; font-size: 0.875rem; color: #778497;">
            ${current.subject.professor || 'Professor not set'}
          </p>
        </div>
        <select id="predictor-subject-select" class="clay-input" style="height: 2.75rem; min-width: 13rem; border-radius: 0.75rem; padding: 0 1rem; font-size: 0.875rem; font-weight: 600;">
          ${analyzed
            .map(
              ({ subject }) => `
            <option value="${subject.id}" ${subject.id === current.subject.id ? 'selected' : ''}>
              ${subject.name || 'Untitled subject'}
            </option>
          `,
            )
            .join('')}
        </select>
      </div>

      <!-- 4 Prediction Cards -->
      <section class="prediction-cards-grid">
        <div class="clay-card-soft prediction-card navy">
          <p style="font-size: 0.75rem; font-weight: 600; opacity: 0.58;">Current average</p>
          <p style="margin-top: 1rem; font-size: 2.25rem; font-weight: 600; letter-spacing: -0.05em;">
            ${percent(current.metrics.currentAverage)}
          </p>
          <p style="margin-top: 0.5rem; font-size: 0.6875rem; opacity: 0.5;">Across completed work</p>
        </div>

        <div class="clay-card-soft prediction-card cream">
          <p style="font-size: 0.75rem; font-weight: 600; opacity: 0.58;">Total weight</p>
          <p style="margin-top: 1rem; font-size: 2.25rem; font-weight: 600; letter-spacing: -0.05em;">
            ${percent(current.metrics.totalWeight)}
          </p>
          <p style="margin-top: 0.5rem; font-size: 0.6875rem; opacity: 0.5;">${percent(current.metrics.remainingWeight)} remaining</p>
        </div>

        <div class="clay-card-soft prediction-card coral">
          <p style="font-size: 0.75rem; font-weight: 600; opacity: 0.58;">Best possible</p>
          <p style="margin-top: 1rem; font-size: 2.25rem; font-weight: 600; letter-spacing: -0.05em;">
            ${percent(current.metrics.bestPossible)}
          </p>
          <p style="margin-top: 0.5rem; font-size: 0.6875rem; opacity: 0.5;">If remaining scores are perfect</p>
        </div>

        <div class="clay-card-soft prediction-card blue">
          <p style="font-size: 0.75rem; font-weight: 600; opacity: 0.58;">Actual grade</p>
          <p style="margin-top: 1rem; font-size: 2.25rem; font-weight: 600; letter-spacing: -0.05em;">
            ${current.metrics.grade}
          </p>
          <p style="margin-top: 0.5rem; font-size: 0.6875rem; opacity: 0.5;">Based on your current average</p>
        </div>
      </section>

      <!-- Assessment Breakdown & Institutional Scale -->
      <section class="predictor-lower-grid">
        <div class="clay-card" style="border-radius: 28px; padding: 1.5rem;">
          <h3 style="font-weight: 700;">Assessment breakdown</h3>
          <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #7c899a;">
            Each score is adjusted by its contribution to the final grade.
          </p>

          <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            ${(current.subject.assessments || [])
              .map((a) => {
                const score = a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0
                return `
                <div>
                  <div style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 0.75rem;">
                    <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.name || 'Untitled item'}</span>
                    <span style="flex-shrink: 0; color: #718095;">${percent(score)} · ${a.weight}% weight</span>
                  </div>
                  <div class="clay-progress" style="height: 0.5rem; border-radius: 9999px; background-color: #e9e1d6;">
                    <div style="width: ${Math.min(100, Math.max(0, score))}%;"></div>
                  </div>
                </div>
              `
              })
              .join('')}

            ${
              !current.subject.assessments || !current.subject.assessments.length
                ? `
              <p style="margin-top: 1.5rem; border-radius: 1rem; background-color: #f1e9de; padding: 1.25rem; font-size: 0.875rem; color: #738094;">
                Add assessments in Subject Details to see the breakdown.
              </p>
            `
                : ''
            }
          </div>
        </div>

        <div class="clay-dark" style="border-radius: 28px; padding: 1.5rem; color: #ffffff;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="clay-icon" style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: rgba(255, 255, 255, 0.08); color: #ff9c89;">
              ${icons.calculator({ size: 18 })}
            </div>
            <div>
              <h3 style="font-weight: 700; color: #ffffff;">Grade equivalents</h3>
              <p style="font-size: 0.6875rem; color: rgba(255, 255, 255, 0.4);">Institutional grading scale</p>
            </div>
          </div>

          <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 1.25rem; row-gap: 0.25rem;">
            ${gradeBands
              .map(
                ([grade, range]) => `
              <div class="grade-scale-row ${current.metrics.grade === grade ? 'active' : ''}">
                <span>${grade}</span>
                <span style="font-size: 0.625rem; opacity: 0.65;">${range}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </section>
    </div>
  `
}
