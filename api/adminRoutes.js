// api/adminRoutes.js
import express from "express";
import { query } from "../server/db.js";

import multer from "multer";
import supabase from "./supabaseClient.js";

import path from "path";
import fs from "fs";

import { generateCourseId } from "../server/utils/courseId.js";





const router = express.Router();

const HARD_ADMINS = (process.env.ADMIN_EMAILS || "morrabaev@mail.tau.ac.il")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

// ---------- helpers ----------
function mapCourseVaadRow(row) {
  return {
    id: row.id.toString(),
    email: row.email,
    displayName: row.display_name || null,
    courseIds: row.course_ids,
  };
}

function mapGlobalRoleRow(row) {
  return {
    id: row.id.toString(),
    email: row.email,
    role: row.role,
    displayName: row.display_name || null,
  };
}

// ---------- הרשאות ----------
export async function getEffectiveRole(email) {
  const lower = email.toLowerCase();

  if (HARD_ADMINS.includes(lower)) {
    return "admin";
  }

  try {
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

  if (HARD_ADMINS.includes(lower)) {
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

export async function requireAdminOnly(req, res, next) {
  const user = req.user;
  if (!user?.email) {
    return res.status(401).json({ error: "not_authenticated" });
  }

  const lower = user.email.toLowerCase();

  // אדמין "קשיח" דרך ENV תמיד מאושר
  if (HARD_ADMINS.includes(lower)) {
    req.user.role = "admin";
    return next();
  }

  try {
    const role = await getEffectiveRole(user.email);
    if (role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    req.user.role = "admin";
    next();
  } catch (err) {
    console.error("[requireAdminOnly] failed", err);
    return res.status(500).json({ error: "server_error" });
  }
}

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
const upload = multer({ storage: multer.memoryStorage() });


try {
  if (process.env.NODE_ENV === "production") {
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

// ---------- helpers לשם תצוגה לפי email ----------
export async function getDisplayNameForEmail(email) {
  if (!email) return null;

  try {
    const cv = await query(
      `SELECT display_name FROM course_vaad
       WHERE LOWER(email) = LOWER($1) AND display_name IS NOT NULL
       LIMIT 1`,
      [email]
    );
    if (cv.rows.length > 0) return cv.rows[0].display_name;
  } catch (err) {
    console.error("[getDisplayNameForEmail] course_vaad error", err);
  }

  try {
    const gr = await query(
      `SELECT display_name FROM global_roles
       WHERE LOWER(email) = LOWER($1) AND display_name IS NOT NULL
       LIMIT 1`,
      [email]
    );
    if (gr.rows.length > 0) return gr.rows[0].display_name;
  } catch (err) {
    console.error("[getDisplayNameForEmail] global_roles error", err);
  }

  return null;
}

// ---------- routes ----------

// כל ההקצאות – עכשיו מה-DB
router.get("/assignments", requireAdminLike, async (_req, res) => {
  try {
    const [courseRes, globalRes] = await Promise.all([
      query(
        "SELECT id, email, display_name, course_ids FROM course_vaad ORDER BY id DESC"
      ),
      query(
        "SELECT id, email, role, display_name FROM global_roles ORDER BY id DESC"
      ),
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

// כל משתמשי "ועד קורס" לבחירה כנציגים
router.get("/course-vaad-users", requireAdminLike, async (_req, res) => {
  try {
    const result = await query(
      `
      SELECT id, email, display_name
      FROM course_vaad
      ORDER BY
        COALESCE(display_name, '') ASC,
        email ASC
      `
    );

    res.json({
      items: result.rows.map((r) => ({
        id: String(r.id),
        email: r.email,
        displayName: r.display_name || null,
      })),
    });
  } catch (err) {
    console.error("[GET /admin/course-vaad-users] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// יצירת הקצאת "ועד קורס"
router.post("/course-vaad", requireAdminLike, async (req, res) => {
  const { email, displayName, courseIds } = req.body;

  try {
    console.log("course-vaad body:", req.body);
    await query(
      `
      INSERT INTO course_vaad (email, display_name, course_ids)
      VALUES ($1, $2, $3)
      ON CONFLICT (email)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        course_ids   = EXCLUDED.course_ids
    `,
      [email, displayName || null, courseIds || []]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("course-vaad error:", err);
    console.error("[POST /api/admin/course-vaad] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// עדכון הקצאת "ועד קורס"
router.put("/course-vaad/:id", requireAdminLike, async (req, res) => {
  const { id } = req.params;
  const { email, courseIds, displayName } = req.body || {};

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    const result = await query(
      `
      UPDATE course_vaad
      SET
        email        = COALESCE($1, email),
        display_name = COALESCE($2, display_name),
        course_ids   = CASE
          WHEN $3::text[] IS NULL OR cardinality($3) = 0 THEN course_ids
          ELSE $3
        END
      WHERE id = $4
      RETURNING id, email, display_name, course_ids
      `,
      [
        email ?? null,
        displayName ?? null,
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

// הוספת תפקיד גלובלי (ועד כללי / מנהל מערכת)
router.post("/global-roles", requireAdminOnly, async (req, res) => {
  const { email, role, displayName } = req.body;

  try {
    await query(
      `
      INSERT INTO global_roles (email, role, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email)
      DO UPDATE SET
        role         = EXCLUDED.role,
        display_name = EXCLUDED.display_name
    `,
      [email, role, displayName || null]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/global-roles] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// מחיקת תפקיד גלובלי
router.delete("/global-roles/:id", requireAdminOnly, async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    await query("DELETE FROM global_roles WHERE id = $1", [numericId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /global-roles/:id] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ---------- עריכת תוכן קורסים (admin / vaad / ועד־קורס) ----------

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

router.put(
  "/course-content/:courseId",
  requireCourseVaadOrAdmin,
  async (req, res) => {
    const { courseId } = req.params;
    const raw = req.body || {};
    const user = req.user;

    // מי עורך עכשיו
    const now = new Date().toISOString();

    let editorName = null;
    if (user?.email) {
      try {
        editorName = await getDisplayNameForEmail(user.email);
      } catch (e) {
        console.error(
          "[PUT /admin/course-content/:courseId] failed to resolve display name",
          e
        );
      }
    }

    const payload = {
      ...raw,
      lastEditedByEmail: user?.email || null,
      lastEditedByName: editorName || user?.email || null,
      lastEditedAt: now,
    };

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

router.post(
  "/course-content/:courseId/syllabus-upload",
  requireCourseVaadOrAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "no_file" });

    const courseId = req.params.courseId;
    const ext = ".pdf";
    const fileName = `${courseId}-${Date.now()}${ext}`;

    const { error } = await supabase.storage
      .from("syllabus")                    // שם הבקט
      .upload(fileName, req.file.buffer, {
        contentType: "application/pdf",
      });

    if (error) {
      console.error("supabase upload error", error);
      return res.status(500).json({ error: "upload_failed" });
    }

    const { data: publicData } = supabase.storage
      .from("syllabus")
      .getPublicUrl(fileName);

    // זה ה-URL שתשמור ב-content.syllabus
    return res.json({ url: publicData.publicUrl });
  }
);

// ----- homepage content (admin) -----

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

// רשימת כל המודעות (לאדמין/ועד)
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

// עדכון מודעה
router.put("/announcements/:id", requireAdminLike, async (req, res) => {
  const { id } = req.params;
  const { title, body, courseId } = req.body || {};
  const user = req.user;

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    const result = await query(
      `
      UPDATE announcements
      SET
        title = $1,
        body = $2,
        course_id = $3,
        author_email = $4
      WHERE id = $5
      RETURNING id, title, body, course_id, author_email, created_at
    `,
      [title, body, courseId || null, user?.email || null, numericId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }

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
    console.error("[PUT /admin/announcements/:id] error", err);
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

// ----- courses (create from admin / vaad) -----


// מחיקת קורס (כולל תוכן ומודעות משויכות)
router.delete("/courses/:courseId", requireAdminLike, async (req, res) => {
  const { courseId } = req.params;

  try {
    console.log("[DELETE /api/admin/courses/:courseId]", { courseId });

    // קודם מוחקים תוכן קורס (אם יש)
    await query("DELETE FROM course_content WHERE course_id = $1", [courseId]);

    // מוחקים מודעות שקשורות לקורס
    await query("DELETE FROM announcements WHERE course_id = $1", [courseId]);

    // ורק אז את הקורס עצמו מטבלת הקורסים הדינמיים
    const result = await query(
      "DELETE FROM courses_extra WHERE id = $1 RETURNING id",
      [courseId]
    );

    if (result.rowCount === 0) {
      // לא נמצא קורס דינמי כזה – מחזירים 404 כדי שיהיה ברור בצד לקוח
      return res.status(404).json({ error: "course_not_found" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/courses/:courseId] error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// רשימת קורסים דינמיים (לא חובה, אבל שימושי לפאנל ניהול / debug)
router.get("/courses", requireAdminLike, async (_req, res) => {
  try {
    const result = await query(
      `
      SELECT id, name, short_name, year_label, semester_label, course_code, created_at
      FROM courses_extra
      ORDER BY year_label, semester_label, name
      `
    );

    res.json({
      items: result.rows.map((r) => ({
        id: String(r.id),
        name: r.name,
        shortName: r.short_name,
        yearLabel: r.year_label,
        semesterLabel: r.semester_label,
        courseCode: r.course_code,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("[GET /admin/courses] error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// יצירת קורס חדש (admin / vaad)
// יצירת קורס חדש (admin / vaad)
router.post("/courses", requireAdminLike, async (req, res) => {
  const { name, shortName, yearLabel, semesterLabel, courseCode } =
    req.body || {};

  if (!name || !yearLabel || !semesterLabel) {
    return res.status(400).json({ error: "invalid_body" });
  }

  try {
    // כאן משתמשים במחולל ה-id
    const courseId = await generateCourseId(name, courseCode);

    const result = await query(
      `
      INSERT INTO courses_extra (id, name, short_name, year_label, semester_label, course_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, short_name, year_label, semester_label, course_code, created_at
      `,
      [courseId, name, shortName || null, yearLabel, semesterLabel, courseCode || null]
    );

    const r = result.rows[0];

    const payload = {
      id: r.id, // עכשיו זה general-chemistry / general-chemistry-2 וכו'
      name: r.name,
      shortName: r.short_name,
      yearLabel: r.year_label,
      semesterLabel: r.semester_label,
      courseCode: r.course_code,
      createdAt: r.created_at,
    };

    res.json(payload);
  } catch (err) {
    console.error("[POST /admin/courses] error", err);
    res.status(500).json({ error: "server_error" });
  }
});


export default router;
