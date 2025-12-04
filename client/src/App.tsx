// client/src/App.tsx
import { useEffect, useState, useMemo } from "react";
import { Routes, Route, useNavigate, Link } from "react-router-dom";

import CourseList from "./components/CourseList";
import { YEARS, type Course, type AssessmentItem } from "./data/years";

import AdminCoursesRoute from "./routes/AdminCoursesRoute";
import EditCourseRoute from "./routes/EditCourseRoute";
import EditHomepageRoute from "./routes/EditHomepageRoute";

import { useTheme } from "./hooks/useTheme";

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

// ---- HomeContent עם overrides + מודעות + מטלות/מבחנים + homepage ----
function HomeContent({ openCourse }: { openCourse: (course: Course) => void }) {
  const [overrides, setOverrides] = useState<Record<string, Partial<Course>>>(
    {}
  );
  const [announcements, setAnnouncements] = useState<AnnouncementPublic[]>([]);
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);

  // טווח להצגת מטלות/מבחנים
  const [range, setRange] = useState<"week" | "month" | "all">("week");

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

        // בעמוד הבית – רק מודעות כלליות (בלי courseId)
        setAnnouncements((data.items || []).filter((a) => !a.courseId));
      } catch (e) {
        console.warn("[HomeContent] failed to load announcements", e);
      }
    })();
  }, []);

  const formatAnnouncementMeta = (a: AnnouncementPublic) => {
    const dateStr = a.updatedAt || a.createdAt;
    const hasAuthor = !!(a.authorName || a.authorEmail);

    if (!dateStr && !hasAuthor) return null;

    const d = dateStr ? new Date(dateStr) : null;

    return (
      <>
        {d && (
          <>
            עודכן ב{" "}
            {d.toLocaleDateString("he-IL", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "},
            בשעה{" "}
            {d.toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        )}

        {hasAuthor && (
          <>
            {" "}
            ע"י{" "}
            {a.authorName ? (
              <>
                {a.authorName}
                {a.authorEmail && (
                  <span className="text-neutral-500">
                    {" "}
                    ({a.authorEmail})
                  </span>
                )}
              </>
            ) : (
              a.authorEmail
            )}
          </>
        )}
      </>
    );
  };

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

  // YEARS אחרי merge עם overrides
  const yearsWithOverrides = useMemo(() => {
    if (!Object.keys(overrides).length) return YEARS;

    return YEARS.map((year) => ({
      ...year,
      semesters: year.semesters.map((sem) => ({
        ...sem,
        courses: sem.courses.map((course) => {
          const override = overrides[course.id];
          return override ? { ...course, ...override } : course;
        }),
      })),
    }));
  }, [overrides]);

  // עוזר לפענח תאריך
  const parseHebrewDate = (value: string): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();

    // 1) פורמט HTML input type="date" → YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // 2) פורמט "ישראלי" חופשי
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

    // 3) ניסיון אחרון – אם הדפדפן יודע לפרש
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback;

    return null;
  };

  // מטלות + מבחנים קרובים מכל הקורסים
  type UpcomingItem = {
    courseId: string;
    courseName: string;
    title: string;
    date: string;
    dateObj: Date;
    type: "assignment" | "exam";
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
      maxDate = null; // הכל
    }

    yearsWithOverrides.forEach((year) => {
      year.semesters.forEach((sem) => {
        sem.courses.forEach((course) => {
          const assignments = (course.assignments || []) as AssessmentItem[];
          const exams = (course.exams || []) as AssessmentItem[];

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
                notes: a.notes,
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
                notes: ex.notes,
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
    bg-gradient-to-l from-blue-50 to-cyan-50
    dark:from-slate-800 dark:to-slate-900
    border-neutral-200 dark:border-slate-700
  "
>
          <h1 className="text-2xl font-bold mb-1">
            {homepage.heroTitle || "ברוכים הבאים לאתר מחזור 2032"}
          </h1>
          <h2 className="text-sm text-neutral-600 mb-3 whitespace-pre-line">
            {homepage.heroSubtitle ||
              "כל המידע, הקישורים והחומרים במקום אחד"}
          </h2>
          {homepage.introText && (
            <p className="text-sm text-neutral-700 whitespace-pre-line">
              {homepage.introText}
            </p>
          )}
        </section>
      )}

      {/* לוח מודעות */}
      {announcements.length > 0 && (
        <section
  className="
    mb-6 border rounded-2xl p-4 shadow-sm
    bg-white dark:bg-slate-900
    border-neutral-200 dark:border-slate-700
  "
>
          <h2 className="text-lg font-semibold mb-2">לוח מודעות</h2>
          <ul className="space-y-2 text-sm">
            {announcements.map((a) => (
              <li key={a.id} className="border-b last:border-b-0 pb-2">
                <div className="font-medium">{a.title}</div>
  <div className="text-xs text-neutral-700 dark:text-slate-300 whitespace-pre-line">
                  {a.body}
                </div>

                {/* מראים מטא־דאטה רק אם באמת יש משהו */}
                {formatAnnouncementMeta(a) && (
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {formatAnnouncementMeta(a)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* טבלת מטלות + מבחנים קרובים */}
      {latestItems.length > 0 && (
       <section
  className="
    mb-8 border rounded-2xl p-4 shadow-sm
    bg-white dark:bg-slate-900
    border-neutral-200 dark:border-slate-700
  "
>

          <div className="flex items-center justify-between mb-2 gap-2">
            <h2 className="text-lg font-semibold">מטלות ומבחנים קרובים</h2>
           <div className="flex gap-1 text-[11px] sm:text-xs">
  {/* שבוע */}
  <button
    onClick={() => setRange("week")}
    className={`px-2 sm:px-3 py-1 rounded-xl border text-[11px] sm:text-xs transition-colors
      ${
        range === "week"
          ? // נבחר
            "bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-500/20 dark:border-blue-300 dark:text-blue-100"
          : // לא נבחר
            "bg-white border-neutral-200 text-neutral-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
      }
    `}
  >
    📅 שבוע
  </button>

  {/* חודש */}
  <button
    onClick={() => setRange("month")}
    className={`px-2 sm:px-3 py-1 rounded-xl border text-[11px] sm:text-xs transition-colors
      ${
        range === "month"
          ? "bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-500/20 dark:border-blue-300 dark:text-blue-100"
          : "bg-white border-neutral-200 text-neutral-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
      }
    `}
  >
    🗓️ חודש
  </button>

  {/* הכול */}
  <button
    onClick={() => setRange("all")}
    className={`px-2 sm:px-3 py-1 rounded-xl border text-[11px] sm:text-xs transition-colors
      ${
        range === "all"
          ? "bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-500/20 dark:border-blue-300 dark:text-blue-100"
          : "bg-white border-neutral-200 text-neutral-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
      }
    `}
  >
    ⏭️ הכול
  </button>
</div>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
<thead className="
  bg-neutral-50 dark:bg-slate-800
  text-[11px]
  text-neutral-500 dark:text-slate-300
">
                <tr>
                  <th className="text-right py-2 px-2">קורס</th>
                  <th className="text-right py-2 px-2">סוג</th>
                  <th className="text-right py-2 px-2">שם</th>
                  <th className="text-right py-2 px-2">תאריך</th>
                  <th className="text-right py-2 px-2 hidden sm:table-cell">
                    הערות
                  </th>
                </tr>
              </thead>
              <tbody>
                {latestItems.map((item, index) => {
                  const isFirst = index === 0;
                  return (
                   <tr
  className={
    "border-t border-neutral-200 dark:border-slate-700" +
    (isFirst ? " bg-yellow-50/60 dark:bg-yellow-900/20" : "")
  }
>
                      <td className="py-2 px-2 align-top">
                        <span className="font-medium flex items-center gap-1">
                          {isFirst && <span>📌</span>}
                          {item.courseName}
                        </span>
                      </td>
                      <td className="py-2 px-2 align-top whitespace-nowrap">
                        {item.type === "assignment" ? "📝 מטלה" : "💯 בחינה"}
                      </td>
                      <td className="py-2 px-2 align-top">{item.title}</td>
                      <td className="py-2 px-2 align-top whitespace-nowrap">
                        {item.dateObj.toLocaleDateString("he-IL")}
                      </td>
                      <td className="py-2 px-2 align-top text-neutral-500 hidden sm:table-cell">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* יומן */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">יומן מחזור 2032</h2>
        <CalendarEmbed
          mode="WEEK"
          calendars={[
            {
              id: "c_9fa7519b0c002d1c818a3da8ecb3181832e44e0d8c0513f10943d86319fb2e34@group.calendar.google.com",
            },
            {
              id: "c_987b0a533e494ec187656f8a2ae4afc19470982cb14bbb821820675d8bd802fc@group.calendar.google.com",
            },
          ]}
        />
      </section>

      {/* רשימת קורסים */}
      <CourseList years={yearsWithOverrides} onOpenCourse={openCourse} />
    </>
  );
}

// ---- App ----
export default function App() {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loadingUser, setLoadingUser] = useState(false);
  const [myCourseVaadIds, setMyCourseVaadIds] = useState<string[]>([]);
  const [views, setViews] = useState<number>(0);

  const nav = useNavigate();
  const openCourse = (course: Course) => nav(`/course/${course.id}`);

  const { theme, toggleTheme } = useTheme();

  // set last updated on footer
  const buildTimeRaw = import.meta.env.VITE_BUILD_TIME as string | undefined;
  const lastUpdatedText = useMemo(() => {
    const src = buildTimeRaw || new Date().toISOString(); // fallback לפיתוח
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

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string, ms = 2200) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    if (!AUTH_ENABLED) return;
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
  }, []);

  // רישום צפייה + קריאת המונה מהשרת
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

  // לבדוק אם המשתמש הוא ועד־קורס ועל אילו קורסים
  useEffect(() => {
    if (!user) {
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
  }, [user?.email]);

  // תפקידי הרשאות
  const isAdmin =
    user?.role === "admin" || user?.email === "morrabaev@mail.tau.ac.il";
  const isGlobalVaad = user?.role === "vaad";
  const isCourseVaad = myCourseVaadIds.length > 0;
  const canSeeAdminPanel = !!user && (isAdmin || isGlobalVaad || isCourseVaad);

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
    // 👈 מזה Tailwind מזהה דארק מוד (darkMode: "class")
    <div className={theme === "dark" ? "dark" : ""}>
      <div
        className="min-h-screen bg-white text-black dark:bg-slate-950 dark:text-slate-100 transition-colors"
        dir="rtl"
      >
        {/* toolbar קבוע */}
        <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-neutral-200 dark:border-slate-800 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* לוגו + טקסט */}
            <Link
              to="/"
              className="flex items-center gap-3 cursor-pointer select-none"
              aria-label="חזרה לעמוד הבית"
            >
              <div className="w-22 h-8 rounded-xl border flex items-center justify-center">
                MedTAU
              </div>
              <div>
                <div className="text-base font-semibold">
                  אתר מחזור 2032 - תל אביב
                </div>
                <div className="text-xs text-neutral-500">
                  אתר עזר לסטודנטים לרפואה שש שנתי
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {/* כפתור Dark Mode */}
              <button
                onClick={toggleTheme}
                className="border rounded-2xl px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              {user && (
                <>
                  <span className="text-xs text-neutral-600 hidden sm:inline">
                    {user.email}
                  </span>

                  {canSeeAdminPanel && (
                    <button
               onClick={() => nav("/admin")}
              className="
              border rounded-2xl px-3 py-2 text-sm
              hover:bg-neutral-50
              dark:hover:bg-slate-800
              flex items-center gap-1 cursor-pointer
               "
              >
              פאנל מנהל
            </button>

                  )}

                 <button
  onClick={handleLogout}
  className="
    border rounded-2xl px-3 py-2 text-sm
    hover:bg-neutral-50
    dark:hover:bg-slate-800
    flex items-center gap-1 cursor-pointer
    title='התנתקות'
  "
>
  <span className="inline">התנתקות</span>
</button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {loadingUser ? (
            <div className="text-sm text-neutral-500">טוען…</div>
          ) : !user ? (
            <div className="border rounded-2xl p-6 text-sm">
              כדי לגשת לתוכן האתר יש להתחבר עם חשבון Google. במסך ההתחברות
              בחר/י חשבון עם הדומיין
              <b> mail.tau.ac.il</b>.
              <div className="mt-3">
                <button
                  onClick={handleSignIn}
                  className="border rounded-xl px-3 py-2 hover:bg-neutral-50 cursor-pointer"
                >
                  התחברות עם Google
                </button>
              </div>
            </div>
          ) : !isTauEmail(user.email) ? (
            <div className="border rounded-2xl p-6 text-sm text-red-600">
              הדומיין של המייל ({getDomain(user.email)}) אינו מורשה. יש לבחור
              חשבון TAU.
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomeContent openCourse={openCourse} />} />
              <Route path="/course/:id" element={<CourseRoute />} />

              {/* admin routes */}
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
                    <HomeContent openCourse={openCourse} />
                  )
                }
              />

              <Route
                path="/admin/home"
                element={
                  isAdmin || isGlobalVaad ? (
                    <EditHomepageRoute />
                  ) : (
                    <HomeContent openCourse={openCourse} />
                  )
                }
              />

              <Route
                path="/admin/courses"
                element={
                  isAdmin || isGlobalVaad ? (
                    <AdminCoursesRoute />
                  ) : (
                    <HomeContent openCourse={openCourse} />
                  )
                }
              />

              <Route
                path="/admin/course/:id/edit"
                element={
                  canSeeAdminPanel ? (
                    <EditCourseRoute />
                  ) : (
                    <HomeContent openCourse={openCourse} />
                  )
                }
              />

              {/* fallback */}
              <Route path="*" element={<HomeContent openCourse={openCourse} />} />
            </Routes>
          )}
        </main>

<footer className="
  max-w-6xl mx-auto px-4 py-8 text-xs
  text-neutral-500 dark:text-slate-300
">
          <div className="flex flex-col gap-2">
            {/* שורה עליונה – טקסט */}
            <span>
              נבנה ע״י מור עמיאל רבייב · morrabaev@tauex.tau.ac.il · עודכן
              לאחרונה {lastUpdatedText || "—"}
            </span>

            {/* שורה שניה – מספר מבקרים */}
            <span className="flex items-center gap-1 text-neutral-400">
              מספר מבקרים: {views.toLocaleString("he-IL")} צפיות
            </span>

            {/* שורה שלישית – אייקונים */}
            <div className="flex items-center gap-4 mt-2">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/mork0/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-70 hover:opacity-100 transition"
              >
                <img src={IMG_FACEBOOK} alt="Facebook" className="w-5 h-5" />
              </a>

              {/* GitHub */}
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

              {/* WhatsApp – לינק להודעה אישית */}
              <a
                href="https://wa.me/972556655348?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%A8%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A2%D7%96%D7%A8%D7%94%20%D7%9C%D7%92%D7%91%D7%99%20%D7%90%D7%AA%D7%A8%20%D7%94%D7%9E%D7%97%D7%96%D7%95%D7%A8%20%D7%A9%D7%9C%D7%A0%D7%95%20%28%D7%AA%D7%B4%D7%90%202032%29%21%20%F0%9F%99%8F"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-70 hover:opacity-100 transition"
              >
                <img src={IMG_WHATSAPP} alt="WhatsApp" className="w-5 h-5" />
              </a>

              
            </div>

                        {/* שורה רביעית – ביימיקופי */}

            <div className="flex items-center gap-4 mt-2">

              {/* Buy Me a Coffee */}

              <a href="https://www.buymeacoffee.com/moramiel8">
              <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&
                emoji=&slug=moramiel8&button_colour=FFDD00&font_colour=000000&font_family=Cookie&
                outline_colour=000000&coffee_colour=ffffff" /></a>
              </div>
          </div>
        </footer>

        <Toast />
      </div>
    </div>
  );
}
