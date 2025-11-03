// api/[[...all]].js   (קובץ יחיד שמטפל בכל /api/*)
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const {
  ALLOWED_ORIGIN = "https://tau-2032-portal.vercel.app",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,
  BASE_URL = "https://tau-2032-portal.vercel.app",
  ALLOWED_DOMAIN = "mail.tau.ac.il",
} = process.env;

const app = express();
app.set("trust proxy", 1);

app.use(cors({ origin: [ALLOWED_ORIGIN], credentials: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: "none", httpOnly: true, maxAge: 1000*60*60*24*7 },
}));

app.use(passport.initialize());
app.use(passport.session());

const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((o, d) => d(null, o));

passport.use(new GoogleStrategy(
  { clientID: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackURL: CALLBACK_URL },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || "";
    const domain = email.split("@")[1]?.toLowerCase() || "";
    if (!email || domain !== ALLOWED_DOMAIN) return done(null, false, { message: "domain_not_allowed" });
    return done(null, { email });
  }
));

app.get("/api/auth/google", passport.authenticate("google", {
  scope: ["email", "profile", "openid"],
  hd: ALLOWED_DOMAIN,
  prompt: "select_account",
  callbackURL: CALLBACK_URL,
}));

app.get("/api/auth/google/callback",
  passport.authenticate("google", { callbackURL: CALLBACK_URL, failureRedirect: `${CLIENT_URL}?login=failed` }),
  (_req, res) => res.redirect(CLIENT_URL)
);

app.get("/api/session", (req, res) => res.json({ user: req.user ?? null }));
app.post("/api/logout", (req, res) => { req.logout?.(() => req.session.destroy?.(() => res.json({ ok: true })) ); });
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// חשוב: זה ה־export הנכון ל־@vercel/node
export default function handler(req, res) {
  return app(req, res);
}
