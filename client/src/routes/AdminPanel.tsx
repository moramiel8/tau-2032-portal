// client/src/routes/AdminPanel.tsx
import { useState, useEffect, useMemo } from "react";
import type React from "react";
import type { User } from "../utils/auth";
import { YEARS } from "../data/years";
import type { Course } from "../data/years";
import { useNavigate } from "react-router-dom";

import NewCourseForm from "../components/NewCourseForm";

import RichTextEditor from "../components/RichTextEditor";

// ---------- types ----------
type Props = {
  user: User;
  isAdmin: boolean;
  isGlobalVaad: boolean;
  isCourseVaad: boolean;
  myCourseVaadIds: string[];
};

type CourseVaadEntry = {
  id: string;
  email: string;
  courseIds: string[];
  displayName?: string | null;
};

type GlobalRoleEntry = {
  id: string;
  email: string;
  role: "admin" | "vaad";
  displayName?: string | null;
};

type GlobalRoleFormProps = {
  onAdd: (
    email: string,
    role: "admin" | "vaad",
    displayName: string
  ) => Promise<void> | void;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  courseId?: string | null;
  createdAt?: string;
};

// ---------- small form component for global roles ----------
function GlobalRoleForm({ onAdd }: GlobalRoleFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "vaad">("vaad");
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    try {
      await onAdd(email, role, displayName);
      setEmail("");
      setRole("vaad");
      setDisplayName("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-wrap gap-2 items-center text-sm"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="student@mail.tau.ac.il"
       className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
      />

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="שם תצוגה (למשל: ועד כללי)"
         className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "admin" | "vaad")}
          className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"  >
        <option value="vaad">ועד כללי</option>
        <option value="admin">מנהל מערכת</option>
      </select>

      <button
        type="submit"
        disabled={saving}
        className="border rounded-xl px-3 py-1  bg-blue-600 text-white
          hover:bg-blue-700 dark:hover:bg-slate-800 dark:border-slate-700 cursor-pointer"
      >
        הוספה
      </button>
    </form>
  );
}

