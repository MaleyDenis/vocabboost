import { useEffect, useState } from "react";
import { api, clearSecret } from "../api";

// Preset target languages — keeps things tidy and avoids typos. Extend freely.
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
];

export default function Home({ onLogout }) {
  const [dictionaries, setDictionaries] = useState(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [language, setLanguage] = useState(LANGUAGES[0].code);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function logout() {
    clearSecret();
    onLogout();
  }

  async function load() {
    try {
      setDictionaries(await api("/dictionaries"));
    } catch (err) {
      if (err.status === 401) logout();
      else setError("Не удалось загрузить словари");
    }
  }

  async function createDictionary(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError("");
    try {
      const created = await api("/dictionaries", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, target_language: language }),
      });
      setDictionaries((prev) => [created, ...(prev ?? [])]);
      setName("");
    } catch (err) {
      if (err.status === 401) logout();
      else setError("Не удалось создать словарь");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDictionary(id) {
    if (!confirm("Удалить словарь со всеми папками и словами?")) return;
    setError("");
    try {
      await api(`/dictionaries/${id}`, { method: "DELETE" });
      setDictionaries((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      if (err.status === 401) logout();
      else setError("Не удалось удалить словарь");
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="flex items-center justify-between px-5 h-16 border-b border-slate-100 bg-white">
        <h1 className="text-lg font-semibold text-slate-900">VocabBoost</h1>
        <button
          onClick={logout}
          className="text-sm text-slate-500 hover:text-slate-900 transition"
        >
          Выйти
        </button>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Create form */}
        <form onSubmit={createDictionary} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-500">Новый словарь</h2>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название (например, English)"
              className="flex-1 h-12 rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 px-3 text-base bg-white outline-none focus:border-indigo-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-12 rounded-2xl bg-indigo-600 text-white text-base font-medium transition active:scale-[0.99] hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Добавляем…" : "Добавить словарь"}
          </button>
        </form>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* List */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-500">Словари</h2>

          {dictionaries === null && !error && (
            <p className="text-sm text-slate-400">Загрузка…</p>
          )}

          {dictionaries !== null && dictionaries.length === 0 && (
            <p className="text-sm text-slate-400">Пока пусто — создайте первый словарь.</p>
          )}

          {dictionaries !== null && dictionaries.length > 0 && (
            <ul className="flex flex-col gap-2">
              {dictionaries.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3"
                >
                  <span>
                    <span className="font-medium text-slate-900">{d.name}</span>
                    <span className="ml-2 text-xs uppercase text-slate-400">
                      {d.target_language}
                    </span>
                  </span>
                  <button
                    onClick={() => deleteDictionary(d.id)}
                    className="text-sm text-slate-400 hover:text-red-500 transition"
                    aria-label={`Удалить ${d.name}`}
                  >
                    Удалить
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
