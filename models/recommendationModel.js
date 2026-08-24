const supabase = require('../config/supabase');

async function getPublishedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select(`
id,
title,
description,
category,
level,
tags,
difficulty_score,
learning_type,
delivery_type,
thumbnail_url
`)
    .eq('is_published', true);

  if (error) throw error;
  return data || [];
}

async function getCourseById(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select(`
id,
title,
description,
category,
level,
tags,
difficulty_score,
learning_type,
delivery_type,
thumbnail_url
`)
    .eq('id', courseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getUserLearningProfile(userId) {
  const { data, error } = await supabase
    .from('user_learning_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function saveUserLearningProfile(payload) {
  const { data, error } = await supabase
    .from('user_learning_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function saveUserPreferenceProfile(payload) {
  const { data, error } = await supabase
    .from('user_learning_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getUserEvents(userId) {
  const { data, error } = await supabase
    .from('user_content_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getUserOwnedOrCompletedCourseIds(userId) {
  const { data, error } = await supabase
    .from('user_content_events')
    .select('content_id')
    .eq('user_id', userId)
    .eq('content_type', 'course')
    .in('event_type', ['enroll', 'complete']);

  if (error) throw error;

  return [...new Set((data || []).map((item) => String(item.content_id)))];
}

async function getCoursesByIds(ids = []) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('courses')
    .select(`
id,
title,
description,
category,
level,
tags,
difficulty_score,
learning_type,
delivery_type,
thumbnail_url
`)
    .in('id', ids);

  if (error) throw error;
  return data || [];
}

async function getMaterialsByIds(ids = []) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('materials')
    .select(`
id,
title,
description,
category,
level,
tags,
difficulty_score,
learning_type,
delivery_type,
thumbnail_url
`)
    .in('id', ids);

  if (error) throw error;
  return data || [];
}

async function getCoursePopularityEvents() {
  const { data, error } = await supabase
    .from('user_content_events')
    .select('content_id, event_type')
    .eq('content_type', 'course')
    .in('event_type', ['view', 'enroll', 'complete']);

  if (error) throw error;
  return data || [];
}

async function createUserContentEvent(payload) {
  const { data, error } = await supabase
    .from('user_content_events')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  getPublishedCourses,
  getCourseById,
  getUserLearningProfile,
  saveUserLearningProfile,
  saveUserPreferenceProfile,
  getUserEvents,
  getUserOwnedOrCompletedCourseIds,
  getCoursesByIds,
  getMaterialsByIds,
  getCoursePopularityEvents,
  createUserContentEvent
};