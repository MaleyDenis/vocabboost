import { useEffect, useState } from "react";
import { api } from "../api";

// Folders inside a dictionary. Reached by tapping a dictionary card; the back
// button returns to the dictionary list. Words live one level deeper (next).
export default function Folders({ dictionary, onOpenFolder, onBack, onLogout }) {
  const [folders, setFolders] = useState(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setFolders(await api(`/dictionaries/${dictionary.id}/folders`));
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError("Не удалось загрузить папки");
    }
  }

  async function createFolder(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await api(`/dictionaries/${dictionary.id}/folders`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      setFolders((prev) => [created, ...(prev ?? [])]);
      setName("");
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError("Не удалось создать папку");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFolder(id) {
    if (!confirm("Удалить папку со всеми словами?")) return;
    setError("");
    try {
      await api(`/folders/${id}`, { method: "DELETE" });
      setFolders((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError("Не удалось удалить папку");
    }
  }

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
        <h1 className="flex items-center gap-2 text-base font-bold tracking-tight">
          <span className="text-accent">{dictionary.target_language.toUpperCase()}</span>
          {dictionary.name}
        </h1>
        <button
          onClick={onLogout}
          className="text-sm text-muted hover:text-ink transition"
        >
          выйти
        </button>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Create form */}
        <form onSubmit={createFolder} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Новая папка (например, Еда)"
            className="flex-1 h-12 rounded-2xl bg-page/40 border border-white/20 px-4 text-base text-ink placeholder:text-muted/55 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-12 px-5 rounded-2xl text-ink font-bold transition active:scale-[0.99]
                       bg-gradient-to-br from-accent to-[#a52d97] hover:brightness-110
                       shadow-[0_8px_24px_-6px_rgba(224,56,159,.6)]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            +
          </button>
        </form>

        {error && <p className="text-sm text-accent">{error}</p>}

        {/* List */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Папки</h2>

          {folders === null && !error && (
            <p className="text-sm text-muted">Загрузка…</p>
          )}

          {folders !== null && folders.length === 0 && (
            <p className="text-sm text-muted">Пока пусто — создайте первую папку.</p>
          )}

          {folders !== null && folders.length > 0 && (
            <ul className="flex flex-col gap-2">
              {folders.map((f) => (
                <li
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenFolder(f)}
                  onKeyDown={(e) => e.key === "Enter" && onOpenFolder(f)}
                  className="flex items-center justify-between rounded-2xl px-4 py-4 cursor-pointer transition
                             bg-panel/35 backdrop-blur-xl border border-white/12
                             shadow-[0_8px_24px_-14px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.08)]
                             hover:border-accent/60 active:scale-[0.99]"
                >
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="font-medium text-ink truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {f.word_count ?? 0}
                    </span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(f.id);
                    }}
                    aria-label={`Удалить ${f.name}`}
                    className="shrink-0 ml-2 text-muted hover:text-accent text-lg leading-none transition"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
