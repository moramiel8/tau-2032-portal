export type User = { email: string; inTauGroup: boolean };

// כתובת השרת: בפרודקשן מוגדר ב־Vercel כ-VITE_API_URL,
// בלוקאל נשתמש ב-3001.
const API = import.meta.env.VITE_API_URL; // https://tau-2032-portal-server.vercel.app
// --- API calls ---

export async function fetchSession(): Promise<User | null> {
  try {
    const res = await fetch(`${API}/session`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export function startGoogleLogin() {
  // נכון: רק לנתיב /auth/google בשרת
  window.location.href = `${API}/auth/google`;
}

// --- Utils ---

export const getDomain = (email?: string) => (email || "").split("@")[1] || "";

// עדיף לאכוף tau.ac.il (ככה גם השרת שלך מוגדר)
export const isTauEmail = (email?: string) =>
  ["tau.ac.il", "mail.tau.ac.il", "tauex.tau.ac.il"].includes(getDomain(email));
