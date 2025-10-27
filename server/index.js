import express from "express";
import session from "express-session";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config(); // חייב להיות לפני כל שימוש ב־process.env

// ---- קריאת משתני סביבה עם ברירות מחדל נוחות ----
// ... ה-importים והdotenv.config כרגיל ...

const {
  PORT = 3001,
  ALLOWED_ORIGIN = "https://tau-2032-portal-a1dd.vercel.app",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,
  BASE_URL = `https://tau-2032-portal-server.vercel.app`,
  ALLOWED_DOMAIN = "mail.tau.ac.il",
} = process.env;

if (!SESSION_SECRET) { console.error("Missing SESSION_SECRET"); process.exit(1); }

const app = express();
app.set("trust proxy", 1);

// CORS – לאפשר קבצים עם cookies מהקליינט
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

// Session – cross-site requires secure+SameSite=None
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,        // HTTPS חובה בפרודקשן/Vercel
    sameSite: "none",    // כי הקליינט בדומיין אחר
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((o, d) => d(null, o));

// Google OAuth
passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/auth/google/callback`,
  },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || "";
    const domain = email.split("@")[1]?.toLowerCase() || "";
    if (!email || (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN.toLowerCase())) {
      return done(null, false, { message: "domain_not_allowed" });
    }
    return done(null, { email });
  }
));

// רמז לגוגל לבחור חשבון TAU + הכרחת בחירה (נוח כשיש כמה חשבונות)
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}?login=failed` }),
  (req, res) => res.redirect(CLIENT_URL)
);

app.get("/session", (req, res) => res.json({ user: req.user ?? null }));

app.post("/logout", (req, res) => {
  req.logout(() => req.session.destroy(() => res.json({ ok: true })));
});

app.listen(PORT, () => console.log(`Auth server on ${BASE_URL}`));

