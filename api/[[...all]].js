import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));

app.use((req, _res, next) => {
  console.log("[api] hit:", req.method, req.url);
  next();
});


app.set('etag', false);                       // לא לחשב ETag → לא יחזור 304
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');       // אל תאפשר קאשינג על תשובות ה-API
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24 * 7
}
,
}));

app.use(passport.initialize());
app.use(passport.session());

//
// === הגדרת Passport + Google Strategy ===
//
const CLIENT_URL =
  process.env.CLIENT_URL ||
  process.env.ALLOWED_ORIGIN ||
  "https://tau-2032-portal.vercel.app";

const STATIC_CALLBACK =
  (process.env.BASE_URL || "https://tau-2032-portal.vercel.app") +
  "/api/auth/google/callback";

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: STATIC_CALLBACK,
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value || "";
      const domain = email.split("@")[1]?.toLowerCase() || "";
      const allowed = (process.env.ALLOWED_DOMAIN || "mail.tau.ac.il").toLowerCase();
      if (!email || domain !== allowed) {
        return done(null, false, { message: "domain_not_allowed" });
      }
      return done(null, { email });
    }
  )
);

//
// === ראוטים ===
//
const router = express.Router();

router.get("/auth/google",
  (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  },
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: process.env.ALLOWED_DOMAIN || "mail.tau.ac.il",
    prompt: "select_account",
    callbackURL: STATIC_CALLBACK,
  })
);

router.get("/auth/google/login",
  (req, res, next) => { res.set("Cache-Control", "no-store"); next(); },
  passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: process.env.ALLOWED_DOMAIN || "mail.tau.ac.il",
    prompt: "select_account",
    callbackURL: STATIC_CALLBACK,
  })
);


router.get("/v2/auth/google", (req, res, next) => {
  console.log("[api] /v2/auth/google start");
  res.set("Cache-Control", "no-store");
  return passport.authenticate("google", {
    scope: ["email", "profile", "openid"],
    hd: process.env.ALLOWED_DOMAIN || "mail.tau.ac.il",
    prompt: "select_account",
    callbackURL: STATIC_CALLBACK,
  })(req, res, next);
});


router.get("/session", (req, res) => {
  res.set('Cache-Control', 'no-store');      
  res.status(200).json({ user: req.user ?? null });
});


router.post("/logout", (req, res) => {
  req.logout?.(() => req.session.destroy?.(() => res.json({ ok: true })));
});
router.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/", router);
app.use("/api", router);

export default function handler(req, res) {
  return app(req, res);
}
 