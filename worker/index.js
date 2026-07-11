/**
 * Single Cloudflare Worker: serves the built frontend (via the ASSETS binding)
 * and the REST API under /api/*. See CLAUDE.md for the full spec.
 *
 * Auth is intentionally primitive: the X-Secret header is matched against the
 * SECRET_DZIANIS / SECRET_YULIA env vars to resolve a fixed profile_id. Every
 * SQL query then filters by that profile_id (data isolation between profiles).
 */
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
  const { results } = await env.DB.prepare(
    "SELECT id, dictionary_id, name, created_at FROM folders WHERE dictionary_id = ? AND profile_id = ? ORDER BY created_at DESC, id DESC"
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
