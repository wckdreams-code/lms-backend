function normalizeList(list = []) {
  if (!Array.isArray(list)) return [];
  return [...new Set(
    list
      .filter(Boolean)
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean)
  )];
}

function addToMap(map, key, value = 1) {
  if (!key) return;
  const normalizedKey = String(key).trim().toLowerCase();
  if (!normalizedKey) return;
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + value);
}

function addManyToMap(map, items = [], value = 1) {
  for (const item of normalizeList(items)) {
    addToMap(map, item, value);
  }
}

function topKeys(map, limit = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function overlapScore(source = [], target = []) {
  const a = normalizeList(source);
  const b = normalizeList(target);

  if (!a.length || !b.length) return 0;

  const targetSet = new Set(b);
  let matches = 0;

  for (const item of a) {
    if (targetSet.has(item)) matches++;
  }

  return matches / Math.max(a.length, b.length);
}

const { convertLevelToDifficulty } = require('./levelMapping');

function levelScore(userLevel, courseLevel) {
  const a = convertLevelToDifficulty(userLevel);
  const b = convertLevelToDifficulty(courseLevel);

  if (a === 0 || b === 0) return 0;
  if (a === b) return 1;
  const gap = Math.abs(a - b);
  if (gap === 1) return 0.5;
  if (gap === 2) return 0.25;
  return 0;
}

function eventWeight(eventType) {
  switch (eventType) {
    case 'complete':
      return 5;
    case 'enroll':
      return 4;
    case 'bookmark':
      return 3;
    case 'start':
      return 2;
    case 'view':
      return 1;
    case 'quiz_submit':
    case 'exam_submit':
      return 3;
    default:
      return 1;
  }
}

function buildPopularityMap(events = []) {
  const popularityMap = new Map();

  for (const event of events) {
    const courseId = String(event.content_id);
    const weight =
      event.event_type === 'complete' ? 3 :
      event.event_type === 'enroll' ? 2 : 1;

    popularityMap.set(courseId, (popularityMap.get(courseId) || 0) + weight);
  }

  return popularityMap;
}

function buildUserLearningProfile({ events = [], courses = [], materials = [], placementLevel = null }) {
  const courseMap = new Map(courses.map((item) => [String(item.id), item]));
  const materialMap = new Map(materials.map((item) => [String(item.id), item]));

  const categoryWeights = new Map();
  const tagWeights = new Map();
  const weakTagWeights = new Map();
  const strongTagWeights = new Map();
  const levelWeights = new Map();

  let scoreTotal = 0;
  let scoreCount = 0;

  for (const event of events) {
    const weight = eventWeight(event.event_type);
    const score = event.score != null ? Number(event.score) : null;

    if (score != null && !Number.isNaN(score)) {
      scoreTotal += score;
      scoreCount += 1;
    }

    if (event.content_type === 'course') {
      const course = courseMap.get(String(event.content_id));
      if (!course) continue;

      addToMap(categoryWeights, course.category, weight);
      addToMap(levelWeights, course.level, weight);
      addManyToMap(tagWeights, course.tags, weight);

      if (score != null && score < 65) {
        addManyToMap(weakTagWeights, course.tags, 3);
      }

      if (score != null && score >= 80) {
        addManyToMap(strongTagWeights, course.tags, 2);
      }
    }

    if (event.content_type === 'material') {
      const material = materialMap.get(String(event.content_id));
      if (!material) continue;

      const materialTags = normalizeList([
        ...(material.keywords || []),
        material.topic,
        material.subtopic
      ]);

      addManyToMap(tagWeights, materialTags, weight);
      addToMap(levelWeights, material.difficulty, weight);

      if (score != null && score < 65) {
        addManyToMap(weakTagWeights, materialTags, 3);
      }

      if (score != null && score >= 80) {
        addManyToMap(strongTagWeights, materialTags, 2);
      }
    }
  }

  const derivedLevel = topKeys(levelWeights, 1)[0] || null;

  return {
    preferred_level: placementLevel || derivedLevel,
    preferred_categories: topKeys(categoryWeights, 5),
    preferred_tags: topKeys(tagWeights, 10),
    weak_tags: topKeys(weakTagWeights, 8),
    strong_tags: topKeys(strongTagWeights, 8),
    avg_score: scoreCount ? Number((scoreTotal / scoreCount).toFixed(2)) : null,
    last_placement_level: placementLevel || null,
    last_calculated_at: new Date().toISOString()
  };
}

function scoreCourseForUser({ userProfile, course, popularityMap }) {
  const reasons = [];
function learningTypeScore(userType, courseType) {

    if (!userType || !courseType) {
        return 0;
    }

    return String(userType).toLowerCase() ===
           String(courseType).toLowerCase()
           ? 1
           : 0;
}

  const tagMatch = overlapScore(userProfile.preferred_tags, course.tags);
  const weakAreaMatch = overlapScore(userProfile.weak_tags, course.tags);
  const categoryMatch =
normalizeList(userProfile.preferred_categories)
.includes(
    String(course.category || '').trim().toLowerCase()
)
? 1
: 0;
  const userLevel = String(userProfile.preferred_level || '').toLowerCase();
  const courseLevel = String(course.level || '').toLowerCase();
  const matchedLevel = levelScore(userLevel, courseLevel);
  const learningTypeMatch =
  learningTypeScore(
    userProfile.preferred_learning_type,
    course.learning_type
  );

  const maxPopularity = Math.max(...Array.from(popularityMap.values()), 1);
  const popularity = (popularityMap.get(String(course.id)) || 0) / maxPopularity;

  let score = 0;
  score += tagMatch * 0.40;
  score += categoryMatch * 0.30;
  score += matchedLevel * 0.20;
  score += learningTypeMatch * 0.10;

  if (tagMatch > 0) reasons.push('matches_preferred_tags');
  if (weakAreaMatch > 0) reasons.push('supports_weak_topic');
  if (categoryMatch > 0) reasons.push('same_category');
  if (matchedLevel > 0) reasons.push('matches_level');
  if (learningTypeMatch > 0) reasons.push('matches_learning_type');
  if (popularity > 0.5) reasons.push('popular_course');

  return {
    ...course,
    recommendation_score: Number(score.toFixed(4)),
    reasons
  };
}

function rankCoursesForUser({
  userProfile,
  courses = [],
  excludedCourseIds = [],
  popularityMap = new Map(),
  limit = 10
}) {
  const excludedSet = new Set((excludedCourseIds || []).map(String));

  return courses
    .filter((course) => !excludedSet.has(String(course.id)))
    .map((course) => scoreCourseForUser({ userProfile, course, popularityMap }))
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, limit);
}

