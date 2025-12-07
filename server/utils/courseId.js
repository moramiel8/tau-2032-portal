// server/utils/courseId.js
import { query } from "../db.js";

// מנרמל שם/קוד לקורס ל-slug באנגלית
function slugify(str) {
  return (
    str
      .normalize("NFKD")              // מפרק ניקוד
      .replace(/[\u0590-\u05FF]/g, "") // מוריד עברית
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")     // כל דבר שהוא לא אות/ספרה -> מקף
      .replace(/^-+|-+$/g, "")         // מוריד מקפים מההתחלה/סוף
  );
}

export async function generateCourseId(name, courseCode) {
  // 1. בסיס: אם יש קוד קורס – נשתמש בו, אחרת מהשם
  let base =
    (courseCode && slugify(courseCode)) ||
    slugify(name) ||
    "course";

  // אם משום מה יצא ריק – דיפולט
  if (!base) base = "course";

  // 2. לבדוק אם כבר קיים id כזה בטבלת הקורסים הדינמיים
  const { rows } = await query(
    `SELECT id FROM extra_courses WHERE id = $1 OR id LIKE $2`,
    [base, `${base}-%`]
  );

  if (rows.length === 0) {
    return base;
  }

  // 3. אם כבר יש כאלה – למצוא סיומת פנויה
  let maxSuffix = 0;

  for (const row of rows) {
    const m = row.id.match(new RegExp(`^${base}-(\\d+)$`));
    if (m) {
      const num = Number(m[1]);
      if (!isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    } else if (row.id === base) {
      // הבסיס תפוס לפחות פעם אחת
      if (maxSuffix === 0) maxSuffix = 1;
    }
  }

  // הבא בתור
  const nextSuffix = maxSuffix + 1;
  return `${base}-${nextSuffix}`;
}
