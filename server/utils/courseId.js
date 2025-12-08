// server/utils/courseId.js
import { query } from "../db.js";

// מיפוי ידני של שמות קורס → slug באנגלית
const SPECIAL_NAME_SLUGS = {
  // שנה א סמסטר א
  "כימיה כללית ופיזיקלית": "genchem-1212",
  "כימיה אורגנית": "organicchem-1213",
  "יסודות ביוכימיים של הרפואה": "biochem-1215",
  "מבוא לביופיזיקה ופיזיולוגיה כללית": "biophys-1219",
  "מבוא לסטטיסטיקה": "introstat-1225",
  "מבוא לפיזיקה": "introphysics-1226",
    "אפידמיולוגיה ושיטות מחקר": "epidemiology-1321",

  // שנה א סמסטר ב
  "יסודות מולקולריים של הרפואה": "molmed-1216",
  "יסודות גנטיים של הרפואה": "genetics-1217",
  "מבוא למדעי העצב": "neurointro-1220",
  "פיזיקה רפואית": "medphys-1227",
  "בקטריולוגיה": "bacteriology-1228",
  "ביולוגיה של התא": "cellbio-1305",
  "שיטות סטטיסטיות מתקדמות": "advstats-1322",
  "קידום אורח חיים בריא": "healthpromo-1323",

  // קורסים בחינוך רפואי
  "רפואה בראיה חברתית - חינוך רפואי (חיבוקי)": "hibuki-1200",

  //בחירה
   "רפואה אינטגרטיבית": "integrativemed-1004",
  "חדשנות ברפואה-מדע טכנולוגיה ויזמות": "medinnovation-1005",
  "יזמות לרפואנים": "medentrepreneurship-1008",
  "ניתוח מידע סטטיסטי באמצעות פייתון ובינה מלאכותית": "pymldataanalysis-1010",
  "רפואה מודעת מין ומגדר": "gendermed-1011",
  "רפואה שואה ונאציזים": "holocaustmed-1013",



};

// מנרמל מחרוזת ל-slug באנגלית
function slugify(str = "") {
  return (
    str
      .normalize("NFKD")
      .replace(/[\u0590-\u05FF]/g, "") // מוריד עברית
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export async function generateCourseId(name, courseCode) {
  const trimmedName = (name || "").trim();

  // 1. קודם מנסה מהמפה הידנית
  let base = SPECIAL_NAME_SLUGS[trimmedName];

  // 2. אם אין במפה – מנסה slug מהשם
  if (!base) {
    base = slugify(trimmedName);
  }

  // 3. אם עדיין ריק – נופל ל-code
  if (!base && courseCode) {
    base = slugify(String(courseCode));
  }

  // 4. fallback סופי
  if (!base) base = "course";

  // 5. לבדוק שאין קורס אחר עם אותו id
  const { rows } = await query(
    `SELECT id
     FROM courses_extra
     WHERE id = $1 OR id LIKE $2`,
    [base, `${base}-%`]
  );

  if (rows.length === 0) {
    return base;
  }

  // 6. אם תפוס – למצוא סיומת פנויה
  let maxSuffix = 0;

  for (const row of rows) {
    const m = row.id.match(new RegExp(`^${base}-(\\d+)$`));
    if (m) {
      const num = Number(m[1]);
      if (!Number.isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    } else if (row.id === base) {
      if (maxSuffix === 0) maxSuffix = 1;
    }
  }

  const nextSuffix = maxSuffix + 1;
  return `${base}-${nextSuffix}`;
}
