// client/src/App.tsx
import React, { useEffect, useState } from "react";
import CourseList from "./components/CourseList";
import CoursePage from "./components/CoursePage";
import { YEARS } from "./data/years";
import type { Course } from "./data/years";
import { fetchSession, isTauEmail, startGoogleLogin, getDomain } from "./utils/auth";
import type { User } from "./utils/auth";

/**
 * CONFIG
 * - AUTH_ENABLED: אם false => מסתירים את כפתור ההתחברות ומציגים את התוכן ללא בדיקה.
 * - MOCK_USER: אם מוגדר ומשמש כאשר AUTH_ENABLED=false, מאפשר לבדוק את תצוגת 'משתמש מחובר'.
 */
const AUTH_ENABLED = false; // <-- הפוך ל־true כדי להפעיל את מסך ההתחברות
const MOCK_USER: User | null = {
  // אם תרצה שממש יהיה "משתמש מחובר" בזמן פיתוח, תכניס כאן את המייל והדגל inTauGroup
  email: "demo@mail.tau.ac.il",
  inTauGroup: true,
};

export default function App() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [user, setUser] = useState<User | null>(AUTH_ENABLED ? null : MOCK_USER);
  const [loadingUser, setLoadingUser] = useState(AUTH_ENABLED ? true : false);

  useEffect(() => {
    if (!AUTH_ENABLED) {
      // אין אימות — כבר מכוייל ל־MOCK_USER או null
      setLoadingUser(false);
      return;
    }

    (async () => {
      const u = await fetchSession();
      setUser(u);
      setLoadingUser(false);
    })();
  }, []);

  const handleSignIn = () => startGoogleLogin();

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-22 h-8 rounded-xl border flex items-center justify-center">MedTAU</div>
            <div>
              <div className="text-base font-semibold">אתר מחזור 2032 - תל אביב</div>
              <div className="text-xs text-neutral-500">אתר עזר לסטודנטים לרפואה שש שנתי</div>
            </div>
          </div>

          {/* כפתור ההתחברות/שם משתמש — מוסתרים כאשר AUTH_ENABLED=false */}
          <div className="flex items-center gap-2">
            {AUTH_ENABLED ? (
              <>
                {user ? (
                  <span className="text-xs text-neutral-600 hidden sm:inline">{user.email}</span>
                ) : null}
                {!user && (
                  <button onClick={handleSignIn} className="border rounded-2xl px-3 py-2 text-sm hover:bg-neutral-50">
                    התחברות עם Google
                  </button>
                )}
              </>
            ) : (
              // מצב פיתוח — אפשר להראות סימון קטן שמצביע שהאימות כבוי
              <div className="text-xs text-neutral-500">Dev: auth disabled</div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* כש־AUTH_ENABLED=false אנחנו כבר לא מחכים לסשן אמיתי */}
        {loadingUser ? (
          <div className="text-sm text-neutral-500">טוען…</div>
        ) : !AUTH_ENABLED ? (
          // מצב פיתוח: הצג את התוכן ישירות (או מצג 'אין הרשאה' אם MOCK_USER=null)
          MOCK_USER ? (
            !selectedCourse ? (
              <CourseList years={YEARS} onOpenCourse={setSelectedCourse} />
            ) : (
              <CoursePage course={selectedCourse} onBack={() => setSelectedCourse(null)} />
            )
          ) : (
            <div className="border rounded-2xl p-6 text-sm text-neutral-600">
              מצב פיתוח: אין משתמש מדומה. הגדר MOCK_USER ב־App.tsx כדי להציג תוכן מחובר.
            </div>
          )
        ) : !user ? (
          <div className="border rounded-2xl p-6 text-sm">
            כדי לגשת לתוכן האתר יש להתחבר עם חשבון Google. במסך ההתחברות תבחר/י חשבון עם הדומיין
            <b> mail.tau.ac.il</b> או <b>tauex.tau.ac.il</b>.
            <div className="mt-3">
              <button onClick={handleSignIn} className="border rounded-xl px-3 py-2 hover:bg-neutral-50">
                התחברות עם Google
              </button>
            </div>
          </div>
        ) : !isTauEmail(user.email) ? (
          <div className="border rounded-2xl p-6 text-sm text-red-600">
            הדומיין של המייל ({getDomain(user.email)}) אינו מורשה. יש לבחור חשבון TAU.
          </div>
        ) : !user.inTauGroup ? (
          <div className="border rounded-2xl p-6 text-sm text-red-600">
            אין הרשאה. רק חברי הקבוצה shesh2032-group@mail.tau.ac.il יכולים לגשת.
          </div>
        ) : !selectedCourse ? (
          <CourseList years={YEARS} onOpenCourse={setSelectedCourse} />
        ) : (
          <CoursePage course={selectedCourse} onBack={() => setSelectedCourse(null)} />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-neutral-500">
        נבנה ע"י מור עמיאל רבייב
      </footer>
    </div>
  );
}
