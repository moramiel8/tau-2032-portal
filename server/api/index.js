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

// CORS
app.use(cors({ origin: [ALLOWED_ORIGIN], credentials: true }));

// cookie-session לכל ריקווסט (ידידותי ל-serverless)
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

// שימּים ל-passport עם cookie-session
app.use((req, _res, next) => {
  if (req.session && typeof req.session.regenerate !== "function") {
    req.session.regenerate = (cb) => cb && cb();
  }
  if (req.session && typeof req.session.save !== "function") {
    req.session.save = (cb) => cb && cb();
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((o, d) => d(null, o));

const CALLBACK = `${BASE_URL}/api/auth/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK,
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value || "";
      const domain = email.split("@")[1]?.toLowerCase() || "";
      if (!email || domain !== ALLOWED_DOMAIN) {
        return done(null, false, { message: "domain_not_allowed" });
      }
      return done(null, { email });
    }
  )
);

// ראוטים – כולם תחת /api
app.get(
  "/api/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
  })
);

app.get("/api/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
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

// ⚠️ אין app.listen ב-Vercel!
// במקום זאת מייצאים handler שעוטף את Express:
export default function handler(req, res) {
  return app(req, res);
}
