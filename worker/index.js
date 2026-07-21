/**
 * Single Cloudflare Worker: serves the built frontend (via the ASSETS binding)
 * and the REST API under /api/*. See CLAUDE.md for the full spec.
 *
 * Auth is intentionally primitive: the X-Secret header is matched against the
 * SECRET_DZIANIS / SECRET_YULIA env vars to resolve a fixed profile_id. Every
 * SQL query then filters by that profile_id (data isolation between profiles).
 */
// Active exercise types. Each word gets one SM-2 card per type on creation, and
// a word is only "fully learned" once every card matures. Adding a type here
// requires a backfill migration to give existing words the new card.
const EXERCISE_TYPES = ["recognition", "production"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    // Everything else is a static asset; unknown SPA routes fall back to
    // index.html (single_page_application mode on the ASSETS binding).
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request, env, url) {
  if (url.pathname === "/api/health") {
    return json({ status: "ok" });
  }

  // Everything below /api requires a valid secret.
  const profileId = resolveProfileId(request, env);
  if (profileId === null) {
    return json({ error: "unauthorized" }, 401);
  }

  if (url.pathname === "/api/dictionaries") {
    if (request.method === "GET") return listDictionaries(env, profileId);
    if (request.method === "POST") return createDictionary(request, env, profileId);
    return json({ error: "method_not_allowed" }, 405);
  }

  const dictMatch = url.pathname.match(/^\/api\/dictionaries\/(\d+)$/);
  if (dictMatch) {
    const id = Number(dictMatch[1]);
    if (request.method === "DELETE") return deleteDictionary(env, profileId, id);
    return json({ error: "method_not_allowed" }, 405);
  }

  const foldersMatch = url.pathname.match(/^\/api\/dictionaries\/(\d+)\/folders$/);
  if (foldersMatch) {
    const dictionaryId = Number(foldersMatch[1]);
    if (request.method === "GET") return listFolders(env, profileId, dictionaryId);
    if (request.method === "POST") return createFolder(request, env, profileId, dictionaryId);
    return json({ error: "method_not_allowed" }, 405);
  }

  const folderMatch = url.pathname.match(/^\/api\/folders\/(\d+)$/);
  if (folderMatch) {
    const id = Number(folderMatch[1]);
    if (request.method === "DELETE") return deleteFolder(env, profileId, id);
    return json({ error: "method_not_allowed" }, 405);
  }

  const wordsMatch = url.pathname.match(/^\/api\/folders\/(\d+)\/words$/);
  if (wordsMatch) {
    const folderId = Number(wordsMatch[1]);
    if (request.method === "GET") return listWords(env, profileId, folderId);
    if (request.method === "POST") return createWord(request, env, profileId, folderId);
    return json({ error: "method_not_allowed" }, 405);
  }

  const wordMatch = url.pathname.match(/^\/api\/words\/(\d+)$/);
  if (wordMatch) {
    const id = Number(wordMatch[1]);
    if (request.method === "DELETE") return deleteWord(env, profileId, id);
    return json({ error: "method_not_allowed" }, 405);
  }

  const reviewMatch = url.pathname.match(/^\/api\/cards\/(\d+)\/review$/);
  if (reviewMatch) {
    const id = Number(reviewMatch[1]);
    if (request.method === "POST") return reviewCard(request, env, profileId, id);
    return json({ error: "method_not_allowed" }, 405);
  }

  return json({ error: "not_found" }, 404);
}

/** Maps the X-Secret header to a fixed profile_id, or null if invalid. */
function resolveProfileId(request, env) {
  const secret = request.headers.get("X-Secret");
  if (!secret) return null;
  if (secret === env.SECRET_DZIANIS) return 1;
  if (secret === env.SECRET_YULIA) return 2;
  return null;
}

async function listDictionaries(env, profileId) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, target_language, created_at FROM dictionaries WHERE profile_id = ? ORDER BY created_at DESC, id DESC"
  )
    .bind(profileId)
    .all();
  return json(results);
}

async function createDictionary(request, env, profileId) {
  const body = await readJson(request);
  if (!body) return json({ error: "invalid_json" }, 400);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const targetLanguage =
    typeof body.target_language === "string" ? body.target_language.trim() : "";
  if (!name || !targetLanguage) {
    return json({ error: "name and target_language are required" }, 400);
  }

  const row = await env.DB.prepare(
    "INSERT INTO dictionaries (profile_id, name, target_language) VALUES (?, ?, ?) RETURNING id, name, target_language, created_at"
  )
    .bind(profileId, name, targetLanguage)
    .first();
  return json(row, 201);
}

async function deleteDictionary(env, profileId, id) {
  // profile_id in the WHERE clause enforces isolation: a profile can only
  // delete its own dictionaries. Folders/words cascade via the schema.
  const res = await env.DB.prepare(
    "DELETE FROM dictionaries WHERE id = ? AND profile_id = ?"
  )
    .bind(id, profileId)
    .run();

  if (res.meta.changes === 0) return json({ error: "not_found" }, 404);
  return new Response(null, { status: 204 });
}

async function listFolders(env, profileId, dictionaryId) {
  // word_count via a correlated subquery so the folder list can show how full a
  // theme is without opening it. A theme is one folder; we never split it, so
  // the count is expected to grow large and stays purely informational.
  const { results } = await env.DB.prepare(
    "SELECT f.id, f.dictionary_id, f.name, f.created_at, " +
      "(SELECT COUNT(*) FROM words w WHERE w.folder_id = f.id) AS word_count " +
      "FROM folders f WHERE f.dictionary_id = ? AND f.profile_id = ? " +
      "ORDER BY f.created_at DESC, f.id DESC"
  )
    .bind(dictionaryId, profileId)
    .all();
  return json(results);
}

