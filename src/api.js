// Tiny API client. The secret (per-profile password) lives in localStorage and
// is sent as the X-Secret header on every request; the worker resolves the
// profile from it. A 401 means the secret is missing/invalid.

const SECRET_KEY = "vocab_secret";

export function getSecret() {
  return localStorage.getItem(SECRET_KEY);
}

export function setSecret(secret) {
  localStorage.setItem(SECRET_KEY, secret);
}

export function clearSecret() {
  localStorage.removeItem(SECRET_KEY);
}

export async function api(path, options = {}) {
  const secret = getSecret();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(secret ? { "X-Secret": secret } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = new Error(`request_failed_${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
