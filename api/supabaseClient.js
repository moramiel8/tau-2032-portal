// api/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// אפשר גם להשתמש ב-SUPABASE_ANON_KEY אם פתחת את ה-bucket לגישה ציבורית לכתיבה,
// אבל להעלאות מהשרת עדיף SERVICE_ROLE.

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[supabaseClient] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

export default supabase;
