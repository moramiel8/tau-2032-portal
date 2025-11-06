// client/src/App.tsx
import { useEffect, useState } from "react";
import CourseList from "./components/CourseList";
import CoursePage from "./components/CoursePage";
import { YEARS } from "./data/years";
import type { Course } from "./data/years";
import { useNavigate } from "react-router-dom";

import {
  fetchSession,
  isTauEmail,
  startGoogleLogin,
  getDomain,
  logout, // ← כבר אצלך
} from "./utils/auth";
import type { User } from "./utils/auth";
import CalendarEmbed from "./components/CalendarEmbed";
import { getCachedUser } from "./utils/sessionCache";

const AUTH_ENABLED = true;

export default function App() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  const nav = useNavigate();
  const openCourse = (course: Course) => nav(`/client/course/${course.id}`);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string, ms = 2200) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    // רענון ברקע – לא “נועל” את ה-UI
    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchSession();
        if (!cancelled) setUser(fresh);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSignIn = () => startGoogleLogin();

  // התנתקות + הודעת הצלחה
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      showToast("התנתקת בהצלחה!");
    } catch (e) {
      showToast("בעיה בהתנתקות, נסה שוב");
      console.warn("[App] logout error", e);
    } finally {
      // רענון רך אם תרצה לוודא ניקוי cookie:
      // window.location.reload();
    }
  };

  // Debug overlay (אופציונלי)
  const DebugBar = () => (
    <div className="fixed bottom-2 right-2 z-50 text-xs bg-black text-white/90 px-3 py-2 rounded-lg opacity-80">
      <div>VITE_API_URL: {import.meta.env.VITE_API_URL as string}</div>
      <div>user? {user ? user.email : "null"}</div>
      <div>loadingUser? {String(loadingUser)}</div>
    </div>
  );

  // Toast component
  const Toast = () =>
    toast ? (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-xl shadow-lg">
        {toast}
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
     
     <header className="sticky top-0 bg-white/80 backdrop-blur border-b z-40">
  <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-22 h-8 rounded-xl border flex items-center justify-center">MedTAU</div>
      <div>
        <div className="text-base font-semibold">אתר מחזור 2032 - תל אביב</div>
        <div className="text-xs text-neutral-500">אתר עזר לסטודנטים לרפואה שש שנתי</div>
      </div>
    </div>

    {/* ימין: אם מחובר — הצג מייל + התנתקות; אם לא — אל תציג שום דבר פה */}
    <div className="flex items-center gap-2">
      {user && (
        <>
          <span className="text-xs text-neutral-600 hidden sm:inline">{user.email}</span>
          <button
            onClick={handleLogout}
            className="border rounded-2xl px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
            title="התנתקות"
            aria-label="התנתקות"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
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
      כדי לגשת לתוכן האתר יש להתחבר עם חשבון Google. במסך ההתחברות בחר/י חשבון עם הדומיין
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
      הדומיין של המייל ({getDomain(user.email)}) אינו מורשה. יש לבחור חשבון TAU.
    </div>
  ) : (
    <>
      {/* 2) הקלנדר יוצג רק בעמוד הראשי (כשלא נפתחה כרטיסיית קורס) */}
      {!selectedCourse && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">יומן מחזור 2032</h2>
          <CalendarEmbed
            mode="WEEK"
            calendars={[
              { id: "c_9fa7519b0c002d1c818a3da8ecb3181832e44e0d8c0513f10943d86319fb2e34@group.calendar.google.com" },
              { id: "c_987b0a533e494ec187656f8a2ae4afc19470982cb14bbb821820675d8bd802fc@group.calendar.google.com" },
            ]}
          />
        </section>
      )}

      {!selectedCourse ? (
        <CourseList years={YEARS} onOpenCourse={setSelectedCourse} />
      ) : (
        <CoursePage course={selectedCourse} onBack={() => setSelectedCourse(null)} />
      )}
    </>
  )}
</main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-neutral-500">
        נבנה ע"י מור עמיאל רבייב
        תלונות/בעיות/השגות/תהיות morrabaev@tauex.tau.ac.il 
        עודכן לאחרונה 02/11/2025 22:01
      </footer>

      <Toast />

     <DebugBar /> 

    </div>
  );
}