// client/src/utils/auth.ts
export type User = { email: string } | null;

// תמיד נקבע כתובת שרת אמינה (ENV או ברירת מחדל)
const API_URL: string =
  (import.meta as any)?.env?.VITE_API_URL ||
  "https://tau-2032-portal-server.vercel.app";

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
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch (e) {
    console.warn("[auth] fetchSession failed:", e);
    return null;
  }
}

// התחברות – חשוב להפנות לשרת (לא לפרונט)
export function startGoogleLogin() {
  const url = `${API_URL}/api/auth/google?prompt=select_account`;
  console.log("[auth] redirecting to:", url);
  window.location.href = url;
}

// התנתקות
export async function logout() {
  try {
    const url = `${API_URL}/api/logout`;
    console.log("[auth] POST", url);
    await fetch(url, { method: "POST", credentials: "include" });
  } catch (e) {
    console.warn("[auth] logout failed:", e);
  }
}
