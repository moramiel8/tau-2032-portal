// server/routes/years.js
import express from "express";
import { query } from "../db.js";

const router = express.Router();

router.get("/years", async (req, res) => {
  try {
    // 1. שולפים שנים + סמסטרים + קורסים
    const { rows } = await query(
      `
      SELECT
        y.id          AS year_db_id,
        y.code        AS year_id,
        y.title       AS year_title,
        y.kind        AS year_kind,
        y.sort_index  AS year_sort,

        s.id          AS sem_db_id,
        s.code        AS sem_id,
        s.title       AS sem_title,
        s.sort_index  AS sem_sort,

        c.id          AS course_id,
        c.name        AS course_name,
        c.short_name  AS course_short_name,
        c.note        AS course_note,
        c.course_code AS course_number
      FROM study_years y
      JOIN semesters s ON s.year_id = y.id
      LEFT JOIN courses c ON c.semester_id = s.id
      ORDER BY y.sort_index, s.sort_index, c.name
      `
    );

    // 2. מרכיבים Year[] בצד השרת (בדיוק כמו ב-years.ts)
    const yearsMap = new Map(); // key: year_id -> Year

    for (const row of rows) {
      let year = yearsMap.get(row.year_id);
      if (!year) {
        year = {
          id: row.year_id,
          title: row.year_title,
          kind: row.year_kind,
          semesters: [],
        };
        yearsMap.set(row.year_id, year);
      }

      let sem = year.semesters.find((s) => s.id === row.sem_id);
      if (!sem) {
        sem = {
          id: row.sem_id,
          title: row.sem_title,
          courses: [],
        };
        year.semesters.push(sem);
      }

      if (row.course_id) {
        sem.courses.push({
          id: row.course_id,
          name: row.course_name,
          shortName: row.course_short_name || undefined,
          note: row.course_note || undefined,
          courseNumber: row.course_number || undefined,
          // השדות המתקדמים (assignments וכו') יגיעו מה-course-content כרגיל
        });
      }
    }

    const years = Array.from(yearsMap.values());
    res.json({ items: years });
  } catch (e) {
    console.error("/api/years failed", e);
    res.status(500).json({ error: "failed to load years" });
  }
});

export default router;