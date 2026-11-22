/**
 * AuthScreen View Component
 * Renders the full login / signup experience, password toggle, and password recovery modal.
 */

import { icons } from '../icons.js'

export function renderAuthView({ mode = 'login', email = '', password = '', showPassword = false, error = '', loading = false, forgotOpen = false }) {
  return `
    <main class="auth-wrapper">
      <div class="clay-shell auth-shell">
        <!-- Left Hero Section (Desktop) -->
        <section class="auth-hero">
          <div class="auth-hero-circle-1"></div>
          <div class="auth-hero-circle-2"></div>
          <div class="auth-hero-glow"></div>

          <div style="position: relative; display: flex; align-items: center; gap: 0.75rem;">
            <div class="clay-icon" style="width: 2.75rem; height: 2.75rem; border-radius: 1rem; background-color: var(--clay-coral); color: #ffffff;">
              ${icons.calculator({ size: 23, strokeWidth: 2.4 })}
            </div>
            <div>
              <p style="font-size: 1.25rem; font-weight: 700; letter-spacing: -0.025em; color: #ffffff;">CalCalculator</p>
              <p style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.55);">Grade clarity, made simple.</p>
            </div>
          </div>

          <div style="position: relative; margin: auto 0; max-width: 36rem; padding: 4rem 0;">
            <div class="auth-hero-badge">
              ${icons.sparkles({ size: 14 })}
              <span>Your academic command center</span>
            </div>
            <h1 class="auth-hero-title">
              Know your grades.
              <span>Own your outcome.</span>
            </h1>
            <p class="auth-hero-subtext">
              Track every assessment, predict your final standing, and see where your attention matters most.
            </p>

            <div class="auth-feature-grid">
              <div class="auth-feature-card">
                ${icons.bookOpen({ size: 20 })}
                <p>Track subjects</p>
              </div>
              <div class="auth-feature-card">
                ${icons.barChart3({ size: 20 })}
                <p>Predict grades</p>
              </div>
              <div class="auth-feature-card">
                ${icons.shieldCheck({ size: 20 })}
                <p>Spot risks</p>
              </div>
            </div>
          </div>

          <p style="position: relative; font-size: 0.75rem; color: rgba(255, 255, 255, 0.35);">
            Designed for focused, confident progress.
          </p>
        </section>

        <!-- Right Form Section -->
        <section class="auth-form-section">
          <div class="auth-form-card">
            <!-- Mobile Logo Header -->
            <div class="auth-mobile-header">
              <div class="clay-icon" style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: var(--clay-coral); color: #ffffff;">
                ${icons.calculator({ size: 21 })}
              </div>
              <span style="font-size: 1.25rem; font-weight: 700; color: var(--clay-navy);">CalCalculator</span>
            </div>

            <p class="auth-mode-label">
              ${mode === 'login' ? 'Welcome back' : 'Get started'}
            </p>
            <h2 class="auth-heading">
              ${mode === 'login' ? 'Sign in to continue' : 'Create your account'}
            </h2>
            <p class="auth-description">
              ${
                mode === 'login'
                  ? 'Your subjects, predictions, and progress are waiting.'
                  : 'Start building a clearer view of your academic progress.'
              }
            </p>

            <form id="auth-form" class="auth-form">
              <label>
                <span class="form-field-label">Email address</span>
                <span class="form-input-container">
                  <span class="form-input-icon">
                    ${icons.mail({ size: 18 })}
                  </span>
                  <input
                    id="auth-email"
                    class="clay-input form-input"
                    type="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    value="${email}"
                    required
                  />
                </span>
              </label>

              <label>
                <span class="form-field-label">Password</span>
                <span class="form-input-container">
                  <span class="form-input-icon">
                    ${icons.lockKeyhole({ size: 18 })}
                  </span>
                  <input
                    id="auth-password"
                    class="clay-input form-input has-toggle"
                    type="${showPassword ? 'text' : 'password'}"
                    autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"
                    placeholder="At least 8 characters"
                    value="${password}"
                    minlength="8"
                    required
                  />
                  <button
                    id="toggle-password-btn"
                    class="password-toggle-btn"
                    type="button"
                    aria-label="${showPassword ? 'Hide password' : 'Show password'}"
                  >
                    ${showPassword ? icons.eyeOff({ size: 18 }) : icons.eye({ size: 18 })}
                  </button>
                </span>
              </label>

              ${
                mode === 'login'
                  ? `
                <div style="display: flex; justify-content: flex-end;">
                  <button id="open-forgot-btn" class="forgot-password-link" type="button">
                    Forgot password?
                  </button>
                </div>
              `
                  : ''
              }

              ${
                error
                  ? `
                <div class="auth-error-banner">
                  ${error}
                </div>
              `
                  : ''
              }

              <button
                class="clay-button auth-submit-btn"
                type="submit"
                ${loading ? 'disabled' : ''}
              >
                ${loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                ${!loading ? icons.arrowRight({ size: 17 }) : ''}
              </button>
            </form>

            <div class="auth-divider">
              <span>or</span>
            </div>

            <button id="switch-mode-btn" class="clay-button-light auth-switch-btn" type="button">
              ${mode === 'login' ? 'Create a new account' : 'Already have an account? Sign in'}
            </button>

            <p style="margin-top: 2rem; text-align: center; font-size: 0.75rem; line-height: 1.25rem; color: #8a95a4;">
              By continuing, you agree to keep your account information secure.
            </p>
          </div>
        </section>
      </div>

      <!-- Forgot Password Modal -->
      ${
        forgotOpen
          ? `
        <div id="forgot-modal-backdrop" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="forgot-title">
          <div class="clay-card modal-card">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem;">
              <div class="clay-icon" style="width: 3rem; height: 3rem; border-radius: 1rem; background-color: rgba(244, 124, 103, 0.15); color: var(--clay-coral-accent);">
                ${icons.mail({ size: 22 })}
              </div>
              <button id="close-forgot-btn" style="display: grid; width: 2.25rem; height: 2.25rem; place-items: center; border-radius: 9999px; color: #6b788a;" aria-label="Close">
                ${icons.x({ size: 19 })}
              </button>
            </div>
            <h3 id="forgot-title" style="margin-top: 1.5rem; font-size: 1.5rem; font-weight: 600; color: var(--clay-navy);">
              Recover your password
            </h3>
            <p style="margin-top: 0.75rem; font-size: 0.875rem; line-height: 1.5rem; color: #657286;">
              Email the system administrator to recover your password. Include the email address connected to your account.
            </p>
            <a
              class="clay-button-light"
              style="margin-top: 1.5rem; display: flex; width: 100%; align-items: center; justify-content: space-between; border-radius: 1rem; border: 1px solid rgba(255, 255, 255, 0.8); background-color: #f6eee2; padding: 1rem; font-size: 0.875rem; font-weight: 600; color: var(--clay-navy); text-decoration: none;"
              href="mailto:gabrielmarktan@gmail.com?subject=CalCalculator%20password%20recovery"
            >
              <span>gabrielmarktan@gmail.com</span>
              <span style="color: var(--clay-coral); display: grid; place-items: center;">
                ${icons.arrowRight({ size: 17 })}
              </span>
            </a>
          </div>
        </div>
      `
          : ''
      }
    </main>
  `
}
