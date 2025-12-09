// client/src/App.tsx
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { Routes, Route, useNavigate, Link } from "react-router-dom";

import CourseList from "./components/CourseList";
import type { Course, AssessmentItem, Year as StaticYear } from "./data/years";
import { YearsProvider } from "./context/YearsContext";

import AdminCoursesRoute from "./routes/AdminCoursesRoute";
import EditCourseRoute from "./routes/EditCourseRoute";
import EditHomepageRoute from "./routes/EditHomepageRoute";

import MedTauLogo from "./components/MedTauLogo";

import NewCourseForm from "./components/NewCourseForm";
import { useYears } from "./hooks/useYears";

import { useTheme } from "./hooks/useTheme";
import { stripHtml } from "./utils/stripHtml";

import {
  fetchSession,
  isTauEmail,
  startGoogleLogin,
  getDomain,
  logout,
} from "./utils/auth";
import type { User } from "./utils/auth";

import CalendarEmbed from "./components/CalendarEmbed";
import { getCachedUser } from "./utils/sessionCache";
import CourseRoute from "./routes/CourseRoute";
import AdminPanel from "./routes/AdminPanel";

import {
  IMG_BUYME,
  IMG_WHATSAPP,
  IMG_FACEBOOK,
  IMG_GITHUB,
} from "./constants/icons";

const AUTH_ENABLED = true;

// ---- types ללוח מודעות בעמוד הבית ----
type AnnouncementPublic = {
  id: string;
  title: string;
  body: string;
  courseId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  authorEmail?: string | null;
  authorName?: string | null;
};

// ---- תוכן עמוד הבית (ממסך עריכת homepage) ----
type HomepageContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  introText?: string;
};

type HomeContentProps = {
  openCourse: (course: Course) => void;
  canCreateCourse: boolean;
};

