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
    <div className="min-h-dvh flex items-center justify-center bg-page px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel border-2 border-accent rounded-2xl p-8 flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="inline-block self-start bg-accent text-ink px-2 py-0.5 text-lg font-bold tracking-tight">
            VocabBoost
          </h1>
          <p className="mt-2 text-sm text-muted">Введите пароль для входа.</p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="password"
            inputMode="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="пароль"
            className="h-12 rounded-xl bg-page/60 border border-edge px-4 text-base text-ink placeholder:text-muted/60 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          {error && <p className="text-sm text-accent">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="h-12 rounded-xl bg-accent text-ink text-base font-bold transition active:scale-[0.99] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Проверяем…" : "Войти →"}
        </button>
      </form>
    </div>
  );
}
