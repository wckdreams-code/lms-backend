const ALLOWED_LEVELS = [
  "pre-schooler", "pre-foundation", "foundation",
  "Basic", "Elementary", "Intermediate", "Advanced", "Conversation",
  "Dasar", "Menengah", "Lanjutan",
  "SD", "SMP", "SMA", "Persiapan UTBK"
];

const LEVEL_DIFFICULTY_MAP = {
  "pre-schooler": 1,
  "pre-foundation": 2,
  "foundation": 3,
  "Basic": 4,
  "Elementary": 5,
  "Intermediate": 6,
  "Advanced": 7,
  "Conversation": 8,
  "Dasar": 4,
  "Menengah": 6,
  "Lanjutan": 7,
  "SD": 1,
  "SMP": 4,
  "SMA": 6,
  "Persiapan UTBK": 7
};

function convertLevelToDifficulty(level) {
  const normalized = String(level || "").trim().toLowerCase();
  
  for (const [key, difficulty] of Object.entries(LEVEL_DIFFICULTY_MAP)) {
    if (key.toLowerCase() === normalized) {
      return difficulty;
    }
  }
  
  return 0;
}

function isValidLevel(level) {
  return ALLOWED_LEVELS.includes(level);
}

module.exports = {
  ALLOWED_LEVELS,
  LEVEL_DIFFICULTY_MAP,
  convertLevelToDifficulty,
  isValidLevel
};
