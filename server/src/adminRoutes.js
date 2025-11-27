import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// בשביל __dirname ב-ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// איפה נשמור את הקובץ
const DATA_PATH = path.join(__dirname, "data", "adminAssignments.json");

// --- קריאה / כתיבה לקובץ JSON ---

async function loadAssignments() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    // אם אין קובץ עדיין
    return { courseVaad: [], globalRoles: [] };
  }
}

async function saveAssignments(data) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

// --- middlewares לאבטחה ---

export function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "not authenticated" });
}

export function requireAdminLike(req, res, next) {
  const user =
    req.user ||
    (req.session && req.session.passport && req.session.passport.user);

  const email = user && user.email;
  const role = user && user.role;

  const isAdminLike =
    !!email &&
    (role === "admin" ||
      role === "vaad" ||
      email === "morrabaev@mail.tau.ac.il");

  if (!isAdminLike) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

// ------- ENDPOINTS -------

// GET /api/admin/assignments
router.get("/assignments", async (_req, res) => {
  const data = await loadAssignments();
  res.json(data);
});

// POST /api/admin/course-vaad
router.post("/course-vaad", async (req, res) => {
  const { email, courseIds } = req.body || {};

  if (!email || !Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ error: "missing email or courseIds" });
  }

  const data = await loadAssignments();

  const entry = {
    id: Date.now().toString(),
    email,
    courseIds,
  };

  data.courseVaad.push(entry);
  await saveAssignments(data);
  res.json(entry);
});

// PUT /api/admin/course-vaad/:id
router.put("/course-vaad/:id", async (req, res) => {
  const id = req.params.id;
  const { email, courseIds } = req.body || {};

  const data = await loadAssignments();
  const idx = data.courseVaad.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  if (email) data.courseVaad[idx].email = email;
  if (Array.isArray(courseIds) && courseIds.length > 0) {
    data.courseVaad[idx].courseIds = courseIds;
  }

  await saveAssignments(data);
  res.json(data.courseVaad[idx]);
});

// DELETE /api/admin/course-vaad/:id
router.delete("/course-vaad/:id", async (req, res) => {
  const id = req.params.id;
  const data = await loadAssignments();
  data.courseVaad = data.courseVaad.filter((x) => x.id !== id);
  await saveAssignments(data);
  res.json({ ok: true });
});

// POST /api/admin/global-role
router.post("/global-role", async (req, res) => {
  const { email, role } = req.body || {};

  if (!email || (role !== "admin" && role !== "vaad")) {
    return res.status(400).json({ error: "missing email or role" });
  }

  const data = await loadAssignments();
  const entry = {
    id: Date.now().toString(),
    email,
    role,
  };

  data.globalRoles.push(entry);
  await saveAssignments(data);
  res.json(entry);
});

// DELETE /api/admin/global-role/:id
router.delete("/global-role/:id", async (req, res) => {
  const id = req.params.id;
  const data = await loadAssignments();
  data.globalRoles = data.globalRoles.filter((x) => x.id !== id);
  await saveAssignments(data);
  res.json({ ok: true });
});

export default router;
