// index.js (שרת)
/*
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import cookieSession from "cookie-session";

dotenv.config();

const {
  PORT = 3001,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = "https://tau-2032-portal.vercel.app",
  BASE_URL = "https://tau-2032-portal-server.vercel.app", 
} = process.env;

const ALLOWED_DOMAIN = "mail.tau.ac.il";
const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;

const app = express();
app.set("trust proxy", 1);

app.use(cookieSession({
  name: "sid",
  keys: [SESSION_SECRET],
  maxAge: 1000 * 60 * 60 * 24 * 7,
  sameSite: "none",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
}));

app.use(cors({
  origin: [CLIENT_URL, "http://localhost:5173"],
  credentials: true,
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ Strategy: עם callbackURL קבוע
passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL, // ← חשוב מאוד
  },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || "";
    const domain = email.split("@")[1]?.toLowerCase() || "";
    console.log("[oauth] email:", email, "domain:", domain);

    if (!email || domain !== ALLOWED_DOMAIN) {
      return done(null, false, { message: "domain_not_allowed" });
    }
    return done(null, { email });
  }
));

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((o, d) => d(null, o));

// שלב 1: להפנות לגוגל (מעבירים אותו callbackURL בשביל ה־safety)
app.get("/api/auth/google", (req, res, next) => {
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
    callbackURL: CALLBACK_URL, // ← אותו ערך
  })(req, res, next);
});

// שלב 2: callback — אותה הגדרה + keepSessionInfo; מחזירים שגיאה מפורטת (זמני!)
app.get("/api/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", {
    callbackURL: CALLBACK_URL,   // ← אותו ערך
    keepSessionInfo: true,
  }, (err, user, info) => {
    console.log("[callback] err:", err, "user:", user, "info:", info);

    if (err) {
      // 🔎 דיבאג זמני: תראה למה זה נופל (redirect_uri, client_secret וכו')
      return res
        .status(500)
        .type("text/plain")
        .send(`OAuth error:\n${err?.message || err}\n\ninfo: ${JSON.stringify(info)}`);
    }
    if (!user) {
      return res.redirect(`${CLIENT_URL}?login=failed`);
    }
    req.logIn(user, (e) => {
      if (e) return res.redirect(`${CLIENT_URL}?login=failed`);
      return res.redirect(CLIENT_URL);
    });
  })(req, res, next);
});

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
//app.listen(PORT, () => console.log(`Auth server listening on ${PORT});
*/