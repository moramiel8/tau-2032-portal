// api/[[...path]].ts
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const app: Express = express();
app.set("trust proxy", 1);
app.use(cors({
  origin: process.env.CLIENT_URL || "https://tau-2032-portal.vercel.app",
  credentials: true,
}));

app.use((req, _res, next) => {
  console.log("[api] hit:", req.method, req.url);
  next();
});

app.set("etag", false);
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(
  cookieSession({
    name: "tau_sess",
    keys: [process.env.SESSION_SECRET!], // make sure this is set in Vercel
    secure: true,                        // prod on Vercel is HTTPS
    httpOnly: true,
    sameSite: "lax",                     // good for OAuth top-level redirects
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
);


app.use((req, _res, next) => {
  if (req.session && typeof (req.session as any).regenerate !== "function") {
    (req.session as any).regenerate = (cb: (err?: any) => void) => cb();
  }
  if (req.session && typeof (req.session as any).save !== "function") {
    (req.session as any).save = (cb: (err?: any) => void) => cb();
  }
  next();
});


app.use(passport.initialize());
app.use(passport.session());



const CLIENT_URL =
  process.env.CLIENT_URL ||
  process.env.ALLOWED_ORIGIN ||
  "https://tau-2032-portal.vercel.app";

const STATIC_CALLBACK =
  (process.env.BASE_URL || "https://tau-2032-portal.vercel.app") +
  "/api/auth/google/callback";

passport.serializeUser((user: any, done) => done(null, { email: user.email }));
passport.deserializeUser((obj: any, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: STATIC_CALLBACK,
    },
    (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || "";
        const domain = email.split("@")[1]?.toLowerCase() || "";
        const allowed = (process.env.ALLOWED_DOMAIN || "mail.tau.ac.il").toLowerCase();

        if (!email) {
          console.warn("[GoogleStrategy] no email found");
          return done(null, false, { message: "no_email" });
        }
        if (domain !== allowed) {
          console.warn("[GoogleStrategy] forbidden domain", domain);
          return done(null, false, { message: "domain_not_allowed" });
        }

        console.log("[GoogleStrategy] success:", email);
        return done(null, { email });
      } catch (e) {
        console.error("[GoogleStrategy] error:", e);
        return done(e as Error);
      }
    }
  )
);

// --- חובה: כדי להגביל לדומיין של TAU ---
(GoogleStrategy as any).prototype.authorizationParams = function () {
  return {
    prompt: "select_account",
    hd: process.env.ALLOWED_DOMAIN || "mail.tau.ac.il",
  };
};


// --- הראוטים עצמם ---

const router = express.Router();

router.get("/auth/google", (req, res, next) => {
  console.log("[api] /auth/google → passport redirect");
  return passport.authenticate("google", {
    scope: ["openid", "email", "profile"], 
  })(req, res, next);
});



router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: CLIENT_URL + "?login=failed",
    session: true,
    keepSessionInfo: true,
  }),
  (_req, res) => {
    res.redirect(CLIENT_URL);
  }
);

// ✅ בדיקת סשן
router.get("/session", (req, res) => {
  res.status(200).json({ user: (req as any).user ?? null });
});

// ✅ התנתקות
router.post("/logout", (req, res) => {
  req.logout?.(() => {
    (req as any).session = null;   // cookie-session: clear cookie
    res.json({ ok: true });
  });
});


// ✅ בדיקת בריאות
router.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api", router);

export default function handler(req: Request, res: Response) {
  return app(req, res);
}

app.use((err: any, _req: Request, res: Response, _next) => {
  console.error("[API ERROR]", err?.stack || err);
  res.status(500).json({ error: String(err?.message || err) });
});

router.get("/check-session", (req, res) => {
  req.session ||= {};
  (req.session as any).t = Date.now();
  res.json({ ok: true });
});