async function createFolder(request, env, profileId, dictionaryId) {
  const body = await readJson(request);
  if (!body) return json({ error: "invalid_json" }, 400);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return json({ error: "name is required" }, 400);

  // INSERT ... SELECT guarantees the parent dictionary belongs to this profile:
  // if it doesn't, the SELECT yields no row, nothing is inserted, and RETURNING
  // gives null -> 404. This keeps isolation without a separate lookup.
  const row = await env.DB.prepare(
    "INSERT INTO folders (profile_id, dictionary_id, name) " +
      "SELECT ?, id, ? FROM dictionaries WHERE id = ? AND profile_id = ? " +
      "RETURNING id, dictionary_id, name, created_at"
  )
    .bind(profileId, name, dictionaryId, profileId)
    .first();

  if (!row) return json({ error: "dictionary_not_found" }, 404);
  return json(row, 201);
}

async function deleteFolder(env, profileId, id) {
  const res = await env.DB.prepare(
    "DELETE FROM folders WHERE id = ? AND profile_id = ?"
  )
    .bind(id, profileId)
    .run();
  if (res.meta.changes === 0) return json({ error: "not_found" }, 404);
  return new Response(null, { status: 204 });
}

async function listWords(env, profileId, folderId) {
  const { results } = await env.DB.prepare(
    "SELECT id, folder_id, term, translation, example, created_at FROM words WHERE folder_id = ? AND profile_id = ? ORDER BY created_at DESC, id DESC"
  )
    .bind(folderId, profileId)
    .all();
  return json(results);
}

async function createWord(request, env, profileId, folderId) {
  const body = await readJson(request);
  if (!body) return json({ error: "invalid_json" }, 400);
  const term = typeof body.term === "string" ? body.term.trim() : "";
  const translation = typeof body.translation === "string" ? body.translation.trim() : "";
  const example = typeof body.example === "string" && body.example.trim() ? body.example.trim() : null;
  if (!term || !translation) {
    return json({ error: "term and translation are required" }, 400);
  }

  // INSERT ... SELECT guards ownership: the word is only inserted if the parent
  // folder belongs to this profile; otherwise RETURNING is null -> 404.
  const row = await env.DB.prepare(
    "INSERT INTO words (profile_id, folder_id, term, translation, example) " +
      "SELECT ?, id, ?, ?, ? FROM folders WHERE id = ? AND profile_id = ? " +
      "RETURNING id, folder_id, term, translation, example, created_at"
  )
    .bind(profileId, term, translation, example, folderId, profileId)
    .first();

  if (!row) return json({ error: "folder_not_found" }, 404);

  // Eagerly create one SM-2 card per exercise type so the new word is a due
  // card immediately (due_at NULL = due now). If the word already had cards
  // (e.g. a retried request), the UNIQUE constraint makes this a no-op.
  await env.DB.batch(
    EXERCISE_TYPES.map((type) =>
      env.DB.prepare(
        "INSERT OR IGNORE INTO cards (profile_id, word_id, exercise_type) VALUES (?, ?, ?)"
      ).bind(profileId, row.id, type)
    )
  );

  return json(row, 201);
}

async function deleteWord(env, profileId, id) {
  const res = await env.DB.prepare(
    "DELETE FROM words WHERE id = ? AND profile_id = ?"
  )
    .bind(id, profileId)
    .run();
  if (res.meta.changes === 0) return json({ error: "not_found" }, 404);
  return new Response(null, { status: 204 });
}

// SM-2 review. Grades: again / hard / good / easy. All scheduling math is here
// on the server; the exercise UI just reports which grade the answer earned.
async function reviewCard(request, env, profileId, id) {
  const body = await readJson(request);
  if (!body) return json({ error: "invalid_json" }, 400);
  const grade = body.grade;
  if (!["again", "hard", "good", "easy"].includes(grade)) {
    return json({ error: "grade must be again|hard|good|easy" }, 400);
  }

  const card = await env.DB.prepare(
    "SELECT interval_days, ease, reps, lapses FROM cards WHERE id = ? AND profile_id = ?"
  )
    .bind(id, profileId)
    .first();
  if (!card) return json({ error: "not_found" }, 404);

  const next = schedule(card, grade);

  // due_at is computed in SQL so its text format matches created_at/datetime('now')
  // and stays comparable in the session selector. interval 0 (again) -> due now.
  const row = await env.DB.prepare(
    "UPDATE cards SET interval_days = ?, ease = ?, reps = ?, lapses = ?, " +
      "due_at = datetime('now', ? || ' days'), last_reviewed = datetime('now') " +
      "WHERE id = ? AND profile_id = ? " +
      "RETURNING id, word_id, exercise_type, due_at, interval_days, ease, reps, lapses, last_reviewed"
  )
    .bind(next.interval_days, next.ease, next.reps, next.lapses, `+${next.interval_days}`, id, profileId)
    .first();

  return json(row);
}

// One SM-2 step. Returns the new scheduling fields for the card. Intervals are
// whole days; "again" schedules the card for now (0 days) so it returns this
// session. ease floors at 1.3.
function schedule(card, grade) {
  const MIN_EASE = 1.3;
  let { interval_days: interval, ease, reps, lapses } = card;

  if (grade === "again") {
    reps = 0;
    lapses += 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
    interval = 0;
  } else if (grade === "hard") {
    reps += 1;
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
  } else if (grade === "good") {
    reps += 1;
    interval = interval === 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease);
  } else {
    // easy
    reps += 1;
    ease = ease + 0.15;
    interval = interval === 0 ? 4 : Math.round(interval * ease * 1.3);
  }

  return { interval_days: interval, ease: Number(ease.toFixed(2)), reps, lapses };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
