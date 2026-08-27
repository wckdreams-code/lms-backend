const recommendationModel = require("../models/recommendationModel");
const {
  buildUserLearningProfile,
  buildPopularityMap,
  rankCoursesForUser,
  rankSimilarCourses,
} = require("../utils/recommendationEngine");

const CATEGORY_TAG_MAP = {
  Komputer: ["computer", "office", "excel", "administration"],
  "Bahasa Inggris": ["english", "grammar", "speaking", "conversation"],
  "Bahasa Asing": ["japanese", "mandarin", "language"],
  Programming: ["coding", "javascript", "python", "web"],
  Desain: ["design", "graphic", "ui", "ux"],
  Marketing: ["marketing", "social media", "seo"],
  Akuntansi: ["accounting", "finance"],
  "Bimbingan Belajar": ["school", "exam", "learning"],
};

function buildPreferredTags(preferredCategories = []) {
  return [
    ...new Set(
      preferredCategories.flatMap(
        (category) => CATEGORY_TAG_MAP[category] || [],
      ),
    ),
  ];
}

function uniqueIdsFromEvents(events, contentType) {
  return [
    ...new Set(
      (events || [])
        .filter((item) => item.content_type === contentType)
        .map((item) => String(item.content_id)),
    ),
  ];
}

async function rebuildProfileInternal(userId, placementLevel = null) {
  const events = await recommendationModel.getUserEvents(userId);

  const courseIds = uniqueIdsFromEvents(events, "course");
  const materialIds = uniqueIdsFromEvents(events, "material");

  const [courses, materials] = await Promise.all([
    recommendationModel.getCoursesByIds(courseIds),
    recommendationModel.getMaterialsByIds(materialIds),
  ]);

  const profilePayload = buildUserLearningProfile({
    events,
    courses,
    materials,
    placementLevel,
  });

  return recommendationModel.saveUserLearningProfile({
    user_id: userId,
    ...profilePayload,
  });
}

async function getRecommendedCourses(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Number(req.query.limit || 10);
    const forceRebuild = req.query.rebuild === "1";

    let profile = await recommendationModel.getUserLearningProfile(userId);

    if (!profile || forceRebuild) {
      profile = await rebuildProfileInternal(
        userId,
        profile?.last_placement_level || null,
      );
    }

    const [courses, excludedCourseIds, popularityEvents] = await Promise.all([
      recommendationModel.getPublishedCourses(),
      recommendationModel.getUserOwnedOrCompletedCourseIds(userId),
      recommendationModel.getCoursePopularityEvents(),
    ]);

    const popularityMap = buildPopularityMap(popularityEvents);

    const recommendations = rankCoursesForUser({
      userProfile: {
        preferred_level: profile.preferred_level,
        preferred_categories: profile.preferred_categories,
        preferred_tags: profile.preferred_tags,
        weak_tags: profile.weak_tags,
        preferred_learning_type: profile.preferred_learning_type,
      },
      courses,
      excludedCourseIds,
      popularityMap,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Recommended courses fetched successfully",
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}

async function getSimilarCourses(req, res, next) {
  try {
    const { courseId } = req.params;
    const limit = Number(req.query.limit || 6);

    const baseCourse = await recommendationModel.getCourseById(courseId);

    if (!baseCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const allCourses = await recommendationModel.getPublishedCourses();

    const recommendations = rankSimilarCourses({
      baseCourse,
      candidates: allCourses,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Similar courses fetched successfully",
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}

async function rebuildLearningProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const placementLevel = req.body?.placementLevel || null;

    const profile = await rebuildProfileInternal(userId, placementLevel);

    return res.status(200).json({
      success: true,
      message: "Learning profile rebuilt successfully",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

async function saveUserPreferenceProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const preferredCategories = req.body?.preferred_categories || [];
    const preferredLevel = req.body?.preferred_level || null;
    const preferredLearningType = req.body?.preferred_learning_type || null;
    const preferredTags = buildPreferredTags(preferredCategories);

    const profile = await recommendationModel.saveUserPreferenceProfile({
      user_id: userId,
      preferred_categories: preferredCategories,
      preferred_level: preferredLevel,
      preferred_learning_type: preferredLearningType,
      preferred_tags: preferredTags,
    });

    return res.status(200).json({
      success: true,
      message: "Preference profile saved",
      data: {
        preferred_categories: profile.preferred_categories,
        preferred_level: profile.preferred_level,
        preferred_learning_type: profile.preferred_learning_type,
        preferred_tags: profile.preferred_tags,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getUserPreferenceProfile(req, res, next) {
  try {
    const profile = await recommendationModel.getUserLearningProfile(
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      data: {
        preferred_categories: profile?.preferred_categories || [],
        preferred_level: profile?.preferred_level || "Intermediate",
        preferred_learning_type: profile?.preferred_learning_type || "Regular",
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRecommendedCourses,
  getSimilarCourses,
  rebuildLearningProfile,
  saveUserPreferenceProfile,
  getUserPreferenceProfile,
};
