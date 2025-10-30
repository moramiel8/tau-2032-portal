// client/src/utils/auth.ts
export type User = { email: string } | null;

// כתובת השרת מתוך משתנה הסביבה
const API = import.meta.env.VITE_API_URL as string; // לדוגמה: "https://tau-2032-portal-server.vercel.app"

// ---------- פונקציות עזר לדומיין ----------
export function getDomain(email: string) {
  return (email.split("@")[1] || "").toLowerCase();
}

export function isTauEmail(email: string) {
  const d = getDomain(email);
  return d === "mail.tau.ac.il";
}

// ---------- API ----------

// שליפת session (בודק אם מחובר)
export async function fetchSession(): Promise<User> {
  try {
    const res = await fetch(`${API}/api/session`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

// התחברות עם גוגל
export function startGoogleLogin() {
  window.location.href = `${API}/api/auth/google?prompt=select_account`;
}

// התנתקות
export async function logout() {
  await fetch(`${API}/api/logout`, {
    method: "POST",
    credentials: "include",
  });
}
