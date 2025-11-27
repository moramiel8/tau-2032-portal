// server/index.js
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

const {
  ALLOWED_ORIGIN = "https://tau-2032-test.vercel.app",            // ← דומיין הפרונט *של הפרויקט הזה*
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET,
  CLIENT_URL = ALLOWED_ORIGIN,
  BASE_URL = "https://tau-2032-test.vercel.app",                   // ← כי הכל באותו פרויקט
  ALLOWED_DOMAIN = "mail.tau.ac.il",
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SESSION_SECRET) {
  console.error("[srv] Missing envs"); throw new Error("Missing envs");
}

const app = express();
app.set("trust proxy", 1);

app.use(cors({ origin: [ALLOWED_ORIGIN], credentials: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: "none", httpOnly: true, maxAge: 1000*60*60*24*7 }
}));

app.use(passport.initialize());
app.use(passport.session());

const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;
console.log("[srv] BOOT:", { CLIENT_URL, BASE_URL, CALLBACK_URL });

passport.serializeUser((u,d)=>d(null,u));
passport.deserializeUser((o,d)=>d(null,o));

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
  (req, res) => res.redirect(CLIENT_URL)
);

app.get("/api/session", (req,res)=>res.json({ user: req.user ?? null }));
app.post("/api/logout", (req,res)=>{ req.logout?.(()=>req.session.destroy?.(()=>res.json({ok:true}))); });
app.get("/api/health", (_req,res)=>res.json({ status:"ok" }));

export default app; // ← חשוב!
