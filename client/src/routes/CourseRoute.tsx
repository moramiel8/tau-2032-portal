// client/src/routes/CourseRoute.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { stripHtml } from "../utils/stripHtml";

import { useYearsContext } from "../context/YearsContext";
import type { ExternalMaterial } from "../data/years";

import {
  IMG_DRIVE,
  IMG_MOODLE,
  IMG_WHATSAPP,
  IMG_PDF,
} from "../constants/icons";

/* ---------- Local types ---------- */

type AssessmentItem = {
  title?: string;
  date?: string;
  weight?: string;
  notes?: string;
};

type Links = {
  drive?: string;
  moodle?: string;
  whatsapp?: string;
};

type BaseCourse = {
  id: string;
  name: string;
  reps?: string[] | string;
  coordinator?: string;
  courseNumber?: string;
  note?: string;
  place?: string;
  whatwas?: string;
  whatwill?: string;
  assignments?: AssessmentItem[];
  exams?: AssessmentItem[];
  labs?: AssessmentItem[];
  syllabus?: string;
  links?: Links;
  externalMaterials?: ExternalMaterial[];
};

type VaadUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type CourseContent = BaseCourse & {
  lastEditedByEmail?: string | null;
  lastEditedByName?: string | null;
  lastEditedAt?: string | null;
};

type CourseAnnouncement = {
  id: string;
  title: string;
  body: string;
  courseId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  authorEmail?: string | null;
  authorName?: string | null;
};

/* ---------- UI helpers ---------- */

const pillBtn =
  "inline-flex items-center gap-2 border rounded-xl px-3 py-2 text-xs bg-white/80 hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:border-slate-700 cursor-pointer";

const sectionCard =
  "mb-4 border rounded-2xl p-4 bg-white/90 dark:bg-slate-950/80 dark:border-slate-800";

