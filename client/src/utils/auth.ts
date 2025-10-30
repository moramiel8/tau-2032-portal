// client/src/utils/auth.ts
const API = import.meta.env.VITE_API_URL as string; // https://tau-2032-portal-server.vercel.app

export function startGoogleLogin() {
  window.location.href = `${API}/api/auth/google?prompt=select_account`;
}
export async function fetchSession() {
  const r = await fetch(`${API}/api/session`, { credentials: "include" });
  return (await r.json())?.user ?? null;
}
export async function logout() {
  await fetch(`${API}/api/logout`, { method: "POST", credentials: "include" });
}
