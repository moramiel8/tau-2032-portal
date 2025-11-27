// api/[[...path]].ts
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import adminRouter, {
  requireAuth,
  requireAdminLike,
} from "./adminRoutes";

// -------- יצירת האפליקציה --------
const app: Express = express();
app.set("trust proxy", 1);

// -------- CORS --------
const CLIENT_URL =
  process.env.CLIENT_URL ||
  process.env.ALLOWED_ORIGIN ||
  "https://tau-2032-portal.vercel.app";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// לוג פשוט לראות מה נכנס
app.use((req, _res, next) => {
  console.log("[api] hit:", req.method, req.url);
  next();
});

// בלי cache
app.set("etag", false);
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// -------- cookie-session --------
if (!process.env.SESSION_SECRET) {
  console.error("[api] Missing SESSION_SECRET env");
}

app.use(
  cookieSession({
    name: "tau_sess",
    keys: [process.env.SESSION_SECRET || "dev-secret"],
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
);

// polyfill ל-passport + cookie-session
app.use((req: any, _res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb: any) => cb();
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb: any) => cb();
  }
  next();
});

// -------- Passport --------
app.use(passport.initialize());
app.use(passport.session());

const BASE_URL =
  process.env.BASE_URL || "https://tau-2032-portal.vercel.app";

const CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;

passport.serializeUser((user: any, done) => {
  done(null, { email: user.email });
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: CALLBACK_URL,
    },
    (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || "";
        const domain = email.split("@")[1]?.toLowerCase() || "";
        const allowed = (process.env.ALLOWED_DOMAIN || "mail.tau.ac.il").toLowerCase();

        if (!email) return done(null, false, { message: "no_email" });
        if (domain !== allowed)
          return done(null, false, { message: "domain_not_allowed" });

        return done(null, { email });
      } catch (e) {
        return done(e as Error);
      }
    }
  )
);

// להגביל בחירת חשבון לדומיין TAU (מלל ל־Google, ההגבלה האמיתית היא בקולבק)
(GoogleStrategy as any).prototype.authorizationParams = function () {
  return {
    prompt: "select_account",
    hd: process.env.ALLOWED_DOMAIN || "mail.tau.ac.il",
  };
};

// -------- router ראשי לכל /api --------
const router = express.Router();

// Auth: התחלה
router.get("/auth/google", (req, res, next) =>
  passport.authenticate("google", {
    scope: ["openid", "email", "profile"],
  })(req, res, next)
);

// Auth: callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: CLIENT_URL + "?login=failed",
    session: true,
    keepSessionInfo: true,
  }),
  (_req, res) => res.redirect(CLIENT_URL)
);

// session – מה שהפרונט קורא via fetchSession()
router.get("/session", (req: Request, res: Response) => {
  res.status(200).json({ user: (req as any).user ?? null });
});

// logout
router.post("/logout", (req: any, res: Response) => {
  req.logout?.(() => {
    req.session = null;
    res.json({ ok: true });
  });
});

// healthcheck פשוט
router.get("/health", (_req, res) => res.json({ status: "ok" }));

// בדיקה ל-session (אופציונלי)
router.get("/check-session", (req: any, res: Response) => {
  req.session = req.session || {};
  req.session.t = Date.now();
  res.json({ ok: true });
});

// -------- 🔹 חיבור adminRouter ל-/api/admin --------
router.use("/admin", requireAuth, requireAdminLike, adminRouter);

// להרכיב את כל /api על האפליקציה
app.use("/api", router);

// -------- error handler אחד --------
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[API ERROR]", (err as any)?.stack || err);
    res.status(500).json({ error: String((err as any)?.message || err) });
  }
);

// -------- handler ל-Vercel --------
export default function handler(req: Request, res: Response) {
  return app(req, res);
}
