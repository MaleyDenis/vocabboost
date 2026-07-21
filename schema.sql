-- VocabBoost schema (Cloudflare D1 / SQLite).
-- Apply locally:  npx wrangler d1 execute vocabboost --local  --file=./schema.sql
-- Apply to prod:  npx wrangler d1 execute vocabboost --remote --file=./schema.sql
--
-- profile_id is denormalized onto every table on purpose: profile isolation is
-- the core security property, so every query filters `WHERE profile_id = ?` and
-- there is no way to leak another profile's rows by forgetting a JOIN.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

-- Fixed ids: the worker maps X-Secret -> profile_id (1 = Dzianis, 2 = Yulia).
INSERT OR IGNORE INTO profiles (id, name) VALUES (1, 'Dzianis'), (2, 'Yulia');

CREATE TABLE IF NOT EXISTS dictionaries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id      INTEGER NOT NULL REFERENCES profiles(id),
  name            TEXT NOT NULL,
  target_language TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dictionaries_profile ON dictionaries(profile_id);

CREATE TABLE IF NOT EXISTS folders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id    INTEGER NOT NULL REFERENCES profiles(id),
  dictionary_id INTEGER NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_folders_dictionary ON folders(dictionary_id);
CREATE INDEX IF NOT EXISTS idx_folders_profile    ON folders(profile_id);

-- Progress fields (progress / correct_streak / last_reviewed) will be added
-- back together with the practice/exercise feature — omitted for now (YAGNI).
CREATE TABLE IF NOT EXISTS words (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id    INTEGER NOT NULL REFERENCES profiles(id),
  folder_id     INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  term          TEXT NOT NULL,
  translation   TEXT NOT NULL,
  example       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_words_folder  ON words(folder_id);
CREATE INDEX IF NOT EXISTS idx_words_profile ON words(profile_id);

-- SM-2 spaced-repetition state, one card per (word, exercise_type). Progress is
-- per exercise type on purpose: recognition and production are separate skills,
-- so a word is "fully learned" only when all of its cards mature. Cards are
-- created by the worker when a word is added (one per active exercise type).
-- See migrations/ for how this reaches an already-populated database.
CREATE TABLE IF NOT EXISTS cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id    INTEGER NOT NULL REFERENCES profiles(id),
  word_id       INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  exercise_type TEXT    NOT NULL,
  due_at        TEXT,                        -- next review; NULL = due now (new card)
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease          REAL    NOT NULL DEFAULT 2.5,-- floor 1.3
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  last_reviewed TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(word_id, exercise_type)
);
CREATE INDEX IF NOT EXISTS idx_cards_due  ON cards(profile_id, due_at);
CREATE INDEX IF NOT EXISTS idx_cards_word ON cards(word_id);
