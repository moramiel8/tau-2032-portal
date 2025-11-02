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

app.use(
  cors({
    origin: [ALLOWED_ORIGIN],
    credentials: true,
  })
);

app.use(
  cookieSession({
    name: "sid",
    keys: [SESSION_SECRET],
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: "none",
    secure: true,
    httpOnly: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;
console.log("[srv] CALLBACK_URL =", CALLBACK_URL);

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((o, d) => d(null, o));

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
      console.log("[srv] login email:", email);
      if (!email || domain !== ALLOWED_DOMAIN) {
        return done(null, false, { message: "domain_not_allowed" });
      }
      return done(null, { email });
    }
  )
);

// פונקציה שמוסיפה regenerate/save אם חסר
function patchSession(req) {
  if (!req.session) req.session = {};
  if (typeof req.session.regenerate !== "function")
    req.session.regenerate = (cb) => cb && cb();
  if (typeof req.session.save !== "function")
    req.session.save = (cb) => cb && cb();
}

// --- ROUTES ---
app.get("/api/auth/google", (req, res, next) => {
  patchSession(req);
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
    callbackURL: CALLBACK_URL,
  })(req, res, next);
});

app.get("/api/auth/google/callback", (req, res, next) => {
  // 🟢 דריסה מיידית לפני כל דבר:
  patchSession(req);

  try {
    passport.authenticate(
      "google",
      { callbackURL: CALLBACK_URL, keepSessionInfo: true },
      (err, user, info) => {
        patchSession(req); // 🟢 לוודא שוב בתוך הקולבק
        if (err) {
          console.error("[srv callback] ERROR:", err);
          return res.status(500).type("text/plain").send(err.message);
        }
        if (!user) {
          console.warn("[srv callback] No user, info:", info);
          return res.redirect(`${CLIENT_URL}?login=failed`);
        }

        // 🟢 עוטפים גם את req.logIn כדי למנוע קריסה
        if (typeof req.logIn !== "function") {
          req.logIn = (u, cb) => cb && cb();
        }

        req.logIn(user, (e) => {
          if (e) {
            console.error("[srv callback] logIn error:", e);
            return res.redirect(`${CLIENT_URL}?login=failed`);
          }
          console.log("[srv] Logged in:", user.email);
          return res.redirect(CLIENT_URL);
        });
      }
    )(req, res, next);
  } catch (e) {
    console.error("CRASH in callback:", e);
    res.status(500).send(e?.stack || String(e));
  }
});

app.get("/api/session", (req, res) => {
  res.json({ user: req.user ?? null });
});

app.post("/api/logout", (req, res) => {
  req.logout?.();
  req.session = null;
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

export default function handler(req, res) {
  return app(req, res);
}