function scoreSimilarCourse(baseCourse, candidateCourse) {
  const reasons = [];

  const tagMatch = overlapScore(baseCourse.tags, candidateCourse.tags);
  const sameCategory =
    String(baseCourse.category || '').toLowerCase() ===
    String(candidateCourse.category || '').toLowerCase()
      ? 1
      : 0;

  const sameLevel = levelScore(baseCourse.level, candidateCourse.level);
  const baseDifficulty = baseCourse.difficulty_score ?? convertLevelToDifficulty(baseCourse.level);
  const candidateDifficulty = candidateCourse.difficulty_score ?? convertLevelToDifficulty(candidateCourse.level);
  const difficultyGap =
    baseDifficulty === 0 || candidateDifficulty === 0
      ? 0
      : 1 - Math.min(
          Math.abs(baseDifficulty - candidateDifficulty) / 8,
          1
        );

  let score = 0;
  score += tagMatch * 0.5;
  score += sameCategory * 0.25;
  score += sameLevel * 0.15;
  score += difficultyGap * 0.10;

  if (tagMatch > 0) reasons.push('similar_tags');
  if (sameCategory) reasons.push('same_category');
  if (sameLevel > 0) reasons.push('same_level');

  return {
    ...candidateCourse,
    recommendation_score: Number(score.toFixed(4)),
    reasons
  };
}

function rankSimilarCourses({ baseCourse, candidates = [], limit = 6 }) {
  return candidates
    .filter((course) => String(course.id) !== String(baseCourse.id))
    .map((course) => scoreSimilarCourse(baseCourse, course))
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, limit);
}

module.exports = {
  buildUserLearningProfile,
  buildPopularityMap,
  convertLevelToDifficulty,
  rankCoursesForUser,
  rankSimilarCourses
};