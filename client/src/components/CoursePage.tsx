// client/src/components/CoursePage.tsx
import { useEffect, useMemo, useState } from "react";
import type { Course, AssessmentItem } from "../data/years";

type Props = {
  course: Course;
  onBack?: () => void;
};

type CourseAnnouncement = {
  id: string;
  title: string;
  body: string;
  courseId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  authorEmail?: string | null;
};

type VaadUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export default function CoursePage({ course, onBack }: Props) {
  const [override, setOverride] = useState<Partial<Course> | null>(null);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);

  const effectiveCourse = useMemo<Course>(() => {
    return {
      ...course,
      ...(override || {}),
    };
  }, [course, override]);

  // --- טעינת override ספציפי לקורס ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/course-content/${course.id}`);
        if (!res.ok) return;
        const data = await res.json();
        console.log("[CoursePage] override from server:", data);

        if (data.exists && data.content) {
          setOverride(data.content as Partial<Course>);
        } else {
          setOverride(null);
        }
      } catch (e) {
        console.warn("[CoursePage] failed to load override", e);
      }
    })();
  }, [course.id]);

  // --- טעינת מודעות לקורס ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data = (await res.json()) as { items: CourseAnnouncement[] };

        const relevant = (data.items || []).filter(
  (a) => a.courseId === course.id
);

