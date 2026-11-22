/**
 * Risk Analysis View Component
 * Evaluates performance risk, score requirements to pass, and highlights high priority areas.
 */

import { icons } from '../icons.js'
import { percent, riskBadgeClass } from '../calculations.js'
import { renderEmptyState } from './dashboardView.js'

export function renderRiskView({ analyzed }) {
  if (!analyzed.length) {
    return renderEmptyState({
      title: 'Risk analysis needs your grades',
      copy: 'Add a subject and assessment results to see personalized attention recommendations.',
    })
  }

  const safeCount = analyzed.filter((item) => item.metrics.risk === 'Safe').length
  const atRiskCount = analyzed.filter((item) => item.metrics.risk === 'At risk').length
  const highRiskCount = analyzed.filter((item) => item.metrics.risk === 'High risk').length

  const attention = [...analyzed]
    .filter((item) => item.metrics.risk !== 'Safe')
    .sort((a, b) => b.metrics.requiredToPass - a.metrics.requiredToPass)

  return `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      <!-- 3 Risk Counters -->
      <section class="risk-summary-grid">
        <div class="clay-card-soft risk-summary-card green">
          <div>
            <p style="font-size: 0.75rem; font-weight: 600; opacity: 0.65;">Safe</p>
            <p style="margin-top: 0.5rem; font-size: 2.25rem; font-weight: 700;">${safeCount}</p>
          </div>
          <div style="opacity: 0.55;">${icons.checkCircle2({ size: 28 })}</div>
        </div>

        <div class="clay-card-soft risk-summary-card amber">
          <div>
            <p style="font-size: 0.75rem; font-weight: 600; opacity: 0.65;">At risk</p>
            <p style="margin-top: 0.5rem; font-size: 2.25rem; font-weight: 700;">${atRiskCount}</p>
          </div>
          <div style="opacity: 0.55;">${icons.alertTriangle({ size: 28 })}</div>
        </div>

        <div class="clay-card-soft risk-summary-card coral">
          <div>
            <p style="font-size: 0.75rem; font-weight: 600; opacity: 0.65;">High risk</p>
            <p style="margin-top: 0.5rem; font-size: 2.25rem; font-weight: 700;">${highRiskCount}</p>
          </div>
          <div style="opacity: 0.55;">${icons.shieldAlert({ size: 28 })}</div>
        </div>
      </section>

      <!-- Priority Review Section -->
      <section class="clay-card" style="border-radius: 28px; padding: 1.5rem sm:padding: 2rem;">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem;">
          <div>
            <p style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--clay-coral-accent);">
              Priority list
            </p>
            <h2 style="margin-top: 0.5rem; font-size: 1.5rem; font-weight: 700;">Subjects Requiring Attention</h2>
            <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #758295;">
              Focus first on subjects that need the highest remaining score.
            </p>
          </div>
          <div class="clay-inset" style="border-radius: 1rem; background-color: #eee5d8; padding: 0.75rem 1rem; text-align: center;">
            <p style="font-size: 1.5rem; font-weight: 700;">${attention.length}</p>
            <p style="font-size: 0.625rem; color: #7d8998;">to review</p>
          </div>
        </div>

        <div style="margin-top: 1.75rem; display: grid; gap: 1rem;">
          ${attention
            .map(
              ({ subject, metrics }) => `
            <article class="clay-card-soft attention-card">
              <div>
                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
                  <h3 style="font-weight: 700;">${subject.name || 'Untitled subject'}</h3>
                  <span class="${riskBadgeClass(metrics.risk)}">
                    ${metrics.risk}
                  </span>
                </div>
                <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #7b8798;">${subject.professor || 'Professor not set'}</p>
                <div style="margin-top: 1rem; display: flex; flex-wrap: wrap; column-gap: 1.75rem; row-gap: 0.5rem; font-size: 0.75rem;">
                  <p>
                    <span style="color: #8993a1;">Predicted grade </span>
                    <strong style="margin-left: 0.25rem;">${metrics.grade}</strong>
                  </p>
                  <p>
                    <span style="color: #8993a1;">Weight remaining </span>
                    <strong style="margin-left: 0.25rem;">${percent(metrics.remainingWeight)}</strong>
                  </p>
                </div>
              </div>
              <div class="clay-dark" style="min-width: 12rem; border-radius: 1rem; padding: 1rem 1.25rem;">
                <p style="font-size: 0.625rem; font-weight: 500; color: rgba(255, 255, 255, 0.45);">Score needed to pass</p>
                <p style="margin-top: 0.25rem; font-size: 1.5rem; font-weight: 700; color: #ff9a86;">
                  ${metrics.bestPossible < 75 ? 'Not possible' : percent(metrics.requiredToPass)}
                </p>
                <p style="margin-top: 0.25rem; font-size: 0.625rem; color: rgba(255, 255, 255, 0.35);">on remaining assessments</p>
              </div>
            </article>
          `,
            )
            .join('')}

          ${
            !attention.length
              ? `
            <div style="border-radius: 1rem; background-color: #dceee5; padding: 1.75rem; text-align: center; color: #287354;">
              <div style="margin: 0 auto; display: grid; place-items: center;">${icons.checkCircle2({ size: 28 })}</div>
              <h3 style="margin-top: 0.75rem; font-weight: 700;">All subjects are on track</h3>
              <p style="margin-top: 0.25rem; font-size: 0.75rem; opacity: 0.7;">Keep up your current performance.</p>
            </div>
          `
              : ''
          }
        </div>
      </section>
    </div>
  `
}
