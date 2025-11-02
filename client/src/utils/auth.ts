export type User = { email: string } | null;


// ⚠️ נפילה שקטה כשאין env גורמת לבקשות יחסיות. נשתמש בגיבוי קשיח.
const API_URL = import.meta.env.VITE_API_URL ||
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
    const res = await fetch(`${API}/api/session`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch (e) {
    console.warn("[auth] fetchSession failed:", e);
    return null;
  }
}

/*export function startGoogleLogin() {
  const url = `${API}/api/auth/google?prompt=select_account`;
  console.log("[auth] redirecting to:", url);
  window.location.href = url;
}*/

export function startGoogleLogin() {
  window.location.href = `${API_URL}/api/auth/google`; // ✅ מפנה לשרת
}

export async function logout() {
  console.log("[auth] POST", `${API}/api/logout`);
  await fetch(`${API}/api/logout`, { method: "POST", credentials: "include" });
}
