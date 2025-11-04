// client/src/utils/auth.ts
// client/src/utils/auth.ts
export type User = { email: string } | null;

// החזר את שתי הפונקציות האלו ↓
export function getDomain(email: string) {
  return (email.split("@")[1] || "").toLowerCase();
}

export function isTauEmail(email: string) {
  return getDomain(email) === "mail.tau.ac.il";
}

// אל תשתמש יותר ב-VITE_API_URL — נשארים same-origin
const API = (p: string) => p; // פשוט מחזיר את הנתיב כמו שהוא

export async function fetchSession() {
  const res = await fetch(API("/api/session"), {
    credentials: "include",
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(`session ${res.status}`);
  if (!ct.includes("application/json")) return null;

  return res.json();
}

export function startGoogleLogin() {
  window.location.href = API("/api/auth/google?prompt=select_account");
}

export async function logout() {
  const res = await fetch(API("/api/logout"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  return res.ok ? res.json() : { ok: false };
}

// אופציונלי: מחיקת הלוג הישן
// console.debug("[auth] API_URL =", API_URL);
