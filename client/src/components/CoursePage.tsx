// client/src/components/CoursePage.tsx
import { useEffect, useMemo, useState } from "react";
import type { Course, AssessmentItem, ExternalMaterial } from "../data/years";

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

const pillBtn =
  "inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:border-slate-700";

const sectionCard =
  "mb-4 border rounded-2xl p-4 bg-white/90 dark:bg-slate-950/80 dark:border-slate-800";

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
    decoded.includes("<a ") ||
    decoded.includes("<ul") ||
    decoded.includes("<ol") ||
    decoded.includes("<li");

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

/**
 * ממיר לינקים של Google/Drive ל-embed URL (אם אפשר).
 * תומך: Drive folders/files, Google Docs/Sheets/Slides
 */
const toGoogleEmbedUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const u = String(url).trim();
  if (!u) return null;

  // --- Drive folder: /drive/folders/<id>
  const folder = u.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (folder) {
    return `https://drive.google.com/embeddedfolderview?id=${folder[1]}#grid`;
  }

  // --- Drive file: /file/d/<id>
  const file = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (file) {
    return `https://drive.google.com/file/d/${file[1]}/preview`;
  }

  // --- Drive open?id=<id>  (לפעמים מקבלים ככה)
  const openId = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openId) {
    // לא תמיד יודעים אם זה folder/file; preview עדיין עובד לרוב לקובץ
    return `https://drive.google.com/file/d/${openId[1]}/preview`;
  }

  // --- Google Docs: /document/d/<id>
  const doc = u.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (doc) {
    return `https://docs.google.com/document/d/${doc[1]}/preview`;
  }

  // --- Google Sheets: /spreadsheets/d/<id>
  const sheet = u.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheet) {
    // preview עובד, אפשר גם pubhtml אם מפרסמים
    return `https://docs.google.com/spreadsheets/d/${sheet[1]}/preview`;
  }

  // --- Google Slides: /presentation/d/<id>
  const slides = u.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slides) {
    return `https://docs.google.com/presentation/d/${slides[1]}/embed?start=false&loop=false&delayms=3000`;
  }

  return null;
};

const formatDateIL = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("he-IL");
};

