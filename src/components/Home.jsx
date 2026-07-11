import { useEffect, useState } from "react";
import { api, clearSecret } from "../api";

// Placeholder home screen: confirms the login works by loading the profile's
// dictionaries. The real dictionary/folders/words UI comes next.
export default function Home({ onLogout }) {
  const [dictionaries, setDictionaries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/dictionaries")
      .then(setDictionaries)
      .catch((err) => {
        // Secret went stale -> bounce back to the login screen.
        if (err.status === 401) logout();
        else setError("Не удалось загрузить словари");
      });
  }, []);

  function logout() {
    clearSecret();
    onLogout();
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

      <main className="max-w-md mx-auto px-5 py-6">
        <h2 className="text-sm font-medium text-slate-500 mb-3">Словари</h2>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {dictionaries === null && !error && (
          <p className="text-sm text-slate-400">Загрузка…</p>
        )}

        {dictionaries !== null && dictionaries.length === 0 && (
          <p className="text-sm text-slate-400">
            Пока пусто. Скоро здесь появятся словари.
          </p>
        )}

        {dictionaries !== null && dictionaries.length > 0 && (
          <ul className="flex flex-col gap-2">
            {dictionaries.map((d) => (
              <li
                key={d.id}
                className="rounded-2xl border border-slate-100 bg-white px-4 py-3"
              >
                <span className="font-medium text-slate-900">{d.name}</span>
                <span className="ml-2 text-xs uppercase text-slate-400">
                  {d.target_language}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