// ---- HomeContent עם overrides + מודעות + מטלות/מבחנים + homepage ----
function HomeContent({ openCourse, canCreateCourse }: HomeContentProps) {
  const [overrides, setOverrides] = useState<Record<string, Partial<Course>>>(
    {}
  );
  const [announcements, setAnnouncements] = useState<AnnouncementPublic[]>([]);
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);

  // טווח להצגת מטלות/מבחנים
  const [range, setRange] = useState<"week" | "month" | "all">("week");

  // טעינת מבנה השנים/סמסטרים/קורסים מהשרת
  const { years, allCourses, loading, error, reload } = useYears();

  // קורסים נוספים מה־DB (API ישן – אפשר להסיר בהמשך)
  type ExtraCourse = {
    id: string;
    name: string;
    shortName?: string | null;
    yearLabel: string;
    semesterLabel: string;
    courseCode?: string | null;
  };

  const [extraCourses, setExtraCourses] = useState<ExtraCourse[]>([]);
  const [extraCoursesReloadKey, setExtraCoursesReloadKey] = useState(0);

  // ---- הופך URL-ים בטקסט ללינקים לחיצים ----
  const renderAnnouncementBodyWithLinks = (text: string): ReactNode => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
      const start = match.index;
      const url = match[0];

      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      const href = url.startsWith("http") ? url : `https://${url}`;

      parts.push(
        <a
          key={href + start}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {url}
        </a>
      );

      lastIndex = start + url.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // ---- בוחר בין HTML מה־WYSIWYG לבין טקסט רגיל עם לינקים ----
  const renderAnnouncementBody = (body: string): ReactNode => {
    if (!body) return null;

    const looksLikeHtml =
      body.includes("<p") ||
      body.includes("<br") ||
      body.includes("<div") ||
      body.includes("<span") ||
      body.includes("<strong") ||
      body.includes("<em") ||
      body.includes("<a ");

    if (looksLikeHtml) {
      return (
        <div
          className="announcement-body"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      );
    }

    return (
      <div className="announcement-body">
        {renderAnnouncementBodyWithLinks(body)}
      </div>
    );
  };

  // טעינת overrides לקורסים מה-DB
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
        console.warn("[HomeContent] failed to load course overrides", e);
      }
    })();
  }, []);

  // טעינת מודעות כלליות
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data = (await res.json()) as { items: AnnouncementPublic[] };

        setAnnouncements((data.items || []).filter((a) => !a.courseId));
      } catch (e) {
        console.warn("[HomeContent] failed to load announcements", e);
      }
    })();
  }, []);

  // טעינת תוכן עמוד הבית (ציבורי)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/homepage");
        if (!res.ok) return;
        const data = (await res.json()) as {
          exists: boolean;
          content: HomepageContent;
        };
        setHomepage(data.content || null);
      } catch (e) {
        console.warn("[HomeContent] failed to load homepage content", e);
      }
    })();
  }, []);

  // טעינת קורסים דינמיים מהשרת (API ישן לקורסים נוספים)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/courses");
        if (!res.ok) return;

        const json = await res.json();
        const items: ExtraCourse[] = Array.isArray(json)
          ? json
          : json.items || [];

        setExtraCourses(items);
      } catch (e) {
        console.warn("[HomeContent] failed to load extra courses", e);
      }
    })();
  }, [extraCoursesReloadKey]);

  // YEARS אחרי merge עם overrides
  const yearsWithOverrides = useMemo(() => {
    const baseYears = years;

    if (!Object.keys(overrides).length) return baseYears;

    return baseYears.map((year) => ({
      ...year,
      semesters: year.semesters.map((sem) => ({
        ...sem,
        courses: sem.courses.map((course) => {
          const override = overrides[course.id];
          return override ? { ...course, ...override } : course;
        }),
      })),
    }));
  }, [years, overrides]);

  const inferYearKind = (title: string): StaticYear["kind"] => {
    if (
      title.includes("שנה ד'") ||
      title.includes("שנה ה'") ||
      title.includes("שנה ו'")
    ) {
      return "clinical";
    }
    return "preclinical";
  };

  // מיזוג קורסים דינמיים
  const yearsMerged = useMemo<StaticYear[]>(() => {
    const base: StaticYear[] = yearsWithOverrides.map((year) => ({
      id: year.id,
      title: year.title,
      kind: inferYearKind(year.title),
      semesters: year.semesters.map((sem) => ({
        id: sem.id,
        title: sem.title,
        courses: sem.courses as unknown as Course[],
      })),
    }));

    extraCourses.forEach((c) => {
      let year = base.find((y) => y.title === c.yearLabel);
      if (!year) {
        year = {
          id: `extra-year-${c.yearLabel}`,
          title: c.yearLabel,
          kind: inferYearKind(c.yearLabel),
          semesters: [],
        };
        base.push(year);
      }

      let sem = year.semesters.find((s) => s.title === c.semesterLabel);
      if (!sem) {
        sem = {
          id: `extra-sem-${c.yearLabel}-${c.semesterLabel}`,
          title: c.semesterLabel,
          courses: [],
        };
        year.semesters.push(sem);
      }

      if (!sem.courses.some((course) => course.id === c.id)) {
        const newCourse: Course = {
          id: c.id,
          name: c.name,
          shortName: c.shortName || undefined,
          assignments: [],
          exams: [],
          labs: [],
        };
        sem.courses.push(newCourse);
      }
    });

    return base;
  }, [yearsWithOverrides, extraCourses]);

  // עוזר לפענח תאריך
  const parseHebrewDate = (value: string): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();

    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }

    const m = trimmed.replace(/\s+/g, "").match(
      /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/
    );
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }

    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback;

    return null;
  };

  // מטלות + מבחנים קרובים (על בסיס yearsWithOverrides בלבד כרגע)
  type UpcomingItem = {
    courseId: string;
    courseName: string;
    title: string;
    date: string;
    dateObj: Date;
    type: "assignment" | "exam" | "lab";
    notes?: string;
  };

  const latestItems = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let maxDate: Date | null = null;
    if (range === "week") {
      maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 7);
      maxDate.setHours(23, 59, 59, 999);
    } else if (range === "month") {
      maxDate = new Date(today);
      maxDate.setMonth(maxDate.getMonth() + 1);
      maxDate.setHours(23, 59, 59, 999);
    } else {
      maxDate = null;
    }

    yearsWithOverrides.forEach((year) => {
      year.semesters.forEach((sem) => {
        sem.courses.forEach((courseRaw) => {
          const course = courseRaw as Course;

          const assignments = (course.assignments || []) as AssessmentItem[];
          const exams = (course.exams || []) as AssessmentItem[];
          const labs = (course.labs || []) as AssessmentItem[];

          assignments.forEach((a) => {
            if (!a.date) return;
            const d = parseHebrewDate(a.date);
            if (!d) return;
            if (d >= today && (!maxDate || d <= maxDate)) {
              items.push({
                courseId: course.id,
                courseName: course.name,
                title: a.title || "",
                date: a.date,
                dateObj: d,
                type: "assignment",
                notes: a.notes ? stripHtml(a.notes) : "",
              });
            }
          });

          exams.forEach((ex) => {
            if (!ex.date) return;
            const d = parseHebrewDate(ex.date);
            if (!d) return;
            if (d >= today && (!maxDate || d <= maxDate)) {
              items.push({
                courseId: course.id,
                courseName: course.name,
                title: ex.title || "",
                date: ex.date,
                dateObj: d,
                type: "exam",
                notes: ex.notes ? stripHtml(ex.notes) : "",
              });
            }
          });

          labs.forEach((lab) => {
            if (!lab.date) return;
            const d = parseHebrewDate(lab.date);
            if (!d) return;
            if (d >= today && (!maxDate || d <= maxDate)) {
              items.push({
                courseId: course.id,
                courseName: course.name,
                title: lab.title || "",
                date: lab.date,
                dateObj: d,
                type: "lab",
                notes: lab.notes ? stripHtml(lab.notes) : "",
              });
            }
          });
        });
      });
    });

    items.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return items.slice(0, 25);
  }, [yearsWithOverrides, range]);

  return (
    <>
      {/* HERO מתוך עמוד הבית */}
      {homepage && (
        <section
          className="
            mb-6 border rounded-2xl p-5 shadow-sm
            bg-gradient-to-l from-blue-100 to-blue-300
            dark:from-slate-800 
            dark:to-slate-900
            border-neutral-200 
            dark:border-slate-700 
          "
        >
          <h1 className="text-2xl font-bold mb-1">
            {homepage.heroTitle || "ברוכים הבאים לאתר מחזור 2032"}
          </h1>
          <h2 className="text-sm text-neutral-400 mb-3 whitespace-pre-line">
            {homepage.heroSubtitle ||
              "כל המידע, הקישורים והחומרים במקום אחד"}
          </h2>
          {homepage.introText && (
            <p className="text-sm text-neutral-400 whitespace-pre-line">
              {homepage.introText}
            </p>
          )}
        </section>
      )}

      {/* לוח מודעות */}
      {announcements.length > 0 && (
        <section
          className="
            mb-8 border rounded-2xl p-4 shadow-sm
            bg-white dark:bg-slate-900
            border-neutral-200 dark:border-slate-700
          "
        >
          <h2 className="text-lg font-semibold mb-2">לוח מודעות</h2>
          <ul className="space-y-2 text-sm">
            {announcements.map((a) => (
              <li key={a.id} className="border-b last:border-b-0 pb-2">
                <div className="font-medium">{a.title}</div>

                <div className="text-xs text-neutral-700 dark:text-slate-300">
                  {renderAnnouncementBody(a.body || "")}
                </div>

                {(a.authorName || a.authorEmail || a.updatedAt) && (
                  <div className="mt-1 text-[11px] text-neutral-400">
                    נערך על ידי{" "}
                    {a.authorName || a.authorEmail || "מערכת האתר"}
                    {a.updatedAt &&
                      (() => {
                        const d = new Date(a.updatedAt);

                        const dayName = d.toLocaleDateString("he-IL", {
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

                        return (
                          <>
                            {" ב"}
                            {dayName}
                            {" , "}
                            {dateStr}
                            {" בשעה "}
                            {timeStr}
                          </>
                        );
                      })()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* טבלת מטלות + מבחנים קרובים */}
      <section
        className="
          mb-8 border rounded-2xl p-4 shadow-sm
          bg-white dark:bg-slate-900
          border-neutral-200 dark:border-slate-700
        "
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">מטלות ומועדי מבחנים קרובים</h2>

          <div className="flex gap-2 text-xs">
            <button
              className={
                "px-3 py-1 rounded-2xl border text-xs transition-colors cursor-pointer " +
                (range === "week"
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100 " +
                    "dark:bg-transparent dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-800")
              }
              onClick={() => setRange("week")}
            >
              שבוע
            </button>

            <button
              className={
                "px-3 py-1 rounded-2xl border text-xs transition-colors cursor-pointer " +
                (range === "month"
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100 " +
                    "dark:bg-transparent dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-800")
              }
              onClick={() => setRange("month")}
            >
              חודש
            </button>

            <button
              className={
                "px-3 py-1 rounded-2xl border text-xs transition-colors cursor-pointer " +
                (range === "all"
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100 " +
                    "dark:bg-transparent dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-800")
              }
              onClick={() => setRange("all")}
            >
              הכל
            </button>
          </div>
        </div>

        {latestItems.length === 0 ? (
          <div className="text-xs text-neutral-500">
            אין מטלות או מבחנים בטווח שנבחר.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-slate-700">
                  <th className="text-right py-2">תאריך</th>
                  <th className="text-right py-2">קורס</th>
                  <th className="text-right py-2">סוג</th>
                  <th className="text-right py-2">כותרת</th>
                  <th className="text-right py-2">הערות</th>
                </tr>
              </thead>
              <tbody>
                {latestItems.map((item) => (
                  <tr
                    key={`${item.type}-${item.courseId}-${item.title}-${item.date}`}
                    className="border-b last:border-b-0 border-neutral-100 dark:border-slate-800"
                  >
                    <td className="py-1 px-2 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-1 px-2 whitespace-nowrap">
                      <Link
                        to={`/course/${item.courseId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {item.courseName}
                      </Link>
                    </td>
                    <td className="py-1 px-2 whitespace-nowrap">
                      {item.type === "assignment"
                        ? "📝 מטלה"
                        : item.type === "exam"
                        ? "💯 מבחן"
                        : "🔬 מעבדה"}
                    </td>
                    <td className="py-1 px-2">{item.title}</td>
                    <td className="py-1 text-neutral-500">
                      {item.notes || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* יומן */}
      <section
        className="
          mb-8 border rounded-2xl p-3 shadow-sm
          bg-white dark:bg-slate-900
          border-neutral-200 dark:border-slate-700
        "
      >
        <h2 className="text-lg font-semibold mb-3">יומן מחזור 2032</h2>
        <CalendarEmbed
          mode="WEEK"
          calendars={[
            {
              id: "c_9fa7519b0c002d1c818a3da8ecb3181832e44e0d8c0513f10943d86319fb2e34@group.calendar.google.com",
              color: "#4285F4",
            },
            {
              id: "c_987b0a533e494ec187656f8a2ae4afc19470982cb14bbb821820675d8bd802fc@group.calendar.google.com",
              color: "#DB4437",
            },
          ]}
        />
      </section>

      {/* ⭐ הוספת קורס חדש */}
      {canCreateCourse && (
        <section
          className="
            mb-8 border rounded-2xl p-3 shadow-sm
            bg-white dark:bg-slate-900
            border-neutral-200 dark:border-slate-700
          "
        >
          <details>
            <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
              <span>➕ הוספת קורס חדש</span>
              <span className="text-xs text-neutral-500">(לחצו לפתיחה)</span>
            </summary>

            <div className="mt-4">
              <p className="text-xs text-neutral-500 mb-3">
                יצירת קורס חדש במערכת, כולל שיוך לשנה ולסמסטר.
              </p>

              <NewCourseForm
                onCreated={async () => {
                  setExtraCoursesReloadKey((x) => x + 1);
                  await reload();
                }}
              />
            </div>
          </details>
        </section>
      )}

      <CourseList years={yearsMerged} onOpenCourse={openCourse} />
    </>
  );
}

// ---- App ----
export default function App() {
  // guest-mode רק ביציאה הראשונית ל־/moramiel8
  const startedAsGuest = window.location.pathname.startsWith("/moramiel8");

  const [user, setUser] = useState<User | null>(() => {
    if (startedAsGuest) {
      return {
        email: "guest@tau.ac.il",
        role: "guest" as any, // דאגת שכבר הוספת "guest" ל-Role
        name: "Guest User",
      };
    }
    return getCachedUser();
  });

  const [loadingUser, setLoadingUser] = useState(false);
  const [myCourseVaadIds, setMyCourseVaadIds] = useState<string[]>([]);
  const [views, setViews] = useState<number>(0);

  const nav = useNavigate();
  const openCourse = (course: Course) => nav(`/course/${course.id}`);

  const { theme, toggleTheme } = useTheme();

  const buildTimeRaw = import.meta.env.VITE_BUILD_TIME as string | undefined;
  const lastUpdatedText = useMemo(() => {
    const src = buildTimeRaw || new Date().toISOString();
    const d = new Date(src);
    if (isNaN(d.getTime())) return null;

    const dateStr = d.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const timeStr = d.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dateStr} ${timeStr}`;
  }, [buildTimeRaw]);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string, ms = 2200) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const isGuest = user?.role === "guest";

  // לא נושא session ב-guest
  useEffect(() => {
    if (isGuest || !AUTH_ENABLED) return;

    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchSession();
        if (!cancelled) setUser(fresh);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  // מונה צפיות
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats/view", { method: "POST" });
        if (!res.ok) return;
        const data = (await res.json()) as { views?: number };
        if (typeof data.views === "number") {
          setViews(data.views);
        }
      } catch (e) {
        console.warn("Failed to record view", e);
      }
    })();
  }, []);

  // וועד קורס – לא רלוונטי ל-guest
  useEffect(() => {
    if (!user || isGuest) {
      setMyCourseVaadIds([]);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/my/course-vaad");
        if (!res.ok) return;
        const data = (await res.json()) as { courseIds: string[] };
        setMyCourseVaadIds(data.courseIds || []);
      } catch (e) {
        console.warn("[App] failed to load my course-vaad ids", e);
      }
    })();
  }, [user?.email, isGuest]);

  const isAdmin =
    user?.role === "admin" || user?.email === "morrabaev@mail.tau.ac.il";
  const isGlobalVaad = user?.role === "vaad";
  const isCourseVaad = myCourseVaadIds.length > 0;

  const canSeeAdminPanel =
    !isGuest && !!user && (isAdmin || isGlobalVaad || isCourseVaad);

  const handleSignIn = () => startGoogleLogin();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      showToast("התנתקת בהצלחה!");
    } catch (e) {
      showToast("בעיה בהתנתקות, נסה שוב");
      console.warn("[App] logout error", e);
    }
  };

  const Toast = () =>
    toast ? (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-xl shadow-lg">
        {toast}
      </div>
    ) : null;

  return (
    <div
      className="
        min-h-screen 
        bg-black/15
        text-black 
        dark:bg-black/70
        dark:text-slate-100 
      "
      dir="rtl"
    >
      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-neutral-200 dark:border-slate-800 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <div>
              <MedTauLogo size={200} />
            </div>
            <div>
              <div className="text-base font-semibold">
                אתר מחזור 2032 - תל אביב
              </div>
              <div className="text-xs text-neutral-500 dark:text-slate-400">
                אתר עזר לסטודנטים לרפואה שש שנתי
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-2xl px-3 py-2 text-sm border cursor-pointer"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {user && !isGuest && (
              <>
                <span className="text-xs text-neutral-400 hidden sm:inline">
                  {user.email}
                </span>

                {canSeeAdminPanel && (
                  <button
                    onClick={() => nav("/admin")}
                    className="rounded-2xl px-3 py-2 text-sm bg-red-600 text-white cursor-pointer"
                  >
                    פאנל ניהול
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="rounded-2xl px-3 py-2 text-sm bg-blue-600 text-white cursor-pointer"
                >
                  התנתקות
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <YearsProvider>
          {loadingUser ? (
            <div className="text-sm text-neutral-500">טוען…</div>
          ) : isGuest ? (
            // 🌟 מצב אורח – אין בדיקת דומיין, אין אדמין
            <Routes>
              <Route
                path="/"
                element={
                  <HomeContent openCourse={openCourse} canCreateCourse={false} />
                }
              />
              <Route path="/course/:id" element={<CourseRoute />} />
              <Route
                path="*"
                element={
                  <HomeContent openCourse={openCourse} canCreateCourse={false} />
                }
              />
            </Routes>
          ) : !user ? (
            <div className="border rounded-2xl p-4 shadow-sm bg-white dark:bg-slate-900">
              כדי לגשת לתוכן האתר יש להתחבר עם חשבון Google (mail.tau.ac.il).
              <div className="mt-3">
                <button
                  onClick={handleSignIn}
                  className="rounded-2xl px-3 py-2 text-sm bg-blue-600 text-white cursor-pointer"
                >
                  התחברות עם Google
                </button>
              </div>
            </div>
          ) : !isTauEmail(user.email) ? (

            <div className="border rounded-2xl p-6 text-sm text-red-600 bg-white dark:bg-slate-900">
              הדומיין של המייל ({getDomain(user.email)}) אינו מורשה. יש לבחור
              חשבון TAU.
            </div>
          ) : (
            // מצב רגיל
            <Routes>
              <Route
                path="/"
                element={
                  <HomeContent
                    openCourse={openCourse}
                    canCreateCourse={isAdmin || isGlobalVaad}
                  />
                }
              />

              <Route path="/course/:id" element={<CourseRoute />} />

              <Route
                path="/admin"
                element={
                  canSeeAdminPanel ? (
                    <AdminPanel
                      user={user}
                      isAdmin={isAdmin}
                      isGlobalVaad={isGlobalVaad}
                      isCourseVaad={isCourseVaad}
                      myCourseVaadIds={myCourseVaadIds}
                    />
                  ) : (
                    <HomeContent
                      openCourse={openCourse}
                      canCreateCourse={isAdmin || isGlobalVaad}
                    />
                  )
                }
              />

              <Route
                path="/admin/home"
                element={
                  isAdmin || isGlobalVaad ? (
                    <EditHomepageRoute />
                  ) : (
                    <HomeContent
                      openCourse={openCourse}
                      canCreateCourse={isAdmin || isGlobalVaad}
                    />
                  )
                }
              />

              <Route
                path="/admin/courses"
                element={
                  isAdmin || isGlobalVaad ? (
                    <AdminCoursesRoute />
                  ) : (
                    <HomeContent
                      openCourse={openCourse}
                      canCreateCourse={isAdmin || isGlobalVaad}
                    />
                  )
                }
              />

              <Route
                path="/admin/course/:id/edit"
                element={
                  canSeeAdminPanel ? (
                    <EditCourseRoute />
                  ) : (
                    <HomeContent
                      openCourse={openCourse}
                      canCreateCourse={isAdmin || isGlobalVaad}
                    />
                  )
                }
              />

              <Route
                path="*"
                element={
                  <HomeContent
                    openCourse={openCourse}
                    canCreateCourse={isAdmin || isGlobalVaad}
                  />
                }
              />
            </Routes>
          )}
        </YearsProvider>
      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-neutral-800 dark:text-slate-300">
        <div className="flex flex-col gap-2">
          <span>
            נבנה ע״י מור עמיאל רבייב · עודכן לאחרונה{" "}
            {lastUpdatedText || "—"}
          </span>

          <span className="flex items-center gap-1 text-neutral-600">
            מספר מבקרים: {views.toLocaleString("he-IL")} צפיות
          </span>

          <div className="flex items-center gap-4 mt-2">
            <a
              href="https://www.facebook.com/mork0/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition"
            >
              <img src={IMG_FACEBOOK} alt="Facebook" className="w-5 h-5" />
            </a>

            <a
              href="https://github.com/moramiel8"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition"
            >
              <img
                src={IMG_GITHUB}
                alt="GitHub"
                className="w-5 h-5 opacity-70 hover:opacity-100 transition dark:invert"
              />
            </a>

            <a
              href="https://www.buymeacoffee.com/moramiel8"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition"
            >
              <img
                src={IMG_BUYME}
                alt="BuyMe"
                className="w-5 h-5 opacity-70 hover:opacity-100 transition dark:invert"
              />
            </a>

            <a
              href="https://wa.me/972556655348?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%A8..."
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition"
            >
              <img src={IMG_WHATSAPP} alt="WhatsApp" className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>

      <Toast />
    </div>
  );
}
