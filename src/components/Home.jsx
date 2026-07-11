import { useEffect, useState } from "react";
import { api, clearSecret } from "../api";

// A dictionary is a language. There are only a handful, so we show them as big
// tiles: existing ones as cards, the rest as "add" tiles (tap = create). One
// dictionary per language — the UI only offers languages you don't have yet.
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
];

export default function Home({ onLogout }) {
  const [dictionaries, setDictionaries] = useState(null);
  const [error, setError] = useState("");
  const [busyCode, setBusyCode] = useState(null);

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

  async function createDictionary(lang) {
    if (busyCode) return;
    setBusyCode(lang.code);
    setError("");
    try {
      const created = await api("/dictionaries", {
        method: "POST",
        body: JSON.stringify({ name: lang.label, target_language: lang.code }),
      });
      setDictionaries((prev) => [created, ...(prev ?? [])]);
    } catch (err) {
      if (err.status === 401) logout();
      else setError("Не удалось создать словарь");
    } finally {
      setBusyCode(null);
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

  // Languages not yet added — offered as "create" tiles.
  const usedCodes = new Set((dictionaries ?? []).map((d) => d.target_language));
  const available = LANGUAGES.filter((l) => !usedCodes.has(l.code));

  return (
    <div className="min-h-dvh bg-page">
      <header className="flex items-center justify-between px-5 h-16 border-b border-edge/40">
        <h1 className="bg-accent text-ink px-2 py-0.5 text-base font-bold tracking-tight">
          VocabBoost
        </h1>
        <button
          onClick={logout}
          className="text-sm text-muted hover:text-ink transition"
        >
          выйти
        </button>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-8">
        {error && <p className="text-sm text-accent">{error}</p>}

        {dictionaries === null && !error && (
          <p className="text-sm text-muted">Загрузка…</p>
        )}

        {/* Existing dictionaries */}
        {dictionaries !== null && dictionaries.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              Ваши словари
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {dictionaries.map((d) => (
                <div
                  key={d.id}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-edge bg-panel py-8"
                >
                  <span className="text-3xl font-bold tracking-tight text-accent">
                    {d.target_language.toUpperCase()}
                  </span>
                  <span className="font-medium text-ink">{d.name}</span>
                  <button
                    onClick={() => deleteDictionary(d.id)}
                    aria-label={`Удалить ${d.name}`}
                    className="absolute top-2 right-3 text-muted hover:text-accent text-lg transition"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add a language */}
        {dictionaries !== null && available.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              {dictionaries.length > 0 ? "Добавить язык" : "Выберите язык"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {available.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => createDictionary(lang)}
                  disabled={busyCode !== null}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-edge/60 bg-panel/30 py-8 transition hover:border-accent hover:bg-panel/60 active:scale-[0.99] disabled:opacity-40"
                >
                  <span className="text-3xl font-bold tracking-tight text-muted">
                    {lang.code.toUpperCase()}
                  </span>
                  <span className="font-medium text-muted">
                    {busyCode === lang.code ? "Добавляем…" : lang.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
