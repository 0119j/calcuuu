/**
 * Academic Grade Calculation & Risk Analytics Engine
 * Exact mirror of calculation formulas used in the original CalCalculator app.
 */

export const gradeBands = [
  ['1.00', '98–100'],
  ['1.25', '94–97'],
  ['1.50', '90–93'],
  ['1.75', '88–89'],
  ['2.00', '85–87'],
  ['2.25', '83–84'],
  ['2.50', '80–82'],
  ['2.75', '78–79'],
  ['3.00', '75–77'],
  ['4.00', '70–74'],
  ['5.00', 'Below 70'],
]

export function gradeFromPercent(percent) {
  if (percent >= 98) return '1.00'
  if (percent >= 94) return '1.25'
  if (percent >= 90) return '1.50'
  if (percent >= 88) return '1.75'
  if (percent >= 85) return '2.00'
  if (percent >= 83) return '2.25'
  if (percent >= 80) return '2.50'
  if (percent >= 78) return '2.75'
  if (percent >= 75) return '3.00'
  if (percent >= 70) return '4.00'
  return '5.00'
}

export function getMetrics(subject) {
  const valid = (subject.assessments || []).filter(
    (item) => item.maxScore > 0 && item.weight >= 0 && Number.isFinite(item.score),
  )

  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0)
  const weightedEarned = valid.reduce(
    (sum, item) => sum + (item.score / item.maxScore) * item.weight,
    0,
  )

  const currentAverage = totalWeight > 0 ? (weightedEarned / totalWeight) * 100 : 0
  const remainingWeight = Math.max(0, 100 - totalWeight)
  const bestPossible = Math.min(100, weightedEarned + remainingWeight)
  const requiredToPass =
    remainingWeight > 0 ? Math.max(0, ((75 - weightedEarned) / remainingWeight) * 100) : 0

  let risk = 'Safe'
  if (bestPossible < 75 || requiredToPass > 100) {
    risk = 'High risk'
  } else if (currentAverage >= 80 || requiredToPass <= 75) {
    risk = 'Safe'
  } else {
    risk = 'At risk'
  }

  return {
    currentAverage,
    weightedEarned,
    totalWeight,
    remainingWeight,
    bestPossible,
    grade: gradeFromPercent(currentAverage),
    requiredToPass,
    risk,
  }
}

export function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

export function emptySubject(index) {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `New Subject ${index}`,
    professor: '',
    assessments: [{ name: '', weight: 0, score: 0, maxScore: 100 }],
    isDraft: true,
  }
}

export function riskBadgeClass(risk) {
  if (risk === 'Safe') return 'risk-badge safe'
  if (risk === 'At risk') return 'risk-badge at-risk'
  return 'risk-badge high-risk'
}

// -----------------------------------------------------------------------------
// GWA, dashboard insights and goal evaluation
// Everything below is derived from getMetrics(), so there is one source of truth.
// "analyzed" is the list of { subject, metrics } built in app.js.
// -----------------------------------------------------------------------------

export const PASSING_PERCENT = 75

const bandMinimums = {
  '1.00': 98,
  '1.25': 94,
  '1.50': 90,
  '1.75': 88,
  '2.00': 85,
  '2.25': 83,
  '2.50': 80,
  '2.75': 78,
  '3.00': 75,
  '4.00': 70,
  '5.00': 0,
}

/** Lowest percentage that still earns the given grade (e.g. '2.00' -> 85). */
export function gradeMinPercent(grade) {
  return bandMinimums[Number(grade).toFixed(2)] ?? 0
}

/** A subject only counts toward averages once it has at least one weighted assessment. */
export function hasGradeData(metrics) {
  return Boolean(metrics) && metrics.totalWeight > 0
}

const round2 = (n) => Math.round(n * 100) / 100

export function standingFor(gwa) {
  if (gwa === null) return { label: 'Not enough data', tone: 'neutral' }
  if (gwa <= 1.75) return { label: 'Excellent standing', tone: 'safe' }
  if (gwa <= 2.5) return { label: 'Good standing', tone: 'safe' }
  if (gwa <= 3.0) return { label: 'Passing standing', tone: 'warn' }
  return { label: 'Below passing', tone: 'danger' }
}

/**
 * Everything the dashboard needs, computed only from entered grades.
 * Subjects without graded assessments are excluded from averages (never counted as 0).
 */
export function buildInsights(analyzed) {
  const withData = analyzed.filter((item) => hasGradeData(item.metrics))
  const count = withData.length

  const gwa =
    count > 0
      ? round2(withData.reduce((sum, item) => sum + Number(item.metrics.grade), 0) / count)
      : null
  const average =
    count > 0 ? withData.reduce((sum, item) => sum + item.metrics.currentAverage, 0) / count : null

  const ranked = [...withData].sort((a, b) => b.metrics.currentAverage - a.metrics.currentAverage)
  const best = ranked[0] || null
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null

  const needsImprovement = withData
    .filter((item) => item.metrics.risk !== 'Safe' || item.metrics.currentAverage < PASSING_PERCENT)
    .sort((a, b) => a.metrics.currentAverage - b.metrics.currentAverage)

  const semesterProgress =
    analyzed.length > 0
      ? analyzed.reduce((sum, item) => sum + Math.min(100, item.metrics.totalWeight), 0) /
        analyzed.length
      : 0

  return {
    total: analyzed.length,
    withData,
    gwa,
    average,
    best,
    worst,
    needsImprovement,
    semesterProgress,
    standing: standingFor(gwa),
  }
}

/** Goal status: 'achieved' | 'ongoing' | 'behind' (not yet achieved) | 'nodata' | 'missing' */
export const GOAL_CLOSE_MARGIN_PERCENT = 5
export const GWA_CLOSE_MARGIN = 0.25

export function evaluateSubjectGoal(goal, item) {
  if (!item) return { status: 'missing' }
  const m = item.metrics
  if (!hasGradeData(m)) return { status: 'nodata' }

  const targetPercent = gradeMinPercent(goal.target)
  const current = m.currentAverage
  const gap = targetPercent - current
  const reachable = m.bestPossible >= targetPercent
  const requiredOnRemaining =
    m.remainingWeight > 0
      ? Math.max(0, ((targetPercent - m.weightedEarned) / m.remainingWeight) * 100)
      : null

  let status = 'ongoing'
  if (current >= targetPercent) status = 'achieved'
  else if (!reachable || gap > GOAL_CLOSE_MARGIN_PERCENT) status = 'behind'

  return {
    status,
    targetPercent,
    current,
    currentGrade: m.grade,
    gap: Math.max(0, gap),
    reachable,
    requiredOnRemaining,
    remainingWeight: m.remainingWeight,
  }
}

export function evaluateGwaGoal(goal, insights) {
  if (insights.gwa === null) return { status: 'nodata' }
  const target = round2(Number(goal.target))
  const gwa = insights.gwa
  let status = 'ongoing'
  if (gwa <= target) status = 'achieved'
  else if (gwa - target > GWA_CLOSE_MARGIN) status = 'behind'

  const dragging = insights.withData
    .filter((item) => Number(item.metrics.grade) > target)
    .sort((a, b) => Number(b.metrics.grade) - Number(a.metrics.grade))

  return {
    status,
    gwa,
    target,
    gap: round2(Math.max(0, gwa - target)),
    counted: insights.withData.length,
    total: insights.total,
    dragging,
  }
}
