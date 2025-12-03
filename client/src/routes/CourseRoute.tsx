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

type CourseContent = Course & {
  [key: string]: any;
};

export default function CourseRoute() {
  const { id } = useParams();
  const [course, setCourse] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);

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
        const data = await res.json() as {
          exists: boolean;
          content: Partial<CourseContent> | null;
        };

        if (data.exists && data.content) {
          // merge על ה־base כדי לא לאבד דברים מה־YEARS
          setCourse(
            baseCourse ? { ...baseCourse, ...data.content } : (data.content as CourseContent)
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

  const assignments: AssessmentItem[] = course.assignments || [];
  const exams: AssessmentItem[] = course.exams || [];

  const hasLinks =
    !!course.links?.whatsapp ||
    !!course.links?.drive ||
    !!course.links?.moodle ||
    (course.externalMaterials && course.externalMaterials.length > 0);

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value; // טקסט חופשי ישן
    return d.toLocaleDateString("he-IL");
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4">
      <header className="mb-5 border-b pb-3">
        <h1 className="text-2xl font-semibold mb-1">{course.name}</h1>
        <p className="text-xs text-neutral-500 mb-1">
          מזהה קורס: <code>{course.id}</code>{" "}
          {course.courseNumber && <>· מספר קורס: {course.courseNumber}</>}
        </p>
        {course.note && (
          <p className="text-sm text-neutral-600 whitespace-pre-line">
            {course.note}
          </p>
        )}
      </header>

      {/* לינקים ואייקונים */}
      {hasLinks && (
        <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm">
          <h2 className="text-sm font-semibold mb-3">קישורים חשובים</h2>
          <div className="flex flex-wrap gap-3">
            {course.links?.whatsapp && (
              <a
                href={course.links.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs hover:bg-green-50"
              >
                <img
                  src={IMG_WHATSAPP}
                  alt="WhatsApp"
                  className="w-4 h-4"
                />
                קבוצת וואטסאפ
              </a>
            )}

            {course.links?.drive && (
              <a
                href={course.links.drive}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs hover:bg-sky-50"
              >
                <img src={IMG_DRIVE} alt="Drive" className="w-4 h-4" />
                תיקיית דרייב
              </a>
            )}

            {course.links?.moodle && (
              <a
                href={course.links.moodle}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs hover:bg-amber-50"
              >
                <img src={IMG_MOODLE} alt="Moodle" className="w-4 h-4" />
                Moodle הקורס
              </a>
            )}

            {course.syllabus && (
              <a
                href={course.syllabus}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs hover:bg-red-50"
              >
                <img src={IMG_PDF} alt="סילבוס" className="w-4 h-4" />
                סילבוס PDF
              </a>
            )}
          </div>

          {course.externalMaterials && course.externalMaterials.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-neutral-600 mb-1">
                חומרים חיצוניים מומלצים
              </div>
              <div className="flex flex-wrap gap-2">
                {course.externalMaterials.map((m, idx) => (
                  <a
                    key={idx}
                    href={m.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs hover:bg-neutral-50"
                  >
                    {m.icon && (
                      <img
                        src={m.icon}
                        alt=""
                        className="w-4 h-4"
                      />
                    )}
                    <span>{m.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* מידע כללי */}
      <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm text-sm">
        <h2 className="text-sm font-semibold mb-3">מידע כללי</h2>
        <div className="space-y-1">
          {course.coordinator && (
            <div>
              <span className="font-medium">רכז/ת הקורס: </span>
              {course.coordinator}
            </div>
          )}
          {course.reps && (
            <div>
              <span className="font-medium">נציגי קורס: </span>
              {course.reps}
            </div>
          )}
          {course.place && (
            <div>
              <span className="font-medium">מיקום עיקרי: </span>
              {course.place}
            </div>
          )}
        </div>
      </section>

      {/* מטלות */}
      <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm text-sm">
        <h2 className="text-sm font-semibold mb-3">מטלות / עבודות</h2>
        {assignments.length === 0 ? (
          <div className="text-xs text-neutral-500">
            עדיין לא הוגדרו מטלות לקורס זה.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-neutral-50 text-[11px] text-neutral-500">
                <tr>
                  <th className="text-right py-2 px-2">שם המטלה</th>
                  <th className="text-right py-2 px-2">תאריך</th>
                  <th className="text-right py-2 px-2">משקל</th>
                  <th className="text-right py-2 px-2">הערות</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 px-2 align-top">{a.title}</td>
                    <td className="py-2 px-2 align-top">
                      {formatDate(a.date)}
                    </td>
                    <td className="py-2 px-2 align-top">{a.weight || "—"}</td>
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
      <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm text-sm">
        <h2 className="text-sm font-semibold mb-3">בחנים / מבחנים</h2>
        {exams.length === 0 ? (
          <div className="text-xs text-neutral-500">
            עדיין לא הוגדרו בחנים/מבחנים לקורס זה.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-neutral-50 text-[11px] text-neutral-500">
                <tr>
                  <th className="text-right py-2 px-2">שם הבחינה</th>
                  <th className="text-right py-2 px-2">תאריך</th>
                  <th className="text-right py-2 px-2">משקל</th>
                  <th className="text-right py-2 px-2">הערות</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex, idx) => (
                  <tr key={idx} className="border-t">
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
