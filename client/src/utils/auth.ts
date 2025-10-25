// client/src/utils/auth.ts
export type User = { email: string; inTauGroup: boolean };

const ALLOWED_DOMAINS = ["mail.tau.ac.il", "tauex.tau.ac.il"];
export const getDomain = (email?: string) => (email || "").split("@")[1] || "";
export const isTauEmail = (email?: string) => ALLOWED_DOMAINS.includes(getDomain(email));

export async function fetchSession(): Promise<User | null> {
  try {
    const res = await fetch("/api/session", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export function startGoogleLogin() {
  window.location.href = "/api/auth/google?prompt=select_account";
}
