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
export async function fetchSession(): Promise<User> {
  try {
    const res = await fetch(`${API_URL}/api/session`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch (e) {
    console.warn("[auth] fetchSession failed:", e);
    return null;
  }
}

// התחברות – מפנה לשרת (חשוב!)
export function startGoogleLogin() {
  const url = `${API_URL}/api/auth/google?prompt=select_account`;
  console.debug("[auth] redirecting to:", url);
  window.location.href = url;
}

// התנתקות
export async function logout() {
  try {
    const url = `${API_URL}/api/logout`;
    console.debug("[auth] POST", url);
    await fetch(url, { method: "POST", credentials: "include" });
  } catch (e) {
    console.warn("[auth] logout failed:", e);
  }
}
