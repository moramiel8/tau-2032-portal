// client/src/utils/auth.ts
export type User = { email: string } | null;

const API_URL =
  (import.meta.env.VITE_API_URL as string) ||
  "https://tau-2032-portal-server.vercel.app";

if (typeof window !== "undefined") {
  // לוג חד-פעמי לעזרה בדיבאג
  console.debug("[auth] API_URL =", API_URL);
}

// ---------- helpers ----------
export function getDomain(email: string) {
  return (email.split("@")[1] || "").toLowerCase();
}
export function isTauEmail(email: string) {
  return getDomain(email) === "mail.tau.ac.il";
}

// ---------- API ----------
export async function fetchSession() {
  const res = await fetch(`/api/session`, { credentials: 'include' });
  return res.ok ? (await res.json()).user ?? null : null;
}
export function startGoogleLogin() {
  window.location.href = `/api/auth/google?prompt=select_account`;
}
export async function logout() {
  await fetch(`/api/logout`, { method: 'POST', credentials: 'include' });
}
