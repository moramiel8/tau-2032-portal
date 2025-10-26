import express from "express";
import session from "express-session";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config(); // חייב להיות לפני כל שימוש ב־process.env

// ---- קריאת משתני סביבה עם ברירות מחדל נוחות ----
const {
  PORT = 3001,
  ALLOWED_ORIGIN = "http://localhost:5173",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,                 // הכתובת של הקליינט (לרידיירקטים)
  BASE_URL = `http://localhost:${PORT}`,       // הכתובת של השרת (לקולבק של גוגל)
  ALLOWED_DOMAIN = "",                         // example.com אם רוצים להגביל דומיין
} = process.env;

// ---- ולידציות בסיסיות ----
if (!SESSION_SECRET) {
  console.error("Missing SESSION_SECRET in .env");
  process.exit(1);
}
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .env (OAuth will fail).");
}

const app = express();
app.set("trust proxy", 1);

// ---- CORS ----
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
  })
);

// ---- Session ----
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // שימי true בפרודקשן עם HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// ---- Passport ----
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/auth/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value || "";
      const domain = email.split("@")[1] || "";
      if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) {
        return done(null, false, { message: "domain_not_allowed" });
      }
      const user = { email, inTauGroup: true };
      return done(null, user);
    }
  )
);

// ---- ראוטים ----
app.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}?login=failed` }),
  (req, res) => res.redirect(CLIENT_URL)
);

app.get("/session", (req, res) => {
  if (req.user) return res.json({ user: req.user });
  res.json({ user: null });
});

app.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => res.json({ ok: true }));
  });
});

// ---- האזנה ----
app.listen(PORT, () => console.log(`Auth server on ${BASE_URL}`));
