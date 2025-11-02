// api/index.js
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieSession from "cookie-session";
import dotenv from "dotenv";

dotenv.config();

const {
  ALLOWED_ORIGIN = "https://tau-2032-portal.vercel.app", // ה-Frontend
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,                            // לאן לחזור אחרי התחברות
  BASE_URL = "https://tau-2032-portal-server.vercel.app", // הדומיין של השרת הזה!
  ALLOWED_DOMAIN = "mail.tau.ac.il",
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SESSION_SECRET) {
  console.error("[srv] Missing envs"); process.exit(1);
}

const app = express();
app.set("trust proxy", 1);

// 1) CORS – לאפשר cookies cross-site
app.use(cors({ origin: [ALLOWED_ORIGIN], credentials: true }));

// 2) cookie-session – חייב לפני passport.session()
app.use(cookieSession({
  name: "sid",
  keys: [SESSION_SECRET],
  maxAge: 1000 * 60 * 60 * 24 * 7,
  sameSite: "none",
  secure: true,        // חובה בפרודקשן/Vercel
  httpOnly: true,
}));

// 3) ✨ SHIM ל-passport@0.6 עם cookie-session
app.use((req, _res, next) => {
  if (req.session && typeof req.session.regenerate !== "function") {
    req.session.regenerate = (cb) => cb && cb();
  }
  if (req.session && typeof req.session.save !== "function") {
    req.session.save = (cb) => cb && cb();
  }
  next();
});

// 4) passport init + session (אחרי cookie-session + shim)
app.use(passport.initialize());
app.use(passport.session());

// ---- Google OAuth ----
const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;
console.log("[srv] CLIENT_URL =", CLIENT_URL);
console.log("[srv] BASE_URL   =", BASE_URL);
console.log("[srv] CALLBACK   =", CALLBACK_URL);

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((o, d) => d(null, o));

passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
  },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || "";
    const domain = email.split("@")[1]?.toLowerCase() || "";
    console.log("[srv] Google email:", email, "domain:", domain);
    if (!email || domain !== ALLOWED_DOMAIN) {
      return done(null, false, { message: "domain_not_allowed" });
    }
    return done(null, { email });
  }
));

// 5) שלב 1 – הפניה לגוגל (עם אותו callbackURL)
app.get("/api/auth/google", (req, res, next) => {
  console.log("[srv] /api/auth/google → callbackURL:", CALLBACK_URL);
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
    callbackURL: CALLBACK_URL,
  })(req, res, next);
});

// 6) שלב 2 – callback (keepSessionInfo חשוב לשימור ה-session)
app.get("/api/auth/google/callback", (req, res, next) => {
  console.log("[srv] HIT callback:", req.originalUrl);
  passport.authenticate("google", {
    callbackURL: CALLBACK_URL,
    keepSessionInfo: true,
  }, (err, user, info) => {
    console.log("[srv callback] err:", err, "user:", user, "info:", info);
    if (err || !user) return res.redirect(`${CLIENT_URL}?login=failed`);
    req.logIn(user, (e) => {
      if (e) return res.redirect(`${CLIENT_URL}?login=failed`);
      return res.redirect(CLIENT_URL);
    });
  })(req, res, next);
});

// עזר
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/session", (req, res) => res.json({ user: req.user ?? null }));

app.post("/api/logout", (req, res) => {
  req.logout?.();
  req.session = null; // cookie-session
  res.json({ ok: true });
});

export default function handler(req, res) {
  return app(req, res);
}
