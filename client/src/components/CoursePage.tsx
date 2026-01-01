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

const isProbablyUrl = (s?: string | null) =>
  !!s && /^https?:\/\//i.test(String(s).trim());

/**
 * מחזיר URL להטמעה אם זה:
 * - Google Drive folder/file
 * - Google Docs/Sheets/Slides
 * אחרת: null
 */
const toGoogleEmbedUrl = (url: string): string | null => {
  const u = url.trim();

  // Google Drive folder
  const folderMatch = u.match(
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/
  );
  if (folderMatch) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
  }

  // Google Drive file
  const fileMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  // Google Docs
  const docMatch = u.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return `https://docs.google.com/document/d/${docMatch[1]}/pub?embedded=true`;
  }

  // Google Sheets
  const sheetMatch = u.match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  );
  if (sheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/pubhtml?widget=true&headers=false`;
  }

  // Google Slides
  const slidesMatch = u.match(
    /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/
  );
  if (slidesMatch) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/embed?start=false&loop=false&delayms=3000`;
  }

  return null;
};

/* -------------------------------------------------
Component
---------------------------------------------------*/

export default function CoursePage({ course, onBack }: Props) {
  const [override, setOverride] = useState<Partial<Course> | null>(null);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);

  // toggles
  const [showDriveEmbed, setShowDriveEmbed] = useState(false);
  const [embedOpen, setEmbedOpen] = useState<Record<string, boolean>>({});

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

    // file -> signed url
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

  const toggleEmbed = (key: string) => {
    setEmbedOpen((prev) => ({ ...prev, [key]: !prev[key] }));
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

  const driveUrl = links?.drive || "";
  const driveEmbedUrl = isProbablyUrl(driveUrl) ? toGoogleEmbedUrl(driveUrl) : null;

  const syllabusEmbedUrl = isProbablyUrl(syllabus || "")
    ? toGoogleEmbedUrl(String(syllabus))
    : null;

  /* -------------------------------------------------
UI
---------------------------------------------------*/

  return (
    <div className="max-w-3xl mx-auto pb-10 px-4">
      {/* כפתור חזרה אחיד */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:border-slate-700"
        >
          ← חזרה
        </button>
      )}

      <h1 className="text-2xl font-semibold mb-1 dark:text-slate-100">{name}</h1>

      <div className="text-sm text-neutral-600 dark:text-slate-300 mb-2">
        {courseNumber && <span className="ml-2">מס׳ קורס: {courseNumber}</span>}
        {place && <span> · מקום: {place}</span>}
      </div>

      {note && (
        <p className="text-sm text-neutral-700 dark:text-slate-200 mb-3 whitespace-pre-line">
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

      {/* LINKS + EMBEDS */}
      {(links?.drive || links?.moodle || links?.whatsapp || syllabus || (externalMaterials?.length || 0) > 0) && (
        <section className="mb-5 border rounded-2xl p-4 bg-white/70 dark:bg-slate-900/70 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-3 dark:text-slate-100">קישורים וחומרים</h2>

          <div className="flex flex-wrap gap-2 text-xs">
            {links?.whatsapp && (
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
              >
                WhatsApp
              </a>
            )}

            {links?.drive && (
              <a
                href={links.drive}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
              >
                Drive
              </a>
            )}

            {links?.moodle && (
              <a
                href={links.moodle}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
              >
                Moodle
              </a>
            )}

            {syllabus && (
              <a
                href={syllabus}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
              >
                Syllabus
              </a>
            )}

            {/* Toggle embed Drive */}
            {links?.drive && driveEmbedUrl && (
              <button
                type="button"
                onClick={() => setShowDriveEmbed((v) => !v)}
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
              >
                {showDriveEmbed ? "הסתר דרייב מוטמע" : "הצג דרייב מוטמע"}
              </button>
            )}

            {/* Toggle embed Syllabus if google */}
            {syllabus && syllabusEmbedUrl && (
              <button
                type="button"
                onClick={() => toggleEmbed("syllabus")}
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
              >
                {embedOpen["syllabus"] ? "הסתר סילבוס מוטמע" : "הצג סילבוס מוטמע"}
              </button>
            )}
          </div>

          {/* Embeds area */}
          {showDriveEmbed && driveEmbedUrl && (
            <div className="mt-4 border rounded-2xl overflow-hidden dark:border-slate-700">
              <iframe
                src={driveEmbedUrl}
                className="w-full"
                style={{ height: 520 }}
                allow="autoplay"
              />
            </div>
          )}

          {embedOpen["syllabus"] && syllabusEmbedUrl && (
            <div className="mt-4 border rounded-2xl overflow-hidden dark:border-slate-700">
              <iframe
                src={syllabusEmbedUrl}
                className="w-full"
                style={{ height: 520 }}
                allow="autoplay"
              />
            </div>
          )}

          {/* external materials list (+ embeds for google links) */}
          {externalMaterials && externalMaterials.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium mb-2 dark:text-slate-100">
                חומרים חיצוניים
              </h3>

              <ul className="text-xs space-y-2">
                {externalMaterials.map((m) => {
                  const key = `ext-${m.id}`;
                  const href = m.kind === "link" ? m.href : "";
                  const embedUrl =
                    m.kind === "link" && isProbablyUrl(href)
                      ? toGoogleEmbedUrl(href)
                      : null;

                  return (
                    <li key={m.id} className="border rounded-xl p-3 bg-white/70 dark:bg-slate-950/30 dark:border-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openExternalMaterial(m)}
                          className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
                        >
                          {m.icon && <img src={m.icon} className="w-4 h-4" />}
                          <span>{m.label}</span>
                        </button>

                        {m.kind === "link" && embedUrl && (
                          <button
                            type="button"
                            onClick={() => toggleEmbed(key)}
                            className="inline-flex items-center gap-2 border rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
                          >
                            {embedOpen[key] ? "הסתר הטמעה" : "הצג הטמעה"}
                          </button>
                        )}
                      </div>

                      {m.kind === "link" && embedUrl && embedOpen[key] && (
                        <div className="mt-3 border rounded-2xl overflow-hidden dark:border-slate-700">
                          <iframe
                            src={embedUrl}
                            className="w-full"
                            style={{ height: 520 }}
                            allow="autoplay"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* whatwas / whatwill */}
      {whatwas && (
        <section className="mb-4 border rounded-2xl p-3 bg-white/70 dark:bg-slate-900/70 dark:border-slate-700">
          <h3 className="text-sm font-medium mb-1 dark:text-slate-100">
            מה היה בשבוע האחרון?
          </h3>
          {renderRichOrPlainText(whatwas)}
        </section>
      )}

      {whatwill && (
        <section className="mb-4 border rounded-2xl p-3 bg-white/70 dark:bg-slate-900/70 dark:border-slate-700">
          <h3 className="text-sm font-medium mb-1 dark:text-slate-100">
            מה יהיה בהמשך?
          </h3>
          {renderRichOrPlainText(whatwill)}
        </section>
      )}

      {/* announcements */}
      {announcements.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3 bg-white/70 dark:bg-slate-900/70 dark:border-slate-700">
          <h3 className="text-sm font-medium mb-2 dark:text-slate-100">
            מודעות לקורס זה
          </h3>
          <ul className="text-xs space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="border-b last:border-b-0 pb-3 dark:border-slate-700">
                <div className="font-semibold mb-1 dark:text-slate-100">{a.title}</div>
                {renderRichOrPlainText(a.body)}
                <div className="text-[10px] text-neutral-400 mt-2">
                  {formatAnnouncementMeta(a)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* assignments */}
      {assignments.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3 bg-white/70 dark:bg-slate-900/70 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-2 dark:text-slate-100">מטלות / עבודות</h2>
          <ul className="text-xs space-y-2">
            {assignments.map((a, idx) => (
              <li key={idx} className="border-b last:border-b-0 pb-2 dark:border-slate-700">
                <div className="font-semibold dark:text-slate-100">{a.title}</div>
                <div className="text-neutral-700 dark:text-slate-300">
                  {a.date && <span>תאריך: {a.date}</span>}
                  {a.date && a.weight && <span> · </span>}
                  {a.weight && <span>משקל: {a.weight}</span>}
                </div>
                {a.notes && <div className="mt-1">{renderRichOrPlainText(a.notes)}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* exams */}
      {exams.length > 0 && (
        <section className="mb-4 border rounded-2xl p-3 bg-white/70 dark:bg-slate-900/70 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-2 dark:text-slate-100">בחנים / מבחנים</h2>
          <ul className="text-xs space-y-2">
            {exams.map((ex, idx) => (
              <li key={idx} className="border-b last:border-b-0 pb-2 dark:border-slate-700">
                <div className="font-semibold dark:text-slate-100">{ex.title}</div>
                <div className="text-neutral-700 dark:text-slate-300">
                  {ex.date && <span>תאריך: {ex.date}</span>}
                  {ex.date && ex.weight && <span> · </span>}
                  {ex.weight && <span>משקל: {ex.weight}</span>}
                </div>
                {ex.notes && <div className="mt-1">{renderRichOrPlainText(ex.notes)}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* labs */}
      {labs.length > 0 && (
        <section className="mb-6 border rounded-2xl p-3 bg-white/70 dark:bg-slate-900/70 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-2 dark:text-slate-100">מעבדות</h2>
          <ul className="text-xs space-y-2">
            {labs.map((lab, idx) => (
              <li key={idx} className="border-b last:border-b-0 pb-2 dark:border-slate-700">
                <div className="font-semibold dark:text-slate-100">{lab.title}</div>
                <div className="text-neutral-700 dark:text-slate-300">
                  {lab.date && <span>תאריך: {lab.date}</span>}
                  {lab.date && lab.weight && <span> · </span>}
                  {lab.weight && <span>משקל: {lab.weight}</span>}
                </div>
                {lab.notes && <div className="mt-1">{renderRichOrPlainText(lab.notes)}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
