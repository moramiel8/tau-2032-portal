export type User = { email: string; inTauGroup: boolean };

const API = import.meta.env.VITE_API_URL;
const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? "/api";

export async function fetchSession(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/session`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export function startGoogleLogin() {
  window.location.href = `${API}/auth/google`;
}

export const getDomain = (email?: string) => (email || "").split("@")[1] || "";
export const isTauEmail = (email?: string) =>
  ["mail.tau.ac.il", "tauex.tau.ac.il"].includes(getDomain(email));
