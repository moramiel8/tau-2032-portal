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

// --------------------------------------------------------------------

const app = express();
app.set("trust proxy", 1);

// ✅ לאפשר credentials בין דומיינים (חשוב מאוד)
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
}));

// ✅ cookie-session – חובה secure+sameSite:none כדי לעבוד עם cross-domain
app.use(cookieSession({
  name: "sid",
  keys: [SESSION_SECRET],
  maxAge: 1000 * 60 * 60 * 24 * 7,
  sameSite: "none",
  secure: true,
  httpOnly: true,
}));

// shim עבור cookie-session (דרוש בסביבת Vercel)
app.use((req, _res, next) => {
  if (req.session && typeof req.session.regenerate !== "function") {
    req.session.regenerate = (cb) => cb && cb();
  }
  if (req.session && typeof req.session.save !== "function") {
    req.session.save = (cb) => cb && cb();
  }
  next();
});

// --------------------------------------------------------------------

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((u, done) => done(null, u));
passport.deserializeUser((o, done) => done(null, o));

const CALLBACK = `${BASE_URL}/api/auth/google/callback`;

passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK,
  },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || "";
    const domain = email.split("@")[1]?.toLowerCase() || "";
    console.log("[srv] Google login for:", email);
    if (!email || domain !== ALLOWED_DOMAIN) {
      return done(null, false, { message: "domain_not_allowed" });
    }
    return done(null, { email });
  }
));

// --------------------------------------------------------------------
// שלב 1 – התחלה של ההתחברות
app.get("/api/auth/google", (req, res, next) => {
  console.log("[srv] Initiating Google login...");
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
    callbackURL: `${BASE_URL}/api/auth/google/callback`, // ✅ חובה
  })(req, res, next);
});

app.get("/api/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", {
    callbackURL: `${BASE_URL}/api/auth/google/callback`, // ✅ גם כאן חובה
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


// --------------------------------------------------------------------
// בדיקת session
app.get("/api/session", (req, res) => {
  console.log("[srv] /api/session -> req.user:", req.user);
  res.json({ user: req.user ?? null });
});

// יציאה
app.post("/api/logout", (req, res) => {
  req.logout?.();
  req.session = null;
  res.json({ ok: true });
});

// --------------------------------------------------------------------
// ייצוא ל־Vercel
export default function handler(req, res) {
  return app(req, res);
}
