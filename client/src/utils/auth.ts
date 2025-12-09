  // client/src/utils/auth.ts
import { setCachedUser, clearCachedUser } from "./sessionCache";

export type Role = "admin" | "vaad" | "course-vaad" | "user" | "guest";
export type User = { email: string;  name?: string; role: Role;   managedCourses?: string[]; } | null;

  // החזר את שתי הפונקציות האלו ↓
export function getDomain(email: string | null | undefined) {
  if (!email) return "";
  return (email.split("@")[1] || "").toLowerCase();
}


 export function isTauEmail(email: string | null | undefined) {
  return getDomain(email) === "mail.tau.ac.il";
}

export async function fetchSession(): Promise<User> {
  const res = await fetch("/api/session", { credentials: "include", cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(`session ${res.status}`);
  if (!ct.includes("application/json")) return null;
  const data = await res.json();
  const user = (data?.user ?? null) as User;
  setCachedUser(user);              
  return user;
}



  export function startGoogleLogin() {
    const cb = crypto?.randomUUID?.() || Date.now();
    window.location.href = `/api/auth/google?prompt=select_account&_cb=${cb}`;
  }



export async function logout() {
  const res = await fetch("/api/logout", { method: "POST", credentials: "include", cache: "no-store" });
  clearCachedUser();                  
  return res.ok ? res.json() : { ok: false };
}
