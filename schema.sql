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
