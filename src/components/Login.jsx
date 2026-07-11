import { useState } from "react";
import { setSecret, clearSecret, api } from "../api";

// Secret-input screen. On submit we store the secret and make one probe request
// (GET /dictionaries) to verify it: 200 -> logged in, 401 -> wrong password.
export default function Login({ onSuccess }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const secret = value.trim();
    if (!secret || loading) return;

    setLoading(true);
    setError("");
    setSecret(secret);
    try {
      await api("/dictionaries");
      onSuccess();
    } catch (err) {
      clearSecret();
      setError(
        err.status === 401 ? "Неверный пароль" : "Ошибка соединения. Попробуйте ещё раз."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col gap-6"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">VocabBoost</h1>
          <p className="mt-1 text-sm text-slate-500">Введите пароль для входа</p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="password"
            inputMode="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Пароль"
            className="h-12 rounded-2xl border border-slate-200 px-4 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="h-12 rounded-2xl bg-indigo-600 text-white text-base font-medium transition active:scale-[0.99] hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Проверяем…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
