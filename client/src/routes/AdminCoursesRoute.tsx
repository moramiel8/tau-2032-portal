// client/src/routes/AdminCoursesRoute.tsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { YEARS, type Course, type Year } from "../data/years";

type FlatCourse = Course & {
  yearId: string;
  yearTitle: string;
  semesterId: string;
  semesterTitle: string;
};

export default function AdminCoursesRoute() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [overrides, setOverrides] = useState<Record<string, Partial<Course>>>(
    {}
  );

  // לטעון overrides מה־DB
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/course-content");
        if (!res.ok) return;
        const data = (await res.json()) as {
          items: { courseId: string; content: Partial<Course> }[];
        };

        const map: Record<string, Partial<Course>> = {};
        for (const item of data.items) {
          map[item.courseId] = item.content;
        }
        setOverrides(map);
      } catch (e) {
        console.warn("[AdminCoursesRoute] failed to load overrides", e);
      }
    })();
  }, []);

  const allCourses: FlatCourse[] = useMemo(() => {
    const out: FlatCourse[] = [];
    YEARS.forEach((year: Year) => {
      year.semesters.forEach((sem) => {
        sem.courses.forEach((c) => {
          const override = overrides[c.id] || {};
          const merged: Course = { ...c, ...override };
          out.push({
            ...merged,
            yearId: year.id,
            yearTitle: year.title,
            semesterId: sem.id,
            semesterTitle: sem.title,
          });
        });
      });
    });
    return out;
  }, [overrides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCourses;
    return allCourses.filter((c) => {
      const haystack = [
        c.name,
        c.courseNumber,
        c.yearTitle,
        c.semesterTitle,
        c.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allCourses, search]);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">ניהול קורסים</h1>
        <Link to="/admin" className="text-xs text-neutral-500 underline">
          חזרה לפאנל המנהל
        </Link>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם קורס / מספר קורס / שנה..."
          className="border rounded-xl px-3 py-2 text-sm flex-1 w-full"
        />
        <span className="text-xs text-neutral-500">
          נמצאו {filtered.length} קורסים
        </span>
      </div>

      <div className="border rounded-2xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="text-right py-2 px-3">שנה</th>
              <th className="text-right py-2 px-3">סמסטר</th>
              <th className="text-right py-2 px-3">שם הקורס</th>
              <th className="text-right py-2 px-3">מספר קורס</th>
              <th className="text-right py-2 px-3 w-32">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={`${c.yearId}-${c.semesterId}-${c.id}`}
                className="border-t hover:bg-neutral-50/70"
              >
                <td className="py-2 px-3 align-top text-xs">{c.yearTitle}</td>
                <td className="py-2 px-3 align-top text-xs">
                  {c.semesterTitle}
                </td>
                <td className="py-2 px-3 align-top">
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-neutral-500">{c.id}</div>
                </td>
                <td className="py-2 px-3 align-top text-xs">
                  {c.courseNumber || "—"}
                </td>
                <td className="py-2 px-3 align-top text-xs">
                  <button
                    type="button"
                    onClick={() => nav(`/admin/course/${c.id}/edit`)}
                    className="border rounded-xl px-3 py-1 hover:bg-neutral-50"
                  >
                    עריכה
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 px-3 text-center text-xs text-neutral-500"
                >
                  לא נמצאו קורסים התואמים לחיפוש.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