setAnnouncements(relevant);


        setAnnouncements(relevant);
      } catch (e) {
        console.warn("[CoursePage] failed to load announcements", e);
      }
    })();
  }, [course.id]);

  // --- טעינת רשימת ועדי קורס (לשם + מייל) ---
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
      console.warn("[CoursePage] failed to load vaad users", e);
    }
  })();
}, []);

  const formatAnnouncementMeta = (a: CourseAnnouncement) => {
    const ts = a.updatedAt || a.createdAt;
    if (!ts) return a.authorEmail ? `עודכן ע"י ${a.authorEmail}` : "";

    const d = new Date(ts);

    const dateStr = d.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const timeStr = d.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const by = a.authorEmail ? ` ע"י ${a.authorEmail}` : "";

    return `עודכן בתאריך ${dateStr} בשעה ${timeStr}${by}`;
  };

  // פירוק מה־effectiveCourse
  const {
    name,
    note,
    coordinator,
    reps: rawReps,
    courseNumber,
    place,
    syllabus,
    links,
    whatwas,
    whatwill,
    externalMaterials,
  } = effectiveCourse as Course & { reps?: string | string[] };

  const assignments: AssessmentItem[] = effectiveCourse.assignments || [];
  const exams: AssessmentItem[] = effectiveCourse.exams || [];

  // --- נירמול reps למערך + תצוגה עם השם ---
  const repsArray: string[] = useMemo(() => {
    if (Array.isArray(rawReps)) return rawReps;
    if (typeof rawReps === "string" && rawReps.trim() !== "") {
      return [rawReps];
    }
    return [];
  }, [rawReps]);

  const repsDisplay: string[] = useMemo(() => {
    return repsArray.map((email) => {
      const normalizedEmail = (email || "").trim().toLowerCase();
      const user = vaadUsers.find(
        (u) => (u.email || "").trim().toLowerCase() === normalizedEmail
      );
      return user?.displayName ? `${user.displayName} (${email})` : email;
    });
  }, [repsArray, vaadUsers]);

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-xs mb-3 underline text-neutral-600"
        >
          ← חזרה לרשימת הקורסים
        </button>
      )}

      <h1 className="text-2xl font-semibold mb-1">{name}</h1>

      <div className="text-sm text-neutral-600 mb-2">
        {courseNumber && <span className="ml-2">מס׳ קורס: {courseNumber}</span>}
        {place && <span> · מקום: {place}</span>}
      </div>

      {note && (
        <p className="text-sm text-neutral-700 mb-2 whitespace-pre-line">
          {note}
        </p>
      )}

      {(coordinator || repsDisplay.length > 0 || whatwas || whatwill) && (
        <p className="text-xs text-neutral-600 mb-4">
          {coordinator && <span>רכז/ת: {coordinator}</span>}
          {coordinator && repsDisplay.length > 0 && <span> · </span>}
          {repsDisplay.length > 0 && (
            <span>
              נציגי ועד:{" "}
              <span dir="ltr">
                {repsDisplay.join(", ")}
              </span>
            </span>
          )}
          {whatwas && (
            <>
              {" · "}
              <span>מה היה בשבוע האחרון? {whatwas}</span>
            </>
          )}
          {whatwill && (
            <>
              {" · "}
              <span>מה יהיה בהמשך? {whatwill}</span>
            </>
          )}
        </p>
      )}

      {/* מודעות לקורס */}
      {announcements.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3">
          <h3 className="text-sm font-medium mb-2">מודעות לקורס זה</h3>
          <ul className="text-xs space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="border-b last:border-b-0 pb-2">
                <div className="font-semibold">{a.title}</div>
                <div className="text-neutral-700 whitespace-pre-line">
                  {a.body}
                </div>
                {(a.createdAt || a.updatedAt || a.authorEmail) && (
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {formatAnnouncementMeta(a)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* חומרים חיצוניים */}
      {externalMaterials && externalMaterials.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3">
          <h2 className="text-sm font-medium mb-2">חומרים חיצוניים מומלצים</h2>
          <ul className="text-xs space-y-2">
            {externalMaterials.map((m, idx) => (
              <li key={idx}>
                <a
                  href={m.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border rounded-xl px-3 py-1 hover:bg-neutral-50"
                >
                  {m.icon && (
                    <img src={m.icon} alt="" className="w-4 h-4" />
                  )}
                  <span>{m.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* קישורים */}
      {links && (
        <section className="mb-4 border rounded-2xl p-4 bg-white shadow-sm text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
          <h2 className="text-sm font-medium mb-2">קישורים</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {links.drive && (
              <a
                href={links.drive}
                target="_blank"
                rel="noreferrer"
                className="border rounded-xl px-3 py-1 hover:bg-neutral-50"
              >
                כונן משותף
              </a>
            )}
            {links.moodle && (
              <a
                href={links.moodle}
                target="_blank"
                rel="noreferrer"
                className="border rounded-xl px-3 py-1 hover:bg-neutral-50"
              >
                Moodle
              </a>
            )}
            {links.whatsapp && (
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="border rounded-xl px-3 py-1 hover:bg-neutral-50"
              >
                קבוצת WhatsApp
              </a>
            )}
            {syllabus && (
              <a
                href={syllabus}
                target="_blank"
                rel="noreferrer"
                className="border rounded-xl px-3 py-1 hover:bg-neutral-50"
              >
                סילבוס
              </a>
            )}
          </div>
        </section>
      )}

      {/* מטלות */}
      {assignments.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3">
          <h2 className="text-sm font-medium mb-2">מטלות / עבודות</h2>
          <ul className="text-xs space-y-2">
            {assignments.map((a, idx) => (
              <li key={idx} className="border-b last:border-b-0 pb-2">
                <div className="font-semibold">{a.title}</div>
                <div className="text-neutral-700">
                  {a.date && <span>תאריך: {a.date}</span>}
                  {a.date && a.weight && <span> · </span>}
                  {a.weight && <span>משקל: {a.weight}</span>}
                </div>
                {a.notes && (
                  <div className="text-[11px] text-neutral-600 mt-1 whitespace-pre-line">
                    {a.notes}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* בחנים / מבחנים */}
      {exams.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3">
          <h2 className="text-sm font-medium mb-2">בחנים / מבחנים</h2>
          <ul className="text-xs space-y-2">
            {exams.map((ex, idx) => (
              <li key={idx} className="border-b last:border-b-0 pb-2">
                <div className="font-semibold">{ex.title}</div>
                <div className="text-neutral-700">
                  {ex.date && <span>תאריך: {ex.date}</span>}
                  {ex.date && ex.weight && <span> · </span>}
                  {ex.weight && <span>משקל: {ex.weight}</span>}
                </div>
                {ex.notes && (
                  <div className="text-[11px] text-neutral-600 mt-1 whitespace-pre-line">
                    {ex.notes}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
