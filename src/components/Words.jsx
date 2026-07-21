import { useEffect, useState } from "react";
import { api } from "../api";

// Words inside a folder — the deepest level. Quick add: term + translation
// (required) and an optional example. Reached by tapping a folder card.
export default function Words({ folder, onBack, onLogout }) {
  const [words, setWords] = useState(null);
  const [error, setError] = useState("");
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  // A folder is a whole theme, so it can hold hundreds of words. We keep the flat
  // list (no sub-folders) but make it usable at scale: a client-side search and a
  // render cap so we never paint hundreds of glass cards at once on a phone.
  const PAGE = 50;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setWords(await api(`/folders/${folder.id}/words`));
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError("Не удалось загрузить слова");
    }
  }

  async function createWord(e) {
    e.preventDefault();
    const t = term.trim();
    const tr = translation.trim();
    if (!t || !tr || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await api(`/folders/${folder.id}/words`, {
        method: "POST",
        body: JSON.stringify({ term: t, translation: tr, example: example.trim() }),
      });
      setWords((prev) => [created, ...(prev ?? [])]);
      setTerm("");
      setTranslation("");
      setExample("");
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError("Не удалось добавить слово");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWord(id) {
    setError("");
    try {
      await api(`/words/${id}`, { method: "DELETE" });
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError("Не удалось удалить слово");
    }
  }

  const canAdd = term.trim() && translation.trim();

  const q = query.trim().toLowerCase();
  const filtered =
    words === null
      ? []
      : q
      ? words.filter(
          (w) =>
            w.term.toLowerCase().includes(q) ||
            w.translation.toLowerCase().includes(q)
        )
      : words;
  // While searching we show every match; otherwise cap the render at PAGE until
  // the user taps "показать все".
  const visible = q || showAll ? filtered : filtered.slice(0, PAGE);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 h-16
                         bg-panel/25 backdrop-blur-xl border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted hover:text-ink transition"
        >
          ← назад
        </button>
        <h1 className="text-base font-bold tracking-tight truncate max-w-[55%]">
          {folder.name}
        </h1>
        <button
          onClick={onLogout}
          className="text-sm text-muted hover:text-ink transition"
        >
          выйти
        </button>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Quick add */}
        <form
          onSubmit={createWord}
          className="flex flex-col gap-2 rounded-2xl p-4
                     bg-panel/35 backdrop-blur-xl border border-white/12
                     shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Слово"
            className="h-12 rounded-xl bg-page/40 border border-white/20 px-4 text-base text-ink placeholder:text-muted/55 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <input
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="Перевод"
            className="h-12 rounded-xl bg-page/40 border border-white/20 px-4 text-base text-ink placeholder:text-muted/55 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Пример (необязательно)"
            className="h-12 rounded-xl bg-page/40 border border-white/20 px-4 text-base text-ink placeholder:text-muted/55 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={!canAdd || saving}
            className="h-12 rounded-xl text-ink font-bold transition active:scale-[0.99]
                       bg-gradient-to-br from-accent to-[#a52d97] hover:brightness-110
                       shadow-[0_8px_24px_-6px_rgba(224,56,159,.6)]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {saving ? "Добавляем…" : "Добавить слово"}
          </button>
        </form>

        {error && <p className="text-sm text-accent">{error}</p>}

        {/* List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Слова</h2>
            {words !== null && words.length > 0 && (
              <span className="text-xs text-muted tabular-nums">{words.length}</span>
            )}
          </div>

          {/* Search — the flat list stays usable when a theme grows large. */}
          {words !== null && words.length > 10 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по слову или переводу"
              className="h-11 rounded-xl bg-page/40 border border-white/20 px-4 text-sm text-ink placeholder:text-muted/55 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          )}

          {words === null && !error && (
            <p className="text-sm text-muted">Загрузка…</p>
          )}

          {words !== null && words.length === 0 && (
            <p className="text-sm text-muted">Пока пусто — добавьте первое слово.</p>
          )}

          {words !== null && words.length > 0 && filtered.length === 0 && (
            <p className="text-sm text-muted">Ничего не найдено.</p>
          )}

          {visible.length > 0 && (
            <ul className="flex flex-col gap-2">
              {visible.map((w) => (
                <li
                  key={w.id}
                  className="flex items-start justify-between gap-3 rounded-2xl px-4 py-3
                             bg-panel/35 backdrop-blur-xl border border-white/12
                             shadow-[0_8px_24px_-14px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.08)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-ink">{w.term}</span>
                      <span className="text-muted">— {w.translation}</span>
                    </div>
                    {w.example && (
                      <p className="mt-1 text-sm text-muted/80 italic break-words">
                        {w.example}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteWord(w.id)}
                    aria-label={`Удалить ${w.term}`}
                    className="shrink-0 text-muted hover:text-accent text-lg leading-none transition"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="h-11 rounded-xl text-sm font-medium text-muted transition
                         bg-panel/25 border border-white/12 hover:text-ink hover:border-accent/50"
            >
              Показать все ({hiddenCount} ещё)
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
