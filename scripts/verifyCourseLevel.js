require("dotenv").config();
const supabase = require('../config/supabase');

async function verifyLevelConsistency() {
  console.log('=== Verification: Level Consistency ===\n');

  const VALID_LEVELS = [
    'pre-schooler', 'pre-foundation', 'foundation',
    'Basic', 'Elementary', 'Intermediate', 'Advanced', 'Conversation',
    'Dasar', 'Menengah', 'Lanjutan',
    'SD', 'SMP', 'SMA', 'Persiapan UTBK'
  ];

  const DIFFICULTY_MAP = {
    'pre-schooler': 1, 'pre-foundation': 2, 'foundation': 3,
    'Basic': 4, 'Elementary': 5, 'Intermediate': 6, 'Advanced': 7, 'Conversation': 8,
    'Dasar': 4, 'Menengah': 6, 'Lanjutan': 7,
    'SD': 1, 'SMP': 4, 'SMA': 6, 'Persiapan UTBK': 7
  };

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, level, difficulty_score')
    .is('deleted_at', null)
    .order('level');

  if (error) throw error;

  let valid = 0;
  let invalid = 0;
  let mismatch = 0;
  const issues = [];

  for (const course of courses) {
    const isValidLevel = VALID_LEVELS.includes(course.level);
    const expectedDifficulty = DIFFICULTY_MAP[course.level];
    const difficultyMatches = course.difficulty_score === expectedDifficulty;

    if (!isValidLevel) {
      invalid++;
      issues.push(`✗ Invalid level: ${course.id} | "${course.level}" | difficulty=${course.difficulty_score}`);
    } else if (!difficultyMatches) {
      mismatch++;
      issues.push(`✗ Difficulty mismatch: ${course.id} | level="${course.level}" | expected=${expectedDifficulty}, got=${course.difficulty_score}`);
    } else {
      valid++;
    }
  }

  console.log(`1. Valid Levels: ${valid}/${courses.length}`);
  console.log(`2. Invalid Levels: ${invalid}`);
  console.log(`3. Difficulty Mismatches: ${mismatch}\n`);

  if (issues.length > 0) {
    console.log('Issues found:');
    issues.slice(0, 20).forEach(issue => console.log(issue));
    if (issues.length > 20) console.log(`... and ${issues.length - 20} more`);
  } else {
    console.log('✓ All courses consistent!');
  }

  console.log(`\nSample valid courses:`);
  courses
    .filter(c => VALID_LEVELS.includes(c.level) && c.difficulty_score === DIFFICULTY_MAP[c.level])
    .slice(0, 5)
    .forEach(c => {
      console.log(`  • ${c.title}`);
      console.log(`    level: ${c.level}, difficulty_score: ${c.difficulty_score}`);
    });
}

verifyLevelConsistency()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