const AssessmentList = ({
  title,
  items,
}: {
  title: string;
  items: AssessmentItem[];
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section className={sectionCard}>
      <h2 className="text-sm font-semibold mb-2">{title}</h2>

      <ul className="text-xs space-y-2">
        {items.map((a, idx) => (
          <li key={idx} className="border-b last:border-b-0 pb-2">
            <div className="font-semibold">{a.title || "ללא כותרת"}</div>

            <div className="text-neutral-700 dark:text-slate-300">
              {(a.date || a.weight) && (
                <>
                  {a.date && <span>תאריך: {a.date}</span>}
                  {a.date && a.weight && <span> · </span>}
                  {a.weight && <span>משקל: {a.weight}</span>}
                </>
              )}
            </div>

            {a.notes && <div className="mt-1">{renderRichOrPlainText(a.notes)}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
};

/* -------------------------------------------------
Component
---------------------------------------------------*/

export default function CoursePage({ course, onBack }: Props) {
  const [override, setOverride] = useState<Partial<Course> | null>(null);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);

  // UI: embeds toggle
  const [showDriveEmbed, setShowDriveEmbed] = useState(false);

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
    // אם זה לינק רגיל — פותחים ישר
    if (m.kind === "link") {
      window.open(m.href, "_blank", "noopener,noreferrer");
      return;
    }

    // אם זה קובץ ב-storage — מביאים signed url
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

  const hasLinks =
    !!links?.whatsapp ||
    !!links?.drive ||
    !!links?.moodle ||
    !!syllabus ||
    (externalMaterials && externalMaterials.length > 0);

  // --- Drive embed URL (folder/file)
  const driveEmbedUrl = useMemo(() => toGoogleEmbedUrl(links?.drive), [links?.drive]);

  // --- Embeddable items from externalMaterials (google docs/sheets/slides/drive)
  const embeddables = useMemo(() => {
    const arr = (externalMaterials || []).filter((m) => m.kind === "link");
    return arr
      .map((m) => ({ m, embedUrl: toGoogleEmbedUrl((m as any).href) }))
      .filter((x) => !!x.embedUrl);
  }, [externalMaterials]);

  /* -------------------------------------------------
Render
---------------------------------------------------*/

  return (
    <div className="px-4 py-6">
      {/* "קלף" שמחזיר שליטה על עיצוב העמוד ולא נותן לרקע/שקיפות להשתלט */}
      <div className="max-w-3xl mx-auto rounded-3xl border bg-white/95 dark:bg-slate-950/90 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        {/* Back button */}
        {onBack && (
          <button type="button" onClick={onBack} className={pillBtn}>
            ← חזרה
          </button>
        )}

        <h1 className="text-2xl font-semibold mt-3 mb-1">{name}</h1>

        <div className="text-sm text-neutral-600 dark:text-slate-300 mb-2">
          {courseNumber && <span className="ml-2">מס׳ קורס: {courseNumber}</span>}
          {place && <span> · מקום: {place}</span>}
        </div>

        {note && (
          <p className="text-sm text-neutral-700 dark:text-slate-300 mb-4 whitespace-pre-line">
            {note}
          </p>
        )}

        {(coordinator || repsDisplay.length > 0) && (
          <p className="text-xs text-neutral-600 dark:text-slate-300 mb-4">
            {coordinator && <span>רכז/ת: {coordinator}</span>}
            {coordinator && repsDisplay.length > 0 && <span> · </span>}
            {repsDisplay.length > 0 && (
              <span>
                נציגי ועד: <span dir="ltr">{repsDisplay.join(", ")}</span>
              </span>
            )}
          </p>
        )}

        {/* Links + materials buttons */}
        {hasLinks && (
          <section className={sectionCard}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold">קישורים וחומרים</h2>

              {/* Toggle drive embed if possible */}
              {driveEmbedUrl && (
                <button
                  type="button"
                  onClick={() => setShowDriveEmbed((s) => !s)}
                  className={pillBtn}
                >
                  {showDriveEmbed ? "הסתר דרייב מוטמע" : "הצג דרייב מוטמע"}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {links?.whatsapp && (
                <a href={links.whatsapp} target="_blank" rel="noreferrer" className={pillBtn}>
                  WhatsApp
                </a>
              )}

              {links?.drive && (
                <a href={links.drive} target="_blank" rel="noreferrer" className={pillBtn}>
                  Drive
                </a>
              )}

              {links?.moodle && (
                <a href={links.moodle} target="_blank" rel="noreferrer" className={pillBtn}>
                  Moodle
                </a>
              )}

              {syllabus && (
                <a href={syllabus} target="_blank" rel="noreferrer" className={pillBtn}>
                  Syllabus
                </a>
              )}

              {externalMaterials?.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openExternalMaterial(m)}
                  className={pillBtn}
                  title={m.kind === "file" ? m.originalName || m.storagePath : (m as any).href}
                >
                  {m.icon && <img src={m.icon} alt="" className="w-4 h-4" />}
                  <span className="truncate max-w-[240px]">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Drive embed */}
            {showDriveEmbed && driveEmbedUrl && (
              <div className="mt-4">
                <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
                  דרייב מוטמע (אם לא נטען — בד״כ זה בגלל הרשאות שיתוף)
                </div>
                <div className="rounded-2xl overflow-hidden border dark:border-slate-800">
                  <iframe
                    title="Drive embed"
                    src={driveEmbedUrl}
                    className="w-full"
                    style={{ height: 520 }}
                    allow="autoplay"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* whatwas / whatwill */}
        {whatwas && (
          <section className={sectionCard}>
            <h3 className="text-sm font-semibold mb-2">מה היה בשבוע האחרון?</h3>
            {renderRichOrPlainText(whatwas)}
          </section>
        )}

        {whatwill && (
          <section className={sectionCard}>
            <h3 className="text-sm font-semibold mb-2">מה יהיה בהמשך?</h3>
            {renderRichOrPlainText(whatwill)}
          </section>
        )}

        {/* Embedded Google docs/sheets/slides from externalMaterials */}
        {embeddables.length > 0 && (
          <section className={sectionCard}>
            <h3 className="text-sm font-semibold mb-2">מסמכים מוטמעים</h3>

            <div className="space-y-4">
              {embeddables.map(({ m, embedUrl }) => (
                <div key={m.id} className="border rounded-2xl overflow-hidden dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 p-3 bg-neutral-50 dark:bg-slate-900">
                    <div className="text-xs font-semibold truncate">
                      {m.label || "מסמך"}
                    </div>
                    <a
                      href={(m as any).href}
                      target="_blank"
                      rel="noreferrer"
                      className={pillBtn}
                    >
                      פתיחה בטאב
                    </a>
                  </div>

                  <iframe
                    title={`embed-${m.id}`}
                    src={embedUrl!}
                    className="w-full"
                    style={{ height: 520 }}
                    allow="autoplay"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* announcements */}
        {announcements.length > 0 && (
          <section className={sectionCard}>
            <h3 className="text-sm font-semibold mb-2">מודעות לקורס זה</h3>
            <ul className="text-xs space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="border-b last:border-b-0 pb-3">
                  <div className="font-semibold mb-1">{a.title}</div>
                  {renderRichOrPlainText(a.body)}
                  <div className="text-[10px] text-neutral-400 dark:text-slate-500 mt-2">
                    {formatAnnouncementMeta(a)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* assignments/exams/labs — החזרתי אותם */}
        <AssessmentList title="מטלות / עבודות" items={assignments} />
        <AssessmentList title="בחנים / מבחנים" items={exams} />
        <AssessmentList title="מעבדות" items={labs} />

        {/* footer small meta (optional) */}
        <div className="mt-6 text-[11px] text-neutral-500 dark:text-slate-400">
          עודכן לאחרונה:{" "}
          {override && (override as any).lastEditedAt
            ? formatDateIL((override as any).lastEditedAt)
            : "—"}
        </div>
      </div>
    </div>
  );
}
