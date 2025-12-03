// api/adminRoutes.js
import express from "express";
import { query } from "../server/db.js";

import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// admins “קשים” מה־env
const HARD_ADMINS = (process.env.ADMIN_EMAILS || "morrabaev@mail.tau.ac.il")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

// ---------- helpers ----------
function mapCourseVaadRow(row) {
  return {
    id: row.id.toString(),
    email: row.email,
    courseIds: row.course_ids,
  };
}

function mapGlobalRoleRow(row) {
  return {
    id: row.id.toString(),
    email: row.email,
    role: row.role,
  };
}

// ---------- הרשאות ----------
export async function getEffectiveRole(email) {
  const lower = email.toLowerCase();

  // 1) אם המייל ברשימת האדמינים הקשיחים – ישר admin
  if (HARD_ADMINS.includes(lower)) {
    return "admin";
  }

  try {
    // 2) מנסים לקרוא מה-DB (global_roles)
    const result = await query(
      `SELECT role
       FROM global_roles
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [lower]
    );

    const global = result.rows[0];
    return global?.role ?? "student";
  } catch (err) {
    // 3) אם יש בעיה ב-DB (למשל הטבלה לא קיימת בפרוד) – לא נופלים
    console.error("[getEffectiveRole] DB error, defaulting to 'student'", err);
    return "student";
  }
}


export function requireAuth(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "not_authenticated" });
  next();
}

export async function requireAdminLike(req, res, next) {
  const user = req.user;
  if (!user?.email) {
    return res.status(401).json({ error: "not_authenticated" });
  }

  const lower = user.email.toLowerCase();

  // אם הוא admin קשיח – לא צריך DB בכלל
  if (HARD_ADMINS.includes(lower)) {
    // אפשר גם להדביק role על המשתמש, לנוחות:
    req.user.role = "admin";
    return next();
  }

  try {
    const role = await getEffectiveRole(user.email);
    if (role === "student") {
      return res.status(403).json({ error: "forbidden" });
    }

    req.user.role = role;
    next();
  } catch (err) {
    console.error("[requireAdminLike] failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// משתמש שהוא admin/vaad, או ועד קורס של הקורס הספציפי
async function requireCourseVaadOrAdmin(req, res, next) {
  const user = req.user;
  if (!user?.email) {
    return res.status(401).json({ error: "not_authenticated" });
  }

  const email = user.email.toLowerCase();
  const { courseId } = req.params;
  if (!courseId) {
    return res.status(400).json({ error: "missing_course_id" });
  }

  try {
    const role = await getEffectiveRole(email);
    if (role === "admin" || role === "vaad") {
      return next();
    }

    const result = await query(
      `
        SELECT 1
        FROM course_vaad
        WHERE LOWER(email) = LOWER($1)
          AND $2 = ANY(course_ids)
        LIMIT 1
      `,
      [email, courseId]
    );

    if (result.rows.length > 0) {
      return next();
    }

    return res.status(403).json({ error: "forbidden" });
  } catch (err) {
    console.error("[requireCourseVaadOrAdmin] failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------- file uploads (PDF syllabus) ----------

let syllabusDir = null;
let upload = null;

try {
  if (process.env.NODE_ENV === "production") {
    // תואם ל-logika ב-server/index.js
    syllabusDir = path.join("/tmp", "uploads", "syllabus");
  } else {
    syllabusDir = path.join(process.cwd(), "uploads", "syllabus");
  }

  fs.mkdirSync(syllabusDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, syllabusDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".pdf";
      const safeCourseId = String(req.params.courseId || "course").replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );
      cb(null, `${safeCourseId}-${Date.now()}${ext}`);
    },
  });

  upload = multer({
    storage,
    limits: {
      fileSize: 15 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== "application/pdf") {
        return cb(new Error("PDF only"));
      }
      cb(null, true);
    },
  });

  console.log("[adminRoutes] syllabus upload ready at", syllabusDir);
} catch (err) {
  console.error("[adminRoutes] failed to init syllabus upload dir", err);
  syllabusDir = null;
  upload = null;
}


// ---------- routes ----------

// כל ההקצאות – עכשיו מה-DB
router.get("/assignments", requireAdminLike, async (_req, res) => {
  try {
    const [courseRes, globalRes] = await Promise.all([
      query(
        "SELECT id, email, course_ids FROM course_vaad ORDER BY id DESC"
      ),
      query("SELECT id, email, role FROM global_roles ORDER BY id DESC"),
    ]);

    const courseVaad = courseRes.rows.map(mapCourseVaadRow);
    const globalRoles = globalRes.rows.map(mapGlobalRoleRow);

    res.json({
      courseVaad,
      globalRoles,
    });
  } catch (err) {
    console.error("[GET /assignments] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// יצירת הקצאת "ועד קורס"
router.post("/course-vaad", requireAdminLike, async (req, res) => {
  const { email, courseIds } = req.body || {};
  if (!email || !Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ error: "invalid_body" });
  }

  try {
    const result = await query(
      `INSERT INTO course_vaad (email, course_ids)
       VALUES ($1, $2)
       RETURNING id, email, course_ids`,
      [email, courseIds]
    );

    const entry = mapCourseVaadRow(result.rows[0]);
    res.json(entry);
  } catch (err) {
    console.error("[POST /course-vaad] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// עדכון הקצאת "ועד קורס"
router.put("/course-vaad/:id", requireAdminLike, async (req, res) => {
  const { id } = req.params;
  const { email, courseIds } = req.body || {};

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    const result = await query(
      `
      UPDATE course_vaad
      SET
        email = COALESCE($1, email),
        course_ids = CASE
          WHEN $2::text[] IS NULL OR cardinality($2) = 0 THEN course_ids
          ELSE $2
        END
      WHERE id = $3
      RETURNING id, email, course_ids
      `,
      [
        email ?? null,
        Array.isArray(courseIds) && courseIds.length > 0 ? courseIds : null,
        numericId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    const updated = mapCourseVaadRow(result.rows[0]);
    res.json(updated);
  } catch (err) {
    console.error("[PUT /course-vaad/:id] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// מחיקת הקצאת "ועד קורס"
router.delete("/course-vaad/:id", requireAdminLike, async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    await query("DELETE FROM course_vaad WHERE id = $1", [numericId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /course-vaad/:id] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// הוספת תפקיד גלובלי (admin / vaad)
router.post("/global-role", requireAdminLike, async (req, res) => {
  const { email, role } = req.body || {};
  if (!email || (role !== "admin" && role !== "vaad")) {
    return res.status(400).json({ error: "invalid_body" });
  }

  try {
    const result = await query(
      `INSERT INTO global_roles (email, role)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id, email, role`,
      [email, role]
    );

    const entry = mapGlobalRoleRow(result.rows[0]);
    res.json(entry);
  } catch (err) {
    console.error("[POST /global-role] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// מחיקת תפקיד גלובלי
router.delete("/global-role/:id", requireAdminLike, async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    await query("DELETE FROM global_roles WHERE id = $1", [numericId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /global-role/:id] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ---------- עריכת תוכן קורסים (admin / vaad / ועד־קורס) ----------

// קריאת תוכן קורס לעריכה
router.get(
  "/course-content/:courseId",
  requireCourseVaadOrAdmin,
  async (req, res) => {
    const { courseId } = req.params;

    try {
      const result = await query(
        "SELECT content FROM course_content WHERE course_id = $1",
        [courseId]
      );

      if (result.rows.length === 0) {
        return res.json({ exists: false, content: null });
      }

      return res.json({
        exists: true,
        content: result.rows[0].content,
      });
    } catch (err) {
      console.error("[GET /admin/course-content/:courseId] error", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

// שמירת תוכן קורס (UPsert)
router.put(
  "/course-content/:courseId",
  requireCourseVaadOrAdmin,
  async (req, res) => {
    const { courseId } = req.params;
    const payload = req.body || {};

    try {
      const result = await query(
        `INSERT INTO course_content (course_id, content)
         VALUES ($1, $2)
         ON CONFLICT (course_id) DO UPDATE
           SET content = EXCLUDED.content,
               updated_at = NOW()
         RETURNING content`,
        [courseId, payload]
      );

      return res.json({
        ok: true,
        content: result.rows[0].content,
      });
    } catch (err) {
      console.error("[PUT /admin/course-content/:courseId] error", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

// העלאת PDF של סילבוס לקורס מסוים
router.post(
  "/course-content/:courseId/syllabus-upload",
  requireCourseVaadOrAdmin,
  (req, res, next) => {
    if (!upload) {
      return res
        .status(503)
        .json({ error: "uploads_disabled_in_this_env" });
    }
    next();
  },
  upload?.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "no_file" });
    }

    const publicUrl = `/api/uploads/syllabus/${req.file.filename}`;
    return res.json({ url: publicUrl });
  }
);



// ----- homepage content (admin) -----

// שליפה לעריכה
router.get("/homepage", requireAdminLike, async (_req, res) => {
  try {
    const result = await query(
      "SELECT data FROM homepage_content WHERE id = 'main' LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.json({
        exists: false,
        content: {
          heroTitle: "ברוכים הבאים לאתר מחזור 2032",
          heroSubtitle: "כל המידע, הקישורים והחומרים במקום אחד",
          introText: "",
        },
      });
    }

    return res.json({
      exists: true,
      content: result.rows[0].data,
    });
  } catch (err) {
    console.error("[GET /admin/homepage] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// שמירה / עדכון עמוד הבית
router.put("/homepage", requireAdminLike, async (req, res) => {
  const data = req.body || {};

  try {
    const result = await query(
      `
      INSERT INTO homepage_content (id, data)
      VALUES ('main', $1)
      ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = NOW()
      RETURNING data
      `,
      [data]
    );

    return res.json({
      ok: true,
      content: result.rows[0].data,
    });
  } catch (err) {
    console.error("[PUT /admin/homepage] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ----- announcements (admin) -----

// רשימת כל המודעות
router.get("/announcements", requireAdminLike, async (req, res) => {
  try {
    const { courseId } = req.query || {};

    let sql = `
      SELECT id, title, body, course_id, author_email, created_at
      FROM announcements
    `;
    const params = [];

    if (courseId) {
      sql += ` WHERE course_id = $1 `;
      params.push(courseId);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await query(sql, params);

    res.json(
      result.rows.map((r) => ({
        id: String(r.id),
        title: r.title,
        body: r.body,
        courseId: r.course_id,
        authorEmail: r.author_email,
        createdAt: r.created_at,
      }))
    );
  } catch (err) {
    console.error("[GET /admin/announcements] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// יצירת מודעה
router.post("/announcements", requireAdminLike, async (req, res) => {
  const { title, body, courseId } = req.body || {};
  const user = req.user;

  if (!title || !body) {
    return res.status(400).json({ error: "invalid_body" });
  }

  try {
    const result = await query(
      `
        INSERT INTO announcements (title, body, course_id, author_email)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, body, course_id, author_email, created_at
      `,
      [title, body, courseId || null, user?.email || null]
    );

    const r = result.rows[0];
    res.json({
      id: String(r.id),
      title: r.title,
      body: r.body,
      courseId: r.course_id,
      authorEmail: r.author_email,
      createdAt: r.created_at,
    });
  } catch (err) {
    console.error("[POST /admin/announcements] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// מחיקת מודעה
router.delete("/announcements/:id", requireAdminLike, async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    await query("DELETE FROM announcements WHERE id = $1", [numericId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /admin/announcements/:id] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