/* ---------- Text helpers ---------- */

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

  // Drive folder: /drive/folders/<id>
  const folder = u.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (folder) {
    return `https://drive.google.com/embeddedfolderview?id=${folder[1]}#grid`;
  }

  // Drive file: /file/d/<id>
  const file = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (file) {
    return `https://drive.google.com/file/d/${file[1]}/preview`;
  }

  // Drive open?id=<id>
  const openId = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openId) {
    return `https://drive.google.com/file/d/${openId[1]}/preview`;
  }

  // Google Docs
  const doc = u.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (doc) {
    return `https://docs.google.com/document/d/${doc[1]}/preview`;
  }

  // Google Sheets
  const sheet = u.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheet) {
    return `https://docs.google.com/spreadsheets/d/${sheet[1]}/preview`;
  }

  // Google Slides
  const slides = u.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slides) {
    return `https://docs.google.com/presentation/d/${slides[1]}/embed?start=false&loop=false&delayms=3000`;
  }

  return null;
};

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
          <li key={idx} className="border-b last:border-b-0 pb-2 dark:border-slate-800">
            <div className="font-semibold">{a.title || "ללא כותרת"}</div>

            {(a.date || a.weight) && (
              <div className="text-neutral-700 dark:text-slate-300 mt-1">
                {a.date && <span>תאריך: {a.date}</span>}
                {a.date && a.weight && <span> · </span>}
                {a.weight && <span>משקל: {a.weight}</span>}
              </div>
            )}

            {a.notes && (
              <div className="mt-2">
                {renderRichOrPlainText(a.notes)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ------------------------------------------------------------------ */

export default function CourseRoute() {
  const { allCourses } = useYearsContext();
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);

  // UI toggles
  const [showDriveEmbed, setShowDriveEmbed] = useState(false);

  /* -------------------------------------------------
  Navigation
  ---------------------------------------------------*/
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  /* -------------------------------------------------
  Load vaad users
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
        console.warn("failed to load vaad users", e);
      }
    })();
  }, []);

  /* -------------------------------------------------
  Load course content
  ---------------------------------------------------*/
  useEffect(() => {
    if (!id) return;

    const baseCourse =
      (allCourses.find((c) => c.id === id) as BaseCourse | undefined) || null;

    (async () => {
      try {
        const res = await fetch(`/api/course-content/${id}`);
        if (!res.ok) {
          setCourse(baseCourse);
          setLoading(false);
          return;
        }

        const data = await res.json();

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
  }, [id, allCourses]);

  /* -------------------------------------------------
  Load announcements
  ---------------------------------------------------*/
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/announcements?courseId=${encodeURIComponent(id)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        const items: CourseAnnouncement[] = Array.isArray(data)
          ? data
          : data.items || [];

        setAnnouncements(items.filter((a) => a.courseId === id));
      } catch (e) {
        console.warn("[CourseRoute] failed to load announcements", e);
      }
    })();
  }, [id]);

  /* -------------------------------------------------
  Guards
  ---------------------------------------------------*/
  if (!id) return <div className="p-4 text-sm">Missing course id</div>;
  if (loading) return <div className="p-4 text-sm">Loading course…</div>;
  if (!course) {
    return (
      <div className="p-4 text-sm">
        Course not found: <code>{id}</code>
      </div>
    );
  }

  /* -------------------------------------------------
  Derived data
  ---------------------------------------------------*/
  const reps: string[] = Array.isArray(course.reps)
    ? course.reps
    : course.reps
    ? [course.reps]
    : [];

  const getDisplayNameByEmail = (email?: string | null): string | null => {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const match = vaadUsers.find(
      (u) => u.email.trim().toLowerCase() === normalized
    );
    return match?.displayName || email;
  };

  const repsDisplay = reps.map((email) => {
    const name = getDisplayNameByEmail(email);
    return name && name !== email ? `${name} (${email})` : email;
  });

  const assignments = course.assignments || [];
  const exams = course.exams || [];
  const labs = course.labs || [];

  const hasLinks =
    !!course.links?.whatsapp ||
    !!course.links?.drive ||
    !!course.links?.moodle ||
    !!course.syllabus ||
    (course.externalMaterials && course.externalMaterials.length > 0);

  // Drive embed URL (folder/file)
  const driveEmbedUrl = useMemo(
    () => toGoogleEmbedUrl(course.links?.drive),
    [course.links?.drive]
  );

  // Embeddable items from externalMaterials (google docs/sheets/slides/drive)
  const embeddables = useMemo(() => {
    const arr = (course.externalMaterials || []).filter((m) => m.kind === "link");
    return arr
      .map((m) => ({ m, embedUrl: toGoogleEmbedUrl((m as any).href) }))
      .filter((x) => !!x.embedUrl);
  }, [course.externalMaterials]);

  /* -------------------------------------------------
  External material open helper
  ---------------------------------------------------*/
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
  Render
  ---------------------------------------------------*/

  return (
    <div className="px-4 py-6">
      {/* קלף שמחזיר שליטה לעיצוב ולא נותן לרקע “לשטוף” את הכל */}
      <div className="max-w-4xl mx-auto rounded-3xl border bg-white/95 dark:bg-slate-950/90 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <button onClick={handleBack} className={pillBtn}>
            ← חזרה
          </button>

          {/* אופציונלי: מידע עריכה */}
          {(course.lastEditedAt || course.lastEditedByName || course.lastEditedByEmail) && (
            <div className="text-[11px] text-neutral-500 dark:text-slate-400 text-left">
              {course.lastEditedAt && (
                <div>
                  עודכן:{" "}
                  {new Date(course.lastEditedAt).toLocaleString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
              {(course.lastEditedByName || course.lastEditedByEmail) && (
                <div>
                  ע"י: {course.lastEditedByName || course.lastEditedByEmail}
                </div>
              )}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-semibold mt-3 mb-1">{course.name}</h1>

        {(course.courseNumber || course.place) && (
          <div className="text-sm text-neutral-600 dark:text-slate-300 mb-2">
            {course.courseNumber && <span className="ml-2">מס׳ קורס: {course.courseNumber}</span>}
            {course.place && <span> · מקום: {course.place}</span>}
          </div>
        )}

        {course.note && (
          <p className="text-sm text-neutral-700 dark:text-slate-300 mb-4 whitespace-pre-line">
            {course.note}
          </p>
        )}

        {(course.coordinator || repsDisplay.length > 0) && (
          <p className="text-xs text-neutral-600 dark:text-slate-300 mb-4">
            {course.coordinator && <span>רכז/ת: {course.coordinator}</span>}
            {course.coordinator && repsDisplay.length > 0 && <span> · </span>}
            {repsDisplay.length > 0 && (
              <span>
                נציגי ועד: <span dir="ltr">{repsDisplay.join(", ")}</span>
              </span>
            )}
          </p>
        )}

        {/* Links + materials */}
        {hasLinks && (
          <section className={sectionCard}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold">קישורים וחומרים</h2>

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
              {course.links?.whatsapp && (
                <a href={course.links.whatsapp} target="_blank" rel="noreferrer" className={pillBtn}>
                  <img src={IMG_WHATSAPP} className="w-4 h-4" />
                  WhatsApp
                </a>
              )}

              {course.links?.drive && (
                <a href={course.links.drive} target="_blank" rel="noreferrer" className={pillBtn}>
                  <img src={IMG_DRIVE} className="w-4 h-4" />
                  Drive
                </a>
              )}

              {course.links?.moodle && (
                <a href={course.links.moodle} target="_blank" rel="noreferrer" className={pillBtn}>
                  <img src={IMG_MOODLE} className="w-4 h-4" />
                  Moodle
                </a>
              )}

              {course.syllabus && (
                <a href={course.syllabus} target="_blank" rel="noreferrer" className={pillBtn}>
                  <img src={IMG_PDF} className="w-4 h-4" />
                  Syllabus
                </a>
              )}

              {course.externalMaterials?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openExternalMaterial(m)}
                  className={pillBtn}
                  title={m.kind === "file" ? m.originalName || m.storagePath : (m as any).href}
                >
                  {m.icon && <img src={m.icon} className="w-4 h-4" />}
                  <span className="truncate max-w-[260px]">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Drive embed */}
            {showDriveEmbed && driveEmbedUrl && (
              <div className="mt-4">
                <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
                  דרייב מוטמע (אם לא נטען — לרוב זו בעיית הרשאות שיתוף)
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
        {course.whatwas && (
          <section className={sectionCard}>
            <h3 className="text-sm font-semibold mb-2">מה היה בשבוע האחרון?</h3>
            {renderRichOrPlainText(course.whatwas)}
          </section>
        )}

        {course.whatwill && (
          <section className={sectionCard}>
            <h3 className="text-sm font-semibold mb-2">מה יהיה בהמשך?</h3>
            {renderRichOrPlainText(course.whatwill)}
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
                <li key={a.id} className="border-b last:border-b-0 pb-3 dark:border-slate-800">
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

        {/* assignments/exams/labs */}
        <AssessmentList title="מטלות / עבודות" items={assignments} />
        <AssessmentList title="בחנים / מבחנים" items={exams} />
        <AssessmentList title="מעבדות" items={labs} />
      </div>
    </div>
  );
}
