// server/index.js
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import { query } from "./db.js";
import adminRouter, {
  requireAuth,
  getEffectiveRole,
  requireAdminLike,
  getDisplayNameForEmail,
} from "../api/adminRoutes.js";

dotenv.config();

const {
  ALLOWED_ORIGIN = "https://tau-2032-portal.vercel.app",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,
  BASE_URL = "https://tau-2032-portal.vercel.app",
  ALLOWED_DOMAIN = "mail.tau.ac.il",
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SESSION_SECRET) {
  console.error("[srv] Missing envs");
  throw new Error("Missing envs");
}

const ADMIN_EMAILS = ["morrabaev@mail.tau.ac.il"];
const VAAD_EMAILS = [];

function getRole(email) {
  if (ADMIN_EMAILS.includes(email)) return "admin";
  if (VAAD_EMAILS.includes(email)) return "vaad";
  return "student";
}

const app = express();
app.use(express.json());
app.set("trust proxy", 1);

const isProd = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: [ALLOWED_ORIGIN, "http://localhost:5173"],
    credentials: true,
  })
);

// ---- STATIC UPLOADS ----
let uploadRoot = null;

try {
  if (process.env.NODE_ENV !== "production") {
    uploadRoot = path.join(process.cwd(), "uploads");
  } else {
    uploadRoot = path.join("/tmp", "uploads");
  }

  fs.mkdirSync(uploadRoot, { recursive: true });

  app.use("/api/uploads", express.static(uploadRoot));
  console.log("[srv] uploads dir ready:", uploadRoot);
} catch (err) {
  console.error("[srv] failed to init uploads dir, disabling uploads", err);
  uploadRoot = null;
}

export { uploadRoot };

// -------- cookie-session --------
app.use(
  cookieSession({
    name: "tau_sess",
    keys: [SESSION_SECRET],
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
);

// polyfill ל-passport + cookie-session
app.use((req, _res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => cb();
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => cb();
  }
  next();
});

// -------- Passport --------
app.use(passport.initialize());
app.use(passport.session());

const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;
console.log("[srv] BOOT:", { CLIENT_URL, BASE_URL, CALLBACK_URL });

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || "";
        const domain = email.split("@")[1]?.toLowerCase() || "";

        if (!email || domain !== ALLOWED_DOMAIN) {
          return done(null, false, { message: "domain_not_allowed" });
        }

        const role = await getEffectiveRole(email);
        return done(null, { email, role });
      } catch (err) {
        console.error("[GoogleStrategy] failed to resolve role", err);
        return done(err);
      }
    }
  )
);

// --- auth routes ---
app.get(
  "/api/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
    callbackURL: CALLBACK_URL,
  })
);

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    callbackURL: CALLBACK_URL,
    failureRedirect: `${CLIENT_URL}?login=failed`,
  }),
  (req, res) => res.redirect(CLIENT_URL)
);

if (process.env.NODE_ENV !== "production") {
  app.get("/api/dev/login-as/:email", async (req, res) => {
    const email = req.params.email;
    const role = await getEffectiveRole(email);

    req.session.regenerate(() => {
      req.session.passport = { user: { email, role } };
      res.json({ ok: true, email, role });
    });
  });
}

// --- admin API ---
app.use("/api/admin", requireAuth, adminRouter);

// --- misc API ---
app.get("/api/session", (req, res) => {
  res.json({ user: req.user ?? null });
});

app.post("/api/logout", (req, res) => {
  if (req.logout) {
    req.logout(() => {
      req.session = null;
      res.json({ ok: true });
    });
  } else {
    res.json({ ok: true });
  }
});

// תוכן קורס ציבורי (לסטודנטים)
app.get("/api/course-content/:courseId", async (req, res) => {
  const { courseId } = req.params;

  try {
    const result = await query(
      "SELECT content FROM course_content WHERE course_id = $1",
      [courseId]
    );

    if (result.rows.length === 0) {
      return res.json({ exists: false, content: null });
    }

    return res.json({
      exists: true,
      content: result.rows[0].content,
    });
  } catch (err) {
    console.error("[GET /api/course-content/:courseId] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// --- public homepage content (students) ---
app.get("/api/homepage", async (_req, res) => {
  try {
    const result = await query(
      "SELECT data FROM homepage_content WHERE id = 'main' LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.json({
        exists: false,
        content: {
          heroTitle: "ברוכים הבאים לאתר מחזור 2032",
          heroSubtitle: "כל המידע, הקישורים והחומרים במקום אחד",
          introText: "",
        },
      });
    }

    return res.json({
      exists: true,
      content: result.rows[0].data,
    });
  } catch (err) {
    console.error("[GET /api/homepage] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ---- helper למודעות ציבוריות (כולל שם אם קיים) ----
async function mapAnnouncementRow(row) {
  const email = row.author_email || null;
  const displayName = email ? await getDisplayNameForEmail(email) : null;

  return {
    id: String(row.id),
    title: row.title,
    body: row.body,
    courseId: row.course_id,
    createdAt: row.created_at,
    updatedAt: row.created_at, // כרגע אין updated_at בטבלה – נשתמש ב-created
    authorEmail: email,
    authorName: displayName,
  };
}

// --- public announcements (students) ---
app.get("/api/announcements", async (req, res) => {
  const { courseId } = req.query;

  try {
    let sql = `
      SELECT id, title, body, course_id, created_at, author_email
      FROM announcements
    `;
    const params = [];

    if (courseId) {
      sql += ` WHERE course_id = $1 OR course_id IS NULL `;
      params.push(courseId);
    } else {
      sql += ` WHERE course_id IS NULL `;
    }

    sql += ` ORDER BY created_at DESC LIMIT 20`;

    const result = await query(sql, params);
    const items = await Promise.all(result.rows.map(mapAnnouncementRow));

    res.json({ items });
  } catch (err) {
    console.error("[GET /api/announcements] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// --- public course-content list for homepage ---
app.get("/api/course-content", async (_req, res) => {
  try {
    const result = await query(
      "SELECT course_id, content FROM course_content ORDER BY course_id"
    );

    res.json({
      items: result.rows.map((row) => ({
        courseId: row.course_id,
        content: row.content,
      })),
    });
  } catch (err) {
    console.error("[GET /api/course-content] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// אילו קורסים המשתמש הוא ועד שלהם
app.get("/api/my/course-vaad", async (req, res) => {
  const user = req.user;
  if (!user?.email) {
    return res.status(200).json({ courseIds: [] });
  }

  try {
    const result = await query(
      "SELECT course_ids FROM course_vaad WHERE LOWER(email) = LOWER($1)",
      [user.email]
    );

    const courseIds = result.rows.flatMap((row) => row.course_ids || []);
    res.json({ courseIds });
  } catch (err) {
    console.error("[GET /api/my/course-vaad] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log("[srv] Listening on port", PORT);
  });
}
