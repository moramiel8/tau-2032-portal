// client/src/routes/CourseRoute.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ALL_COURSES,
  type Course,
  type AssessmentItem,
} from "../data/years";
import {
  IMG_DRIVE,
  IMG_MOODLE,
  IMG_WHATSAPP,
  IMG_PDF,
} from "../constants/icons";

type VaadUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type CourseContent = Course & {
  lastEditedByEmail?: string | null;
  lastEditedByName?: string | null;
  lastEditedAt?: string | null;
};

export default function CourseRoute() {
  const { id } = useParams();
  const [course, setCourse] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);

  /* ---------------------------------------------
     טענת משתמשי ועד (לשמות היפים)
  --------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
      const res = await fetch("/api/admin/course-vaad-users", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setVaadUsers(data.items || []);
      } catch (e) {
        console.warn("failed to load vaad users", e);
      }
    })();
  }, []);

  /* ---------------------------------------------
     טענת תוכן הקורס
  --------------------------------------------- */
  useEffect(() => {
    if (!id) return;

    const baseCourse = ALL_COURSES.find((c) => c.id === id) || null;

    (async () => {
      try {
        const res = await fetch(`/api/course-content/${id}`);
        if (!res.ok) {
          setCourse(baseCourse);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          exists: boolean;
          content: Partial<CourseContent> | null;
        };

        if (data.exists && data.content) {
          setCourse(
            baseCourse
              ? { ...baseCourse, ...data.content }
              : (data.content as CourseContent)
          );
        } else {
          setCourse(baseCourse);
        }
      } catch (e) {
        console.warn("[CourseRoute] failed to load course content", e);
        setCourse(baseCourse);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!id) {
    return <div className="p-4 text-sm">לא הועבר מזהה קורס.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm">טוען נתוני קורס…</div>;
  }

  if (!course) {
    return (
      <div className="p-4 text-sm">
        לא נמצא קורס עם המזהה <code>{id}</code>.
      </div>
    );
  }

  /* ---------------------------------------------
     נירמול reps (מחרוזת / מערך / undefined)
  --------------------------------------------- */
  const reps: string[] = Array.isArray(course.reps)
    ? course.reps
    : course.reps
    ? [course.reps]
    : [];

  const assignments: AssessmentItem[] = course.assignments || [];
  const exams: AssessmentItem[] = course.exams || [];

  const hasLinks =
    !!course.links?.whatsapp ||
    !!course.links?.drive ||
    !!course.links?.moodle ||
    (course.externalMaterials && course.externalMaterials.length > 0);

  const hasGeneralInfo =
    !!course.coordinator ||
    reps.length > 0 ||
    !!course.place ||
    !!course.whatwas ||
    !!course.whatwill;

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value; // טקסט חופשי ישן
    return d.toLocaleDateString("he-IL");
  };

  const formatLastEditedMeta = (c: CourseContent) => {
    if (!c.lastEditedAt) return null;
    const d = new Date(c.lastEditedAt);
    if (isNaN(d.getTime())) return null;

    const name = c.lastEditedByName || c.lastEditedByEmail || "המערכת";

    const dayStr = d.toLocaleDateString("he-IL", {
      weekday: "long",
    });
    const dateStr = d.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `נערך ע״י ${name} ביום ${dayStr}, תאריך ${dateStr} בשעה ${timeStr}`;
  };

  const lastEditedMeta = formatLastEditedMeta(course);

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4">
      <header className="mb-5 border-b pb-3 border-neutral-200 dark:border-slate-800">
        <h1 className="text-2xl font-semibold mb-1 dark:text-slate-100">
          {course.name}
        </h1>
        <p className="text-xs text-neutral-500 dark:text-slate-400 mb-1">
          מזהה קורס: <code>{course.id}</code>{" "}
          {course.courseNumber && <>· מספר קורס: {course.courseNumber}</>}
        </p>
        {course.note && (
          <p className="text-sm text-neutral-600 dark:text-slate-300 whitespace-pre-line">
            {course.note}
          </p>
        )}
      </header>

      {/* לינקים ואייקונים */}
      {hasLinks && (
        <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-sm font-semibold mb-3 text-neutral-800 dark:text-slate-100">
            קישורים חשובים
          </h2>

          <div className="flex flex-wrap gap-3 text-xs">
            {course.links?.whatsapp && (
              <a
                href={course.links.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-green-50 dark:hover:bg-green-950/40 border-neutral-200 dark:border-slate-700 dark:text-slate-100"
              >
                <img src={IMG_WHATSAPP} alt="WhatsApp" className="w-4 h-4" />
                קבוצת וואטסאפ
              </a>
            )}

            {course.links?.drive && (
              <a
                href={course.links.drive}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-neutral-200 dark:border-slate-700 dark:text-slate-100"
              >
                <img src={IMG_DRIVE} alt="Drive" className="w-4 h-4" />
                דרייב הקורס
              </a>
            )}

            {course.links?.moodle && (
              <a
                href={course.links.moodle}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/40 border-neutral-200 dark:border-slate-700 dark:text-slate-100"
              >
                <img src={IMG_MOODLE} alt="Moodle" className="w-4 h-4" />
                מודל
              </a>
            )}

            {course.syllabus && (
              <a
                href={course.syllabus}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 border-neutral-200 dark:border-slate-700 dark:text-slate-100"
              >
                <img src={IMG_PDF} alt="Syllabus" className="w-4 h-4" />
                סילבוס
              </a>
            )}

            {course.externalMaterials &&
              course.externalMaterials.map((m, idx) => (
                <a
                  key={idx}
                  href={m.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 border-neutral-200 dark:border-slate-700 dark:text-slate-100"
                >
                  {m.icon && (
                    <img src={m.icon} alt="" className="w-4 h-4" />
                  )}
                  {m.label}
                </a>
              ))}
          </div>
        </section>
      )}

      {/* מידע כללי + מה היה/יהיה */}
      {hasGeneralInfo && (
        <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
          <h2 className="text-sm font-semibold mb-3">מידע כללי</h2>
          <div className="space-y-2">
            {course.coordinator && (
              <div>
                <span className="font-medium">רכז/ת הקורס: </span>
                {course.coordinator}
              </div>
            )}

          {reps.length > 0 && (
  <div>
    <span className="font-medium">נציגי קורס: </span>
    <span className="inline-flex flex-wrap gap-x-1 gap-y-0.5">
      {reps.map((email, idx) => {
        const normalizedEmail = (email || "").trim().toLowerCase();

        const user = vaadUsers.find(
          (u) => (u.email || "").trim().toLowerCase() === normalizedEmail
        );

        const label = user?.displayName
          ? `${user.displayName} (${email})`
          : email;

        return (
          <span
            key={email}
            className="inline-block text-xs text-blue-800 dark:text-blue-200"
          >
            {label}
            {idx < reps.length - 1 && <span> ; </span>}
          </span>
        );
      })}
    </span>
  </div>
)}


            {course.place && (
              <div>
                <span className="font-medium">מיקום עיקרי: </span>
                {course.place}
              </div>
            )}

            {course.whatwas && (
              <div className="mt-3">
                <div className="font-medium">➡️ מה היה בשבוע האחרון?</div>
                <div className="text-xs text-neutral-700 dark:text-slate-300 whitespace-pre-line">
                  {course.whatwas}
                </div>
              </div>
            )}

            {course.whatwill && (
              <div className="mt-3">
                <div className="font-medium">⬅️ מה יהיה בהמשך?</div>
                <div className="text-xs text-neutral-700 dark:text-slate-300 whitespace-pre-line">
                  {course.whatwill}
                </div>

                {lastEditedMeta && (
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {lastEditedMeta}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* מטלות */}
      <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
        <h2 className="text-sm font-semibold mb-3">מטלות / עבודות</h2>
        {assignments.length === 0 ? (
          <div className="text-xs text-neutral-500">
            עדיין לא הוגדרו מטלות לקורס זה.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-neutral-50 text-[11px] text-neutral-500 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="text-right py-2 px-2">שם המטלה</th>
                  <th className="text-right py-2 px-2">תאריך</th>
                  <th className="text-right py-2 px-2">משקל</th>
                  <th className="text-right py-2 px-2">הערות</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => (
                  <tr key={idx} className="border-t border-neutral-200 dark:border-slate-800">
                    <td className="py-2 px-2 align-top">{a.title}</td>
                    <td className="py-2 px-2 align-top">{formatDate(a.date)}</td>
                    <td className="py-2 px-2 align-top">
                      {a.weight || "—"}
                    </td>
                    <td className="py-2 px-2 align-top">
                      {a.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* בחנים / מבחנים */}
      <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
        <h2 className="text-sm font-semibold mb-3">בחנים / מבחנים</h2>
        {exams.length === 0 ? (
          <div className="text-xs text-neutral-500">
            עדיין לא הוגדרו בחנים/מבחנים לקורס זה.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-neutral-50 text-[11px] text-neutral-500 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="text-right py-2 px-2">שם הבחינה</th>
                  <th className="text-right py-2 px-2">תאריך</th>
                  <th className="text-right py-2 px-2">משקל</th>
                  <th className="text-right py-2 px-2">הערות</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex, idx) => (
                  <tr key={idx} className="border-t border-neutral-200 dark:border-slate-800">
                    <td className="py-2 px-2 align-top">{ex.title}</td>
                    <td className="py-2 px-2 align-top">
                      {formatDate(ex.date)}
                    </td>
                    <td className="py-2 px-2 align-top">
                      {ex.weight || "—"}
                    </td>
                    <td className="py-2 px-2 align-top">
                      {ex.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
