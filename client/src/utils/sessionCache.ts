// שמירת משתמש ל-localStorage + סנכרון בין טאבים
import type { User } from "./auth";

const KEY = "tau_user_v1";

export function getCachedUser(): User {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
}

export function setCachedUser(user: User) {
  try { localStorage.setItem(KEY, JSON.stringify(user)); } catch {}
}

export function clearCachedUser() {
  try { localStorage.removeItem(KEY); } catch {}
}