// ---------- main component ----------
export default function AdminPanel({
  user,
  isAdmin,
  isGlobalVaad,
  isCourseVaad,
  myCourseVaadIds,
}: Props) {
  if (!user) return null;

  const nav = useNavigate();
   const navback = useNavigate(); 

  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [editingCourseVaadId, setEditingCourseVaadId] =
    useState<string | null>(null);
  const [selectedUserDisplayName, setSelectedUserDisplayName] = useState("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnBody, setNewAnnBody] = useState("");
  const [newAnnCourseId, setNewAnnCourseId] = useState<string>("");

  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);

  const [annError, setAnnError] = useState<string | null>(null);

  const [courseVaad, setCourseVaad] = useState<CourseVaadEntry[]>([]);
  const [globalRoles, setGlobalRoles] = useState<GlobalRoleEntry[]>([]);
  const [saving, setSaving] = useState(false);

    // בתוך AdminPanel.tsx, למעלה בתוך הקומפוננטה לפני ה-return:
const cardClass =
  "mb-8 border rounded-2xl p-4 sm:p-6 " +
   "bg-white dark:bg-slate-900 " +  
  "border-neutral-200 dark:border-slate-700 shadow-sm";

   const handleBack = () => {
    if (window.history.length > 1) {
      navback(-1);
    } else {
      navback("/"); // אם נכנסו ישר ללינק, נחזור לדף הראשי
    }
  };


  const allCourses: Course[] = useMemo(
    () => YEARS.flatMap((y) => y.semesters.flatMap((s) => s.courses)),
    []
  );

  const courseName = (id: string) =>
    allCourses.find((c) => c.id === id)?.name ?? id;

  // ---------- טעינת הקצאות + תפקידי־על ----------
  const loadAssignments = async () => {
    try {
      const res = await fetch("/api/admin/assignments", {
        credentials: "include",
      });

      if (!res.ok) {
        console.warn("[AdminPanel] assignments request failed", res.status);
        return;
      }

      const raw = await res.json();
      console.log("assignments from server:", raw);

      const courseVaadData: CourseVaadEntry[] =
        raw.courseVaad ?? raw.course_vaad ?? [];

      const globalRolesData: GlobalRoleEntry[] =
        raw.globalRoles ?? raw.global_roles ?? [];

      setCourseVaad(courseVaadData);

      // רק אדמין מקבל רשימת תפקידי־על
      if (isAdmin) {
        setGlobalRoles(globalRolesData);
      } else {
        setGlobalRoles([]);
      }
    } catch (e) {
      console.warn("[AdminPanel] failed to load assignments", e);
    }
  };

  // טעינה רק אם יש לפחות ועד/אדמין
  useEffect(() => {
    if (!isAdmin && !isGlobalVaad) return;
    loadAssignments();
  }, [isAdmin, isGlobalVaad]);

  // ----- מודעות -----
  useEffect(() => {
    if (!isAdmin && !isGlobalVaad) return;

    (async () => {
      try {
        const res = await fetch("/api/admin/announcements", {
          credentials: "include",
        });
        if (!res.ok) return;

        const data = await res.json();
        const items: Announcement[] = Array.isArray(data)
          ? data
          : data.items || [];

        setAnnouncements(items);
      } catch (e) {
        console.warn("[AdminPanel] failed to load announcements", e);
      }
    })();
  }, [isAdmin, isGlobalVaad]);

const handleSaveAnnouncement = async () => {
  // אם אחד מהם חסר – הודעת שגיאה קטנה ולא שומרים
  if (!newAnnTitle || !newAnnBody) {
    setAnnError("חובה למלא גם כותרת וגם תוכן המודעה.");
    return;
  }
  setAnnError(null);

  const payload = {
    title: newAnnTitle,
    body: newAnnBody,
    courseId: newAnnCourseId || null,
  };

  try {
    const isEditing = !!editingAnnId;
    const url = isEditing
      ? `/api/admin/announcements/${editingAnnId}`
      : "/api/admin/announcements";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("save failed");

    const saved: Announcement = await res.json();

    setAnnouncements((prev) =>
      isEditing
        ? prev.map((a) => (a.id === saved.id ? saved : a))
        : [saved, ...prev]
    );

    setNewAnnTitle("");
    setNewAnnBody("");
    setNewAnnCourseId("");
    setEditingAnnId(null);
  } catch (e) {
    console.warn("[AdminPanel] save announcement failed", e);
  }
};



  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("למחוק את המודעה?")) return;
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.warn("[AdminPanel] delete announcement failed", e);
    }
  };

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setSelectedUserEmail("");
    setSelectedUserDisplayName("");
    setSelectedCourseIds([]);
    setEditingCourseVaadId(null);
  };

  const handleSaveCourseVaad = async () => {
    if (!selectedUserEmail || selectedCourseIds.length === 0) return;
    setSaving(true);
    try {
      const body = {
        email: selectedUserEmail,
        displayName: selectedUserDisplayName || null,
        courseIds: selectedCourseIds,
      };

      const url = editingCourseVaadId
        ? `/api/admin/course-vaad/${editingCourseVaadId}`
        : "/api/admin/course-vaad";
      const method = editingCourseVaadId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(
          "[AdminPanel] save course vaad failed:",
          res.status,
          text
        );
        throw new Error("save failed");
      }

      await loadAssignments();
      resetForm();
    } catch (e) {
      console.warn("[AdminPanel] save course vaad failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCourseVaad = (entry: CourseVaadEntry) => {
    setEditingCourseVaadId(entry.id);
    setSelectedUserEmail(entry.email);
    setSelectedUserDisplayName(entry.displayName || "");
    setSelectedCourseIds(entry.courseIds);
  };

  const handleDeleteCourseVaad = async (id: string) => {
    if (!window.confirm("להסיר הרשאות ועד קורס מהסטודנט/ית?")) return;

    try {
      await fetch(`/api/admin/course-vaad/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setCourseVaad((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.warn("[AdminPanel] delete course vaad failed", e);
    }
  };

  // --- גלובאל רולס ---
  const handleAddGlobalRole = async (
    email: string,
    role: "admin" | "vaad",
    displayName: string
  ) => {
    if (!isAdmin) return; // הגנה נוספת
    try {
      const res = await fetch("/api/admin/global-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role, displayName }),
      });
      if (!res.ok) throw new Error("save failed");

      await loadAssignments(); // מרענן את הטבלה
    } catch (e) {
      console.warn("[AdminPanel] add global role failed", e);
    }
  };

  const handleDeleteGlobalRole = async (id: string) => {
    if (!isAdmin) return; // הגנה נוספת
    if (!window.confirm("להסיר הרשאות גלובליות מהמשתמש/ת?")) return;
    try {
      await fetch(`/api/admin/global-roles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setGlobalRoles((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.warn("[AdminPanel] delete global role failed", e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
       {/* כפתור חזור */}
<button
  onClick={handleBack}
  className="
    group mb-2 inline-flex items-center gap-1
    rounded-2xl border px-3 py-1 text-xs cursor-pointer
    border-neutral-300 text-neutral-700 bg-white
    dark:border-slate-600 dark:text-slate-200 dark:bg-slate-900
  "
>
  <span className="animate-pulse">→</span>
  חזרה
</button>
      <h1 className="text-2xl font-semibold mb-2">פאנל ניהול</h1>
      <p className="text-sm text-neutral-600 mb-6">
        מחובר כ־<span className="font-medium">{user.email}</span>{" "}
        <span className="text-xs text-neutral-500">({user.role})</span>
      </p>

      {/* 1. הקצאת ועד קורס – אדמין + ועד כללי */}
      {(isAdmin || isGlobalVaad) && (
      <section className={cardClass}>
            <h2 className="text-lg font-medium mb-3">
            הקצאת תפקיד &quot;ועד קורס&quot;
          </h2>

          <label className="block text-sm mb-2">
            מייל של הסטודנט:
            <input
              type="email"
              value={selectedUserEmail}
              onChange={(e) => setSelectedUserEmail(e.target.value)}
              className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
              placeholder="student@mail.tau.ac.il"
            />
          </label>

          <label className="block text-sm mb-2">
            שם תצוגה (אופציונלי):
            <input
              type="text"
              value={selectedUserDisplayName}
              onChange={(e) => setSelectedUserDisplayName(e.target.value)}
             className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
              placeholder="למשל: מור עמיאל רבייב"
            />
          </label>

          <div className="mt-4">
          <div
  className="
    max-h-72 overflow-y-auto
    rounded-2xl border border-neutral-200
    bg-white p-2 text-sm space-y-1

"
>
  {allCourses.map((c) => (
    <label
      key={c.id}
      className="
        flex flex-row-reverse items-center gap-3
        rounded-xl px-2 py-2
        hover:bg-blue-100 cursor-pointer
        dark:bg-slate-100 border-slate-400 
      "
    >
      {/* הטקסט משמאל */}
      <span className="flex-1 truncate text-right text-neutral-800">
        {c.name}
      </span>

      {/* הצ'קבוקס מימין לטקסט */}
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={selectedCourseIds.includes(c.id)}
        onChange={() => toggleCourse(c.id)}
      />
    </label>
  ))}
</div>


          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSaveCourseVaad}
              disabled={saving}
              className="border rounded-xl px-3 py-1  bg-blue-600 text-white
          hover:bg-blue-700 dark:hover:bg-slate-800 dark:border-slate-700
          cursor-pointer"
            >
              {editingCourseVaadId ? "עדכון הקצאה" : "שמירת הקצאה"}
            </button>

            {editingCourseVaadId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-neutral-500 underline cursor-pointer"
              >
                ביטול עריכה
              </button>
            )}
          </div>
        </section>
      )}

      {/* 2. רשימת הקצאות ועד קורס */}
      {(isAdmin || isGlobalVaad) && (
        <section className={cardClass}>
       <h2 className="text-lg font-medium mb-3">ועדי קורסים קיימים</h2>

          {courseVaad.length === 0 ? (
            <div className="text-sm text-neutral-500">
              אין עדיין משתמשים שהוגדרו כ&quot;ועד קורס&quot;.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs text-neutral-500 dark:border-slate-700">
                  <th className="text-right py-2">מייל</th>
                  <th className="text-right py-2">קורסים</th>
                  <th className="text-right py-2 w-24">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {courseVaad.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-b-0">
                    {/* מייל + שם תצוגה */}
                    <td className="py-2 align-top">
                      <div>{entry.email}</div>
                      {entry.displayName && (
                        <div className="text-[11px] text-neutral-500">
                          {entry.displayName}
                        </div>
                      )}
                    </td>

                    {/* קורסים – אחד מתחת לשני */}
                    <td className="py-2 text-xs align-top">
                      <ul className="space-y-1">
                        {entry.courseIds.map((cid) => (
                          <li key={cid} className="leading-snug">
                            {courseName(cid)}
                          </li>
                        ))}
                      </ul>
                    </td>

                    {/* פעולות */}
                    <td className="py-2 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <button
                          onClick={() => handleEditCourseVaad(entry)}
                          className="text-xs underline text-blue-600 cursor-pointer"
                        >
                          עריכה
                        </button>
                        <button
                          onClick={() => handleDeleteCourseVaad(entry.id)}
                          className="text-xs underline text-red-600 cursor-pointer"
                          title="מחיקה"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* 3. ועד כללי / מנהלים – רק אדמין */}
      {isAdmin && (
        <section className={cardClass}>
          <h2 className="text-lg font-medium mb-3">ועד כללי / מנהלים</h2>

          {globalRoles.length === 0 ? (
            <div className="text-sm text-neutral-500">
              אין עדיין משתמשים עם הרשאות גלובליות.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="border-b text-xs text-neutral-500 dark:border-slate-700">
                  <th className="text-right py-2">מייל</th>
                  <th className="text-right py-2">תפקיד</th>
                  <th className="text-right py-2 w-24">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {globalRoles.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2">
                      <div>{r.email}</div>
                      {r.displayName && (
                        <div className="text-[11px] text-neutral-500">
                          {r.displayName}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-xs">
                      {r.role === "admin" ? "מנהל מערכת" : "ועד כללי"}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDeleteGlobalRole(r.id)}
                        className="text-xs underline text-red-600"
                        title="מחיקה"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <GlobalRoleForm onAdd={handleAddGlobalRole} />
        </section>
      )}

      {/* 4. ניהול תוכן + לוח מודעות */}
      {(isAdmin || isGlobalVaad) && (
        <>
          <section className={cardClass}>
            <h2 className="text-lg font-medium mb-3">ניהול תוכן האתר</h2>
            <p className="text-sm text-neutral-600 mb-3">
              כאן אפשר לערוך את עמוד הבית ואת דפי הקורסים.
            </p>
            <ul className="text-sm space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => nav("/admin/home")}
                  className="border rounded-xl px-3 py-1  bg-blue-600 text-white
          hover:bg-blue-700 dark:hover:bg-slate-800 dark:border-slate-700 cursor-pointer"
                >
                  עריכת עמוד הבית
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => nav("/admin/courses")}
                  className="border rounded-xl px-3 py-1  bg-blue-600 text-white
          hover:bg-blue-700 dark:hover:bg-slate-800 dark:border-slate-700 cursor-pointer"
                >
                  עריכת דפי הקורסים
                </button>
              </li>
            </ul>
          </section>

                {/* 4b. הוספת קורס חדש – מתוך פאנל המנהל */}
      {(isAdmin || isGlobalVaad) && (
        <section className={cardClass}>
          <h2 className="text-lg font-medium mb-3">הוספת קורס חדש</h2>
          <p className="text-sm text-neutral-600 mb-3">
            יצירת קורס חדש במערכת. לאחר היצירה אפשר לערוך את דף הקורס
            (תוכן, מטלות, מבחנים) מתוך &quot;עריכת דפי הקורסים&quot;.
          </p>

          <NewCourseForm
            onCreated={(courseId) => {
              // נווט ישירות לעמוד עריכת הקורס שנוצר:
              nav(`/admin/course/${courseId}/edit`);
            }}
          />
        </section>
      )}


        <section className={cardClass}>
            <h2 className="text-lg font-medium mb-3">לוח מודעות</h2>

            {announcements.length === 0 ? (
              <div className="text-sm text-neutral-500">אין עדיין מודעות.</div>
            ) : (
              <ul className="text-sm space-y-2 mb-4 max-h-64 overflow-y-auto">
                {announcements.map((a) => (
                  <li
                    key={a.id}
  className="mt-2 border-t border-neutral-200 pt-3 flex justify-between gap-2"
                      >
                    <div>
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-neutral-600  ">
                        {a.body?.includes("<") ? (
                          <div dangerouslySetInnerHTML={{ __html: a.body }} />
                        ) : (
                         <div
  className="announcement-body"
  dangerouslySetInnerHTML={{ __html: a.body }}
/>

                        )}
                      </div>

                      <div className="text-[10px] text-neutral-400 mt-1">
                        {a.courseId
                          ? `קורס: ${courseName(a.courseId)}`
                          : "מודעה כללית"}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 self-start">
                      <button
                        onClick={() => {
                          setEditingAnnId(a.id);
                          setNewAnnTitle(a.title);
                          setNewAnnBody(a.body);
                          setNewAnnCourseId(a.courseId || "");
                        }}
                        className="text-xs underline text-blue-600 cursor-pointer"
                      >
                        עריכה
                      </button>

                      <button
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="text-xs underline text-red-600 cursor-pointer" 
                      >
                        מחיקה
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

<div className="border-t border-neutral-200 pt-3 mt-3 text-sm">
    <h3 className="font-medium mb-2">
    {editingAnnId ? "עריכת מודעה" : "הוספת מודעה חדשה"}
  </h3>

  <label className="block mb-2">
    <span className="block mb-1">כותרת:</span>
    <input
       className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
      value={newAnnTitle}
      onChange={(e) => setNewAnnTitle(e.target.value)}
    />
  </label>

<div className="block mb-2">
  <span className="block mb-1">תוכן:</span>
  <RichTextEditor
    value={newAnnBody}
    onChange={setNewAnnBody}
    placeholder="תוכן ההודעה…"
    className="mt-2"
  />
</div>

{annError && (
  <div className="mt-1 text-xs text-red-500">
    {annError}
  </div>
)}

  <label className="block mb-2">
    <span className="block mb-1">שייך לקורס (לא חובה):</span>
    <select
       className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
      value={newAnnCourseId}
      onChange={(e) => setNewAnnCourseId(e.target.value)}
    >
      <option value="">מודעה כללית</option>
      {allCourses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  </label>

  <button
    type="button"
    onClick={handleSaveAnnouncement}
    className="border-blue-600 rounded-xl px-3 py-1 flex-1 min-w-[220px]
                         bg-blue-600 text-white
                         hover:bg-blue-700
                        dark:hover:bg-blue-800  border-blue-800 
                         gap-1 cursor-pointer"
  >
    {editingAnnId ? "שמירת שינויים" : "הוספת מודעה"}
  </button>

  {editingAnnId && (
    <button
      type="button"
      onClick={() => {
        setEditingAnnId(null);
        setNewAnnTitle("");
        setNewAnnBody("");
        setNewAnnCourseId("");
        setAnnError(null);
      }}
    className="text-xs text-neutral-500 underline mr-4 cursor-pointer"    >
      ביטול עריכה
    </button>
  )}
</div>

          </section>
        </>
      )}

      {/* 5. ועד־קורס – הקורסים שלו */}
      {isCourseVaad && (
       <section className={cardClass}>
          <h2 className="text-lg font-medium mb-3">
            הקורסים שאתה/את ועד שלהם
          </h2>

          {myCourseVaadIds.length === 0 ? (
            <div className="text-sm text-neutral-500">
              לא נמצאו קורסים שהוקצו לך כוועד.
            </div>
          ) : (
            <ul className="text-sm space-y-2">
              {myCourseVaadIds.map((cid) => {
                const c = allCourses.find((x) => x.id === cid);
                return (
                  <li
                    key={cid}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{c?.name ?? cid}</span>
                    <button
                      type="button"
                      onClick={() => nav(`/admin/course/${cid}/edit`)}
                     className="
                       border-blue-600   rounded-2xl px-3 py-2 text-sm
                         bg-blue-600 text-white
                         hover:bg-blue-700
                        dark:hover:bg-blue-800  border-blue-800 
                        flex items-center gap-1 cursor-pointer"
                    >
                      עריכת דף הקורס
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
