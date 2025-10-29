// client/src/utils/auth.ts
export type User = { email: string; inTauGroup?: boolean } | null;

// PROD => "" (נתיב יחסי), DEV => VITE_API_URL אם קיים (לא חובה)
const API_BASE = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "");
const api = (path: string) => `${API_BASE}${path}`;

export function getDomain(email: string) {
  return (email.split("@")[1] || "").toLowerCase();
}
export function isTauEmail(email: string) {
  const d = getDomain(email);
  return d === "mail.tau.ac.il" || d === "tauex.tau.ac.il";
}

async function fetchJson<T = any>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init, headers: { Accept: "application/json", ...(init.headers || {}) }});
  let data: any = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return data as T;
}

export async function fetchSession(): Promise<User> {
  const data = await fetchJson<{ user: User }>(api("/api/session"));
  return data?.user ?? null;
}
export function startGoogleLogin() {
  window.location.assign(api("/api/auth/google?prompt=select_account"));
}


export async function logout() {
  await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include',
  });
}