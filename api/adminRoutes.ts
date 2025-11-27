// api/adminRoutes.ts
import { Router, type Request, type Response, type NextFunction } from "express";

export type CourseVaadEntry = {
  id: string;
  email: string;
  courseIds: string[];
};

export type GlobalRoleEntry = {
  id: string;
  email: string;
  role: "admin" | "vaad";
};

const router = Router();

// "DB" בזיכרון (עד שיהיה לך בסיס נתונים אמיתי)
let COURSE_VAAD: CourseVaadEntry[] = [];
let GLOBAL_ROLES: GlobalRoleEntry[] = [];

// -------- middlewares --------
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "not_authenticated" });
  next();
}

export function requireAdminLike(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as { email?: string } | undefined;
  if (!user?.email) return res.status(401).json({ error: "not_authenticated" });

  const email = user.email.toLowerCase();

  // אפשר להגדיר ברמת ENV: ADMIN_EMAILS="a@mail.tau.ac.il,b@mail.tau.ac.il"
  const HARD_ADMINS = (process.env.ADMIN_EMAILS || "morrabaev@mail.tau.ac.il")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  const isHardAdmin = HARD_ADMINS.includes(email);
  const globalRole = GLOBAL_ROLES.find((r) => r.email.toLowerCase() === email);
  const isVaadOrAdmin = globalRole && (globalRole.role === "admin" || globalRole.role === "vaad");

  if (!isHardAdmin && !isVaadOrAdmin) {
    return res.status(403).json({ error: "forbidden" });
  }

  next();
}

// -------- routes --------

// כל ההקצאות – נטען מזה בצד לקוח
router.get("/assignments", (_req: Request, res: Response) => {
  res.json({
    courseVaad: COURSE_VAAD,
    globalRoles: GLOBAL_ROLES,
  });
});

// יצירת הקצאת "ועד קורס"
router.post("/course-vaad", (req: Request, res: Response) => {
  const { email, courseIds } = req.body || {};
  if (!email || !Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const entry: CourseVaadEntry = {
    id: Date.now().toString(),
    email,
    courseIds,
  };

  COURSE_VAAD.push(entry);
  res.json(entry);
});

// עדכון הקצאת "ועד קורס"
router.put("/course-vaad/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, courseIds } = req.body || {};

  const idx = COURSE_VAAD.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: "not_found" });

  COURSE_VAAD[idx] = {
    id,
    email: email ?? COURSE_VAAD[idx].email,
    courseIds: Array.isArray(courseIds) && courseIds.length > 0 ? courseIds : COURSE_VAAD[idx].courseIds,
  };

  res.json(COURSE_VAAD[idx]);
});

// מחיקת הקצאת "ועד קורס"
router.delete("/course-vaad/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  COURSE_VAAD = COURSE_VAAD.filter((x) => x.id !== id);
  res.json({ ok: true });
});

// הוספת תפקיד גלובלי (admin / vaad)
router.post("/global-role", (req: Request, res: Response) => {
  const { email, role } = req.body || {};
  if (!email || (role !== "admin" && role !== "vaad")) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const entry: GlobalRoleEntry = {
    id: Date.now().toString(),
    email,
    role,
  };

  GLOBAL_ROLES.push(entry);
  res.json(entry);
});

// מחיקת תפקיד גלובלי
router.delete("/global-role/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  GLOBAL_ROLES = GLOBAL_ROLES.filter((x) => x.id !== id);
  res.json({ ok: true });
});

export default router;
