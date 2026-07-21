-- SM-2 spaced-repetition cards (Variant B: progress is per exercise type).
--
-- A word is just vocabulary; its learning state lives here, one card per
-- (word, exercise_type). Recognition and production are separate skills, so a
-- word is "fully learned" only when all of its cards mature.
--
-- Apply by hand (schema.sql's CREATE TABLE IF NOT EXISTS won't retrofit an
-- existing DB, and this also backfills cards for words that already exist):
--   npx wrangler d1 execute vocabboost --local  --file=./migrations/0001_cards.sql
--   npx wrangler d1 execute vocabboost --remote --file=./migrations/0001_cards.sql
-- Re-runnable: IF NOT EXISTS + INSERT OR IGNORE against UNIQUE(word_id, exercise_type).

CREATE TABLE IF NOT EXISTS cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id    INTEGER NOT NULL REFERENCES profiles(id),
  word_id       INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  exercise_type TEXT    NOT NULL,
  due_at        TEXT,                        -- next review; NULL = due now (new card)
  interval_days INTEGER NOT NULL DEFAULT 0,  -- current spacing interval
  ease          REAL    NOT NULL DEFAULT 2.5,-- per-card easiness, floor 1.3
  reps          INTEGER NOT NULL DEFAULT 0,  -- consecutive successful reviews
  lapses        INTEGER NOT NULL DEFAULT 0,  -- times forgotten
  last_reviewed TEXT,                        -- when last shown
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(word_id, exercise_type)
);

-- Session selection reads "due cards for this profile"; index due_at for it.
CREATE INDEX IF NOT EXISTS idx_cards_due  ON cards(profile_id, due_at);
CREATE INDEX IF NOT EXISTS idx_cards_word ON cards(word_id);

-- Backfill: one card per existing word for each of the two starting exercise
-- types. New words get their cards from the worker on creation.
INSERT OR IGNORE INTO cards (profile_id, word_id, exercise_type)
  SELECT profile_id, id, 'recognition' FROM words;
INSERT OR IGNORE INTO cards (profile_id, word_id, exercise_type)
  SELECT profile_id, id, 'production'  FROM words;
