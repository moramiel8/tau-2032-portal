// api/index.js
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieSession from "cookie-session";
import dotenv from "dotenv";

dotenv.config();

const {
  ALLOWED_ORIGIN = "https://tau-2032-portal.vercel.app", // דומיין הפרונט
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,                            // דף נחיתה אחרי התחברות
  BASE_URL = "https://tau-2032-portal-server.vercel.app", // דומיין השרת (THIS!)
  ALLOWED_DOMAIN = "mail.tau.ac.il",
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SESSION_SECRET) {
  console.error("[srv] Missing envs"); process.exit(1);
}

const app = express();
app.set("trust proxy", 1);

// CORS + cookies cross-site
app.use(cors({ origin: [ALLOWED_ORIGIN], credentials: true }));

app.use(cookieSession({
  name: "sid",
  keys: [SESSION_SECRET],
  maxAge: 1000 * 60 * 60 * 24 * 7,
  sameSite: "none",
  secure: true,
  httpOnly: true,
}));

// shim ל-cookie-session
app.use((req, _res, next) => {
  if (req.session && typeof req.session.regenerate !== "function") req.session.regenerate = cb => cb && cb();
  if (req.session && typeof req.session.save !== "function") req.session.save = cb => cb && cb();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((o, d) => d(null, o));

const CALLBACK = `${BASE_URL}/api/auth/google/callback`; // חייב להיות זהה לגוגל
console.log("[srv] CLIENT_URL   =", CLIENT_URL);
console.log("[srv] BASE_URL     =", BASE_URL);
console.log("[srv] CALLBACK     =", CALLBACK);
console.log("[srv] ALLOWED_ORIGIN =", ALLOWED_ORIGIN);

passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK,
  },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || "";
    const domain = email.split("@")[1]?.toLowerCase() || "";
    console.log("[srv] Google profile email:", email);
    if (!email || domain !== ALLOWED_DOMAIN) {
      return done(null, false, { message: "domain_not_allowed" });
    }
    return done(null, { email });
  }
));

// ---- חשוב: יש רק ראוט אחד ל־/api/auth/google ----
app.get("/api/auth/google", (req, res, next) => {
  console.log("[srv] /api/auth/google → using callbackURL:", CALLBACK);
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
    callbackURL: CALLBACK, // ← אותו ערך בדיוק
  })(req, res, next);
});

app.get("/api/auth/google/callback", (req, res, next) => {
  console.log("[srv] hit callback:", req.originalUrl);
  passport.authenticate("google", {
    callbackURL: CALLBACK, // ← אותו ערך בדיוק
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

app.get("/api/session", (req, res) => res.json({ user: req.user ?? null }));
app.post("/api/logout", (req, res) => {
  req.logout?.();
  req.session = null;
  res.json({ ok: true });
});

// אין app.listen ב־Vercel – מייצאים handler:
export default function handler(req, res) {
  return app(req, res);
}
