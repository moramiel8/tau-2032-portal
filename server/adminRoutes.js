// server/index.js
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import dotenv from "dotenv";

import adminRouter, {
  requireAuth,
  requireAdminLike,
} from "./adminRoutes.js";

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
const VAAD_EMAILS = []; // JS רגיל

function getRole(email) {
  if (ADMIN_EMAILS.includes(email)) return "admin";
  if (VAAD_EMAILS.includes(email)) return "vaad";
  return "student";
}

const app = express();
app.use(express.json());
app.set("trust proxy", 1);

app.use(
  cors({
    origin: [ALLOWED_ORIGIN],
    credentials: true,
  })
);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

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
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value || "";
      const domain = email.split("@")[1]?.toLowerCase() || "";

      if (!email || domain !== ALLOWED_DOMAIN) {
        return done(null, false, { message: "domain_not_allowed" });
      }

      const role = getRole(email);
      return done(null, { email, role });
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

// --- ⬅️ כאן חשוב: חיבור adminRouter ---
app.use("/api/admin", requireAuth, requireAdminLike, adminRouter);

// --- misc API ---
app.get("/api/session", (req, res) => {
  res.json({ user: req.user ?? null });
});

app.post("/api/logout", (req, res) => {
  if (req.logout) {
    req.logout(() => {
      req.session?.destroy(() => res.json({ ok: true }));
    });
  } else {
    res.json({ ok: true });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

export default app;
