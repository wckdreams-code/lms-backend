require("dotenv").config();
const supabase = require('../config/supabase');

async function updateCoursesDifficulty() {
  const { data: courses, error: fetchError } = await supabase
    .from('courses')
    .select('id, level')
    .is('deleted_at', null);

  if (fetchError) throw fetchError;

  const MAPPING = {
    'pre-schooler': 1, 'pre-foundation': 2, foundation: 3,
    'Basic': 4, 'Elementary': 5, 'Intermediate': 6, 'Advanced': 7, 'Conversation': 8,
    'Dasar': 4, 'Menengah': 6, 'Lanjutan': 7,
    'SD': 1, 'SMP': 4, 'SMA': 6, 'Persiapan UTBK': 7
  };

  let updated = 0;
  let skipped = 0;

  for (const course of courses) {
    const difficulty = MAPPING[course.level];

    if (!difficulty) {
      console.log(`⊘ Skip: course_id=${course.id}, level="${course.level}" (unknown)`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('courses')
      .update({ difficulty_score: difficulty })
      .eq('id', course.id);

    if (error) {
      console.error(`✗ Fail: course_id=${course.id}, error=${error.message}`);
      continue;
    }

    console.log(`✓ Updated: course_id=${course.id}, level="${course.level}" -> difficulty_score=${difficulty}`);
    updated++;
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

updateCoursesDifficulty()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
