import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: "none", httpOnly: true, maxAge: 1000*60*60*24*7 },
}));
app.use(passport.initialize());
app.use(passport.session());

// === הגדר נתיבים בלי /api בתחילה ===
const router = express.Router();

router.get("/auth/google", passport.authenticate("google", {
  scope: ["email", "profile", "openid"],
  hd: process.env.ALLOWED_DOMAIN || "mail.tau.ac.il",
  prompt: "select_account",
  callbackURL: (process.env.BASE_URL || "https://tau-2032-portal.vercel.app") + "/api/auth/google/callback",
}));

router.get("/auth/google/callback",
  passport.authenticate("google", {
    callbackURL: (process.env.BASE_URL || "https://tau-2032-portal.vercel.app") + "/api/auth/google/callback",
    failureRedirect: (process.env.CLIENT_URL || process.env.ALLOWED_ORIGIN || "https://tau-2032-portal.vercel.app") + "?login=failed",
  }),
  (_req, res) => res.redirect(process.env.CLIENT_URL || process.env.ALLOWED_ORIGIN || "/")
);

router.get("/session", (req, res) => res.json({ user: req.user ?? null }));
router.post("/logout", (req, res) => { req.logout?.(() => req.session.destroy?.(() => res.json({ ok: true })) ); });
router.get("/health", (_req, res) => res.json({ status: "ok" }));

// === מיפוי גם בלי /api וגם עם /api ===
app.use("/", router);
app.use("/api", router);

// יצוא ה-handler ל־Vercel
export default function handler(req, res) {
  return app(req, res);
}
