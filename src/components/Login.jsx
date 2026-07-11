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
    <div className="min-h-dvh flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-6 rounded-[28px] p-8
                   bg-panel/35 backdrop-blur-2xl border border-white/15
                   shadow-[0_20px_60px_-15px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.14)]"
      >
        <div className="flex flex-col gap-4">
          <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl font-extrabold
                          bg-gradient-to-br from-accent to-[#8b2fbf]
                          shadow-[inset_0_1px_0_rgba(255,255,255,.25)]">
            V
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">VocabBoost</h1>
            <p className="mt-1 text-sm text-muted">Введите пароль для входа</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="password"
            inputMode="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="пароль"
            className="h-12 rounded-2xl bg-page/40 border border-white/20 px-4 text-base text-ink placeholder:text-muted/55 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          {error && <p className="text-sm text-accent">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="h-12 rounded-2xl text-ink text-base font-bold transition active:scale-[0.99]
                     bg-gradient-to-br from-accent to-[#a52d97] hover:brightness-110
                     shadow-[0_8px_24px_-6px_rgba(224,56,159,.6)]
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? "Проверяем…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
