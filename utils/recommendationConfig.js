/**
 * Central configuration for the Content-Based Filtering (CBF) recommendation engine.
 *
 * Everything tunable lives here so weights / thresholds can be changed in ONE place
 * without touching the scoring logic. The unit tests assert that the weights stay
 * consistent (sum to 1.0), so accidental drift is caught automatically.
 */

// ---------------------------------------------------------------------------
// Scoring weights — MUST sum to 1.0 (validated by validateWeights()).
// Each course's final score is a weighted sum of sub-scores, each in [0, 1],
// then scaled to a 0–100 range.
// ---------------------------------------------------------------------------
const WEIGHTS = Object.freeze({
  interestMatch: 0.28, // overlap between user interests/tags and course tags
  goalMatch: 0.2, // overlap between user learning goals and course target_goals
  categoryMatch: 0.16, // course category is one the user prefers
  levelMatch: 0.14, // course level vs. user level
  weakAreaMatch: 0.08, // course tags cover the user's weak areas (remediation)
  behaviorAffinity: 0.1, // implicit affinity derived from tracked behavior
  popularity: 0.04 // global popularity fallback (kept small on purpose)
});

// Order used for deterministic tie-breaking of reasons AND breakdown display.
const COMPONENT_ORDER = Object.freeze([
  'interestMatch',
  'goalMatch',
  'categoryMatch',
  'levelMatch',
  'weakAreaMatch',
  'behaviorAffinity',
  'popularity'
]);

// ---------------------------------------------------------------------------
// Level handling
// ---------------------------------------------------------------------------
const LEVEL_RANK = Object.freeze({
  beginner: 1,
  intermediate: 2,
  advanced: 3
});

// Human-readable Indonesian labels used inside deterministic reason strings.
const LEVEL_LABELS_ID = Object.freeze({
  beginner: 'pemula',
  intermediate: 'menengah',
  advanced: 'mahir'
});

// ---------------------------------------------------------------------------
// Behavior event weights (implicit profile building)
// ---------------------------------------------------------------------------
const EVENT_WEIGHTS = Object.freeze({
  complete: 5,
  enroll: 4,
  bookmark: 3,
  quiz_submit: 3,
  exam_submit: 3,
  start: 2,
  click: 1,
  view: 1,
  default: 1
});

// Event weights used ONLY for the global popularity signal.
const POPULARITY_EVENT_WEIGHTS = Object.freeze({
  complete: 3,
  enroll: 2,
  view: 1,
  click: 1,
  default: 1
});

// ---------------------------------------------------------------------------
// Tunable thresholds
// ---------------------------------------------------------------------------
const THRESHOLDS = Object.freeze({
  // Score below which a completed course quiz/exam counts as a "weak area".
  weakScoreCeiling: 65,
  // Score at/above which a topic counts as a "strong area".
  strongScoreFloor: 80,
  // Profile breadth (distinct tags + categories) at which behavior confidence
  // saturates to 1.0. New users (empty profile) get confidence 0.
  behaviorSaturation: 6,
  // Minimum points a component must contribute to earn a reason code.
  minReasonContribution: 3,
  // Maximum number of reasons/reason codes returned per course.
  maxReasons: 3,
  // When true, a 2-step level gap (e.g. beginner user vs advanced course)
  // makes the course ineligible instead of merely scoring 0 on levelMatch.
  hardLevelFilter: true
});

// ---------------------------------------------------------------------------
// Branch configuration.
// LPIA operates a single physical branch (Wisma Asri). Online courses are
// available everywhere; offline/hybrid courses require branch availability.
// A course may optionally carry `available_branches: string[]`; when present
// and non-empty it is authoritative, otherwise the branch is assumed available.
// ---------------------------------------------------------------------------
const BRANCH = Object.freeze({
  id: 'wisma_asri',
  label: 'LPIA Wisma Asri'
});

// ---------------------------------------------------------------------------
// Deterministic reason metadata: component -> { code, template }.
// `template` may reference {level} which is replaced with the Indonesian label.
// ---------------------------------------------------------------------------
const REASON_META = Object.freeze({
  interestMatch: {
    code: 'INTEREST_MATCH',
    template: 'Sesuai dengan bidang yang Anda minati'
  },
  goalMatch: {
    code: 'GOAL_MATCH',
    template: 'Mendukung tujuan belajar Anda'
  },
  categoryMatch: {
    code: 'CATEGORY_MATCH',
    template: 'Sesuai dengan kategori favorit Anda'
  },
  levelMatch: {
    code: 'LEVEL_MATCH',
    template: 'Sesuai dengan level {level} Anda'
  },
  weakAreaMatch: {
    code: 'WEAK_AREA_MATCH',
    template: 'Membantu memperkuat materi yang masih perlu ditingkatkan'
  },
  behaviorAffinity: {
    code: 'BEHAVIOR_AFFINITY',
    template: 'Berdasarkan aktivitas belajar Anda sebelumnya'
  },
  popularity: {
    code: 'POPULAR',
    template: 'Kursus populer di LPIA Wisma Asri'
  }
});

// Reason codes emitted when a course is filtered out (traceable exclusions).
const EXCLUSION_CODES = Object.freeze({
  COMPLETED: 'EXCLUDED_COMPLETED',
  ENROLLED: 'EXCLUDED_ENROLLED',
  INACTIVE: 'EXCLUDED_INACTIVE',
  BRANCH_UNAVAILABLE: 'EXCLUDED_BRANCH_UNAVAILABLE',
  LEVEL_MISMATCH: 'EXCLUDED_LEVEL_MISMATCH'
});

/**
 * Validate that the scoring weights sum to 1.0 (within a small epsilon).
 * Throws if inconsistent so misconfiguration fails fast / is caught by tests.
 * @returns {number} the total (≈ 1.0) when valid.
 */
function validateWeights(weights = WEIGHTS) {
  const total = Object.values(weights).reduce((sum, w) => sum + Number(w || 0), 0);
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(
      `Recommendation weights must sum to 1.0 but sum to ${total.toFixed(6)}`
    );
  }
  return total;
}

module.exports = {
  WEIGHTS,
  COMPONENT_ORDER,
  LEVEL_RANK,
  LEVEL_LABELS_ID,
  EVENT_WEIGHTS,
  POPULARITY_EVENT_WEIGHTS,
  THRESHOLDS,
  BRANCH,
  REASON_META,
  EXCLUSION_CODES,
  validateWeights
};
