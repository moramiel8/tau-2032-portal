// api/index.js
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieSession from "cookie-session";
import dotenv from "dotenv";

dotenv.config();

const {
  ALLOWED_ORIGIN = "https://tau-2032-portal.vercel.app",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,
  BASE_URL = "https://tau-2032-portal-server.vercel.app",
  ALLOWED_DOMAIN = "mail.tau.ac.il",
} = process.env;

const app = express();
app.set("trust proxy", 1);

// 🟡 1) shim לפני הכל
app.use((req, _res, next) => {
  if (!req.session) req.session = {};
  if (typeof req.session.regenerate !== "function") req.session.regenerate = (cb) => cb && cb();
  if (typeof req.session.save !== "function") req.session.save = (cb) => cb && cb();
  next();
});

// 2) cookie-session
app.use(cookieSession({
  name: "sid",
  keys: [SESSION_SECRET],
  maxAge: 1000 * 60 * 60 * 24 * 7,
  sameSite: "none",
  secure: true,
  httpOnly: true,
}));

// 3) CORS
app.use(cors({ origin: [ALLOWED_ORIGIN], credentials: true }));

// 4) Passport
app.use(passport.initialize());
app.use(passport.session());

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
    // 🟡 דיבאג מלא של הפרופיל
    const email = profile.emails?.[0]?.value || "";
    const domain = email.split("@")[1]?.toLowerCase() || "";
    console.log("[srv] Google email:", email, "domain:", domain);
    if (!email) return done(new Error("No email returned from Google"));
    if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) {
      return done(null, false, { message: "domain_not_allowed", domain });
    }
    return done(null, { email });
  }
));

// --- Routes ---
app.get("/api/auth/google", (req, res, next) => {
  console.log("[srv] /api/auth/google → callbackURL:", CALLBACK_URL);
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
    callbackURL: CALLBACK_URL,
  })(req, res, next);
});

// 🟡 callback עם טעינת שגיאה שקופה
app.get("/api/auth/google/callback", (req, res, next) => {
  console.log("[srv] HIT callback:", req.originalUrl);
  passport.authenticate(
    "google",
    { callbackURL: CALLBACK_URL, keepSessionInfo: true },
    (err, user, info) => {
      // אם משהו נפל — תחזיר טקסט ברור כדי שנראה מה קורה בדפדפן/לוגים
      if (err) {
        console.error("[srv callback] ERROR:", err);
        return res
          .status(500)
          .type("text/plain")
          .send(
            `OAuth error:\n${err?.stack || err?.message || err}\n\n` +
            `info: ${JSON.stringify(info)}\n` +
            `cookies? ${JSON.stringify(req.headers.cookie || null)}\n` +
            `sid? ${JSON.stringify(req.session || null)}\n`
          );
      }
      if (!user) {
        console.warn("[srv callback] No user. info:", info);
        return res
          .status(401)
          .type("text/plain")
          .send(`No user from Google. info=${JSON.stringify(info)}`);
      }
      req.logIn(user, (e) => {
        if (e) {
          console.error("[srv callback] req.logIn error:", e);
          return res
            .status(500)
            .type("text/plain")
            .send(`login error: ${e?.stack || e}`);
        }
        // הצלחה
        return res.redirect(CLIENT_URL);
      });
    }
  )(req, res, next);
});

app.get("/api/session", (req, res) => res.json({ user: req.user ?? null }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/logout", (req, res) => {
  req.logout?.();
  req.session = null;
  res.json({ ok: true });
});

export default function handler(req, res) {
  return app(req, res);
}
