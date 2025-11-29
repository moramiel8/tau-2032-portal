// client/src/App.tsx
import { useEffect, useState, useMemo } from "react";
import { Routes, Route, useNavigate, Link } from "react-router-dom";

import CourseList from "./components/CourseList";
import { YEARS, type Course, type AssessmentItem } from "./data/years";

import AdminCoursesRoute from "./routes/AdminCoursesRoute";
import EditCourseRoute from "./routes/EditCourseRoute";
import EditHomepageRoute from "./routes/EditHomepageRoute";

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

const AUTH_ENABLED = true;

// ---- types ללוח מודעות בעמוד הבית ----
type AnnouncementPublic = {
  id: string;
  title: string;
  body: string;
  courseId?: string | null;
  createdAt?: string;
};

// ---- תוכן עמוד הבית (ממסך עריכת homepage) ----
type HomepageContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  introText?: string;
};

// ---- HomeContent עם overrides + מודעות + מטלות + homepage ----
function HomeContent({ openCourse }: { openCourse: (course: Course) => void }) {
  const [overrides, setOverrides] = useState<Record<string, Partial<Course>>>(
    {}
  );
  const [announcements, setAnnouncements] = useState<AnnouncementPublic[]>([]);
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);

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
        setAnnouncements(data.items || []);
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

  // מטלות קרובות מכל הקורסים
  // בתוך HomeContent ב־App.tsx
const latestAssignments = useMemo(() => {
  const items: {
    courseId: string;
    courseName: string;
    title: string;
    date: string;
    notes?: string;
  }[] = [];

  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(now.getDate() + 7);

  yearsWithOverrides.forEach((year) => {
    year.semesters.forEach((sem) => {
      sem.courses.forEach((course) => {
        const assignments = (course.assignments || []) as AssessmentItem[];
        assignments.forEach((a) => {
          if (!a.date) return;
          const d = new Date(a.date);
          if (isNaN(d.getTime())) return;

          // רק אם התאריך בין היום לשבוע קדימה
          if (d >= now && d <= weekFromNow) {
            items.push({
              courseId: course.id,
              courseName: course.name,
              title: a.title || "",
              date: a.date,
              notes: a.notes,
            });
          }
        });
      });
    });
  });

  items.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });

  return items.slice(0, 8);
}, [yearsWithOverrides]);


  return (
    <>
      {/* HERO מתוך עמוד הבית */}
      {homepage && (
        <section className="mb-6 border rounded-2xl p-5 bg-gradient-to-l from-blue-50 to-cyan-50 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">
            {homepage.heroTitle || "ברוכים הבאים לאתר מחזור 2032"}
          </h1>
          <h2 className="text-sm text-neutral-600 mb-3">
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
        <section className="mb-6 border rounded-2xl p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">לוח מודעות</h2>
          <ul className="space-y-2 text-sm">
            {announcements.map((a) => (
              <li key={a.id} className="border-b last:border-b-0 pb-2">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-neutral-700 whitespace-pre-line">
                  {a.body}
                </div>
                {a.createdAt && (
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {new Date(a.createdAt).toLocaleString("he-IL")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* טבלת מטלות קרובות */}
      {latestAssignments.length > 0 && (
        <section className="mb-8 border rounded-2xl p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-3">מטלות קרובות</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-neutral-50 text-[11px] text-neutral-500">
                <tr>
                  <th className="text-right py-2 px-2">קורס</th>
                  <th className="text-right py-2 px-2">מטלה</th>
                  <th className="text-right py-2 px-2">תאריך</th>
                  <th className="text-right py-2 px-2 hidden sm:table-cell">
                    הערות
                  </th>
                </tr>
              </thead>
              <tbody>
                {latestAssignments.map((a) => (
                  <tr
                    key={`${a.courseId}-${a.title}-${a.date}`}
                    className="border-t"
                  >
                    <td className="py-2 px-2 align-top">
                      <span className="font-medium">{a.courseName}</span>
                    </td>
                    <td className="py-2 px-2 align-top">{a.title}</td>
                    <td className="py-2 px-2 align-top whitespace-nowrap">
                      {new Date(a.date).toLocaleDateString("he-IL")}
                    </td>
                    <td className="py-2 px-2 align-top text-neutral-500 hidden sm:table-cell">
                      {a.notes || "—"}
                    </td>
                  </tr>
                ))}
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

export default function App() {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loadingUser, setLoadingUser] = useState(false);
  const [myCourseVaadIds, setMyCourseVaadIds] = useState<string[]>([]);

  const nav = useNavigate();
  const openCourse = (course: Course) => nav(`/course/${course.id}`);

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

  const DebugBar = () => (
    <div className="fixed bottom-2 right-2 z-50 text-xs bg-black text-white/90 px-3 py-2 rounded-lg opacity-80">
      <div>user? {user ? user.email : "null"}</div>
      <div>loadingUser? {String(loadingUser)}</div>
    </div>
  );

  const Toast = () =>
    toast ? (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-xl shadow-lg">
        {toast}
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      {/* toolbar קבוע */}
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b z-40">
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
                אתר עזר לסטודנטים לרפואה שש שנתית
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <span className="text-xs text-neutral-600 hidden sm:inline">
                  {user.email}
                </span>

                {canSeeAdminPanel && (
                  <button
                    onClick={() => nav("/admin")}
                    className="border rounded-2xl px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                  >
                    פאנל מנהל
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="border rounded-2xl px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                  title="התנתקות"
                  aria-label="התנתקות"
                >
                  <span className="hidden sm:inline">התנתקות</span>
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
            <Route
              path="/"
              element={<HomeContent openCourse={openCourse} />}
            />
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
            <Route
              path="*"
              element={<HomeContent openCourse={openCourse} />}
            />
          </Routes>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-neutral-500">
        נבנה ע&quot;י מור עמיאל רבייב · morrabaev@tauex.tau.ac.il · עודכן לאחרונה
        28/11/2025 14:01
      </footer>

      <Toast />
      <DebugBar />
    </div>
  );
}
