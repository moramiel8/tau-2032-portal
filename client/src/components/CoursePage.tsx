// client/src/components/CoursePage.tsx
import { useEffect, useMemo, useState } from "react";
import type { Course, AssessmentItem, ExternalMaterial } from "../data/years";

/* -------------------------------------------------
Types
---------------------------------------------------*/

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

/* -------------------------------------------------
Helpers (outside component)
---------------------------------------------------*/

const decodeHtmlEntities = (str: string) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = str;
  return textarea.value;
};

const renderRichOrPlainText = (body?: string) => {
  if (!body) return null;

  const decoded = decodeHtmlEntities(body);

  const looksLikeHtml =
    decoded.includes("<p") ||
    decoded.includes("<br") ||
    decoded.includes("<div") ||
    decoded.includes("<span") ||
    decoded.includes("<strong") ||
    decoded.includes("<em") ||
    decoded.includes("<a ");

  if (looksLikeHtml) {
    return (
      <div
        className="text-xs text-neutral-700 dark:text-slate-300 announcement-body"
        dangerouslySetInnerHTML={{ __html: decoded }}
      />
    );
  }

  return (
    <div className="text-xs text-neutral-700 dark:text-slate-300 whitespace-pre-line">
      {decoded}
    </div>
  );
};

/* -------------------------------------------------
Component
---------------------------------------------------*/

export default function CoursePage({ course, onBack }: Props) {
  const [override, setOverride] = useState<Partial<Course> | null>(null);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);

  const effectiveCourse = useMemo<Course>(() => {
    return { ...course, ...(override || {}) };
  }, [course, override]);

  /* -------------------------------------------------
Load course override
---------------------------------------------------*/

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/course-content/${course.id}`);
        if (!res.ok) return;
        const data = await res.json();
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

  /* -------------------------------------------------
Load announcements
---------------------------------------------------*/

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data = await res.json();
        const items: CourseAnnouncement[] = Array.isArray(data)
          ? data
          : data.items || [];

        setAnnouncements(items.filter((a) => a.courseId === course.id));
      } catch (e) {
        console.warn("[CoursePage] failed to load announcements", e);
      }
    })();
  }, [course.id]);

  /* -------------------------------------------------
Load vaad users (display names)
---------------------------------------------------*/

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

  /* -------------------------------------------------
Helpers
---------------------------------------------------*/

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

    return `עודכן בתאריך ${dateStr} בשעה ${timeStr}${
      a.authorEmail ? ` ע"י ${a.authorEmail}` : ""
    }`;
  };

  const openExternalMaterial = async (m: ExternalMaterial) => {
    if (m.kind === "link") {
      window.open(m.href, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/storage/signed-url?bucket=${encodeURIComponent(
          m.bucket || "materials"
        )}&path=${encodeURIComponent(m.storagePath)}`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error();
      const data = await res.json();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("לא ניתן לפתוח את הקובץ");
    }
  };

  /* -------------------------------------------------
Derived data
---------------------------------------------------*/

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
  const labs: AssessmentItem[] = effectiveCourse.labs || [];

  const repsArray: string[] = useMemo(() => {
    if (Array.isArray(rawReps)) return rawReps;
    if (typeof rawReps === "string" && rawReps.trim()) return [rawReps];
    return [];
  }, [rawReps]);

  const repsDisplay = useMemo(() => {
    return repsArray.map((email) => {
      const user = vaadUsers.find(
        (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase()
      );
      return user?.displayName ? `${user.displayName} (${email})` : email;
    });
  }, [repsArray, vaadUsers]);

  /* -------------------------------------------------
Render
---------------------------------------------------*/

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

      {(coordinator || repsDisplay.length > 0) && (
        <p className="text-xs text-neutral-600 mb-4">
          {coordinator && <span>רכז/ת: {coordinator}</span>}
          {coordinator && repsDisplay.length > 0 && <span> · </span>}
          {repsDisplay.length > 0 && (
            <span dir="ltr">נציגי ועד: {repsDisplay.join(", ")}</span>
          )}
        </p>
      )}

      {whatwas && (
        <section className="mb-4 border rounded-2xl p-3">
          <h3 className="text-sm font-medium mb-1">מה היה בשבוע האחרון?</h3>
          {renderRichOrPlainText(whatwas)}
        </section>
      )}

      {whatwill && (
        <section className="mb-4 border rounded-2xl p-3">
          <h3 className="text-sm font-medium mb-1">מה יהיה בהמשך?</h3>
          {renderRichOrPlainText(whatwill)}
        </section>
      )}

      {announcements.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3">
          <h3 className="text-sm font-medium mb-2">מודעות לקורס זה</h3>
          <ul className="text-xs space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="border-b last:border-b-0 pb-2">
                <div className="font-semibold">{a.title}</div>
                {renderRichOrPlainText(a.body)}
                <div className="text-[10px] text-neutral-400 mt-1">
                  {formatAnnouncementMeta(a)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {externalMaterials && externalMaterials.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3">
          <h2 className="text-sm font-medium mb-2">חומרים חיצוניים</h2>
          <ul className="text-xs space-y-2">
            {externalMaterials.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => openExternalMaterial(m)}
                  className="inline-flex items-center gap-2 border rounded-xl px-3 py-1 hover:bg-neutral-50"
                >
                  {m.icon && <img src={m.icon} className="w-4 h-4" />}
                  <span>{m.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* assignments / exams / labs — נשארים כמו אצלך */}
    </div>
  );
}
