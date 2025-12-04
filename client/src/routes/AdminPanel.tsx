// client/src/routes/AdminPanel.tsx
import { useState, useEffect, useMemo } from "react";
import type { User } from "../utils/auth";
import { YEARS } from "../data/years";
import type { Course } from "../data/years";
import { useNavigate } from "react-router-dom";

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
        className="border rounded-xl px-3 py-1 hover:bg-neutral-50 lex-1 min-w-[220px] dark:hover:bg-slate-800 dark:border-slate-700"
      />

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="שם תצוגה (למשל: ועד כללי)"
        className="border rounded-xl px-3 py-1 hover:bg-neutral-50 lex-1 min-w-[220px] dark:hover:bg-slate-800 dark:border-slate-700"

      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "admin" | "vaad")}
        className="border rounded-xl px-3 py-1 hover:bg-neutral-50 lex-1 min-w-[220px] dark:hover:bg-slate-800 dark:border-slate-700"
      >
        <option value="vaad">ועד כללי</option>
        <option value="admin">מנהל מערכת</option>
      </select>

      <button
        type="submit"
        disabled={saving}
              className="border rounded-xl px-3 py-1 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
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

  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [editingCourseVaadId, setEditingCourseVaadId] =
    useState<string | null>(null);
  const [selectedUserDisplayName, setSelectedUserDisplayName] = useState("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnBody, setNewAnnBody] = useState("");
  const [newAnnCourseId, setNewAnnCourseId] = useState<string>("");

  const [courseVaad, setCourseVaad] = useState<CourseVaadEntry[]>([]);
  const [globalRoles, setGlobalRoles] = useState<GlobalRoleEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const allCourses: Course[] = useMemo(
    () => YEARS.flatMap((y) => y.semesters.flatMap((s) => s.courses)),
    []
  );

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

      // ⬅️ חשוב: רק אדמין מקבל בכלל רשימת תפקידי־על ל־state
      if (isAdmin) {
        setGlobalRoles(globalRolesData);
      } else {
        setGlobalRoles([]); // ליתר ביטחון
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

  const handleAddAnnouncement = async () => {
    if (!newAnnTitle || !newAnnBody) return;
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newAnnTitle,
          body: newAnnBody,
          courseId: newAnnCourseId || null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const saved: Announcement = await res.json();
      setAnnouncements((prev) => [saved, ...prev]);
      setNewAnnTitle("");
      setNewAnnBody("");
      setNewAnnCourseId("");
    } catch (e) {
      console.warn("[AdminPanel] add announcement failed", e);
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

      await loadAssignments();
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

  const courseName = (id: string) =>
    allCourses.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="text-2xl font-semibold mb-2">פאנל מנהל</h1>
      <p className="text-sm text-neutral-600 mb-6">
        מחובר כ־<span className="font-medium">{user.email}</span>{" "}
        <span className="text-xs text-neutral-500">({user.role})</span>
      </p>

     {/* 1. הקצאת ועד קורס – אדמין + ועד כללי */}
{(isAdmin || isGlobalVaad) && (
  <section className="mb-8 border rounded-2xl p-4">
    <h2 className="text-lg font-medium mb-3">
      הקצאת תפקיד &quot;ועד קורס&quot;
    </h2>

    <label className="block text-sm mb-2">
      מייל של הסטודנט:
      <input
        type="email"
        value={selectedUserEmail}
        onChange={(e) => setSelectedUserEmail(e.target.value)}
        className="border rounded-xl px-3 py-2 mt-1 w-full text-sm"
        placeholder="student@mail.tau.ac.il"
      />
    </label>

    <label className="block text-sm mb-2">
      שם תצוגה (אופציונלי):
      <input
        type="text"
        value={selectedUserDisplayName}
        onChange={(e) => setSelectedUserDisplayName(e.target.value)}
        className="border rounded-xl px-3 py-2 mt-1 w-full text-sm"
        placeholder="למשל: מור עמיאל רבייב"
      />
    </label>

    <div className="mt-4">
      <div className="text-sm font-medium mb-2">בחר קורסים:</div>
      <div className="max-h-72 overflow-y-auto border rounded-xl p-2 text-sm space-y-1">
        {allCourses.map((c) => (
          <label key={c.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedCourseIds.includes(c.id)}
              onChange={() => toggleCourse(c.id)}
            />
            <span>{c.name}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="mt-4 flex gap-2">
      <button
        onClick={handleSaveCourseVaad}
        disabled={saving}
              className="border rounded-xl px-3 py-1 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
      >
        {editingCourseVaadId ? "עדכון הקצאה" : "שמירת הקצאה"}
      </button>

      {editingCourseVaadId && (
        <button
          type="button"
          onClick={resetForm}
          className="text-xs text-neutral-500 underline"
        >
          ביטול עריכה
        </button>
      )}
    </div>
  </section>
)}

      {/* 3. ועד כללי / מנהלים – רק אדמין */}
      {isAdmin && (
        <section className="mb-8 border rounded-2xl p-4">
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
          <section className="border rounded-2xl p-4 mb-8">
            <h2 className="text-lg font-medium mb-3">ניהול תוכן האתר</h2>
            <p className="text-sm text-neutral-600 mb-3">
              כאן אפשר לערוך את עמוד הבית ואת דפי הקורסים.
            </p>
            <ul className="text-sm space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => nav("/admin/home")}
              className="border rounded-xl px-3 py-1 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
                >
                  עריכת עמוד הבית
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => nav("/admin/courses")}
              className="border rounded-xl px-3 py-1 hover:bg-neutral-50 dark:hover:bg-slate-800 dark:border-slate-700"
                >
                  עריכת דפי הקורסים
                </button>
              </li>
            </ul>
          </section>

          <section className="mt-6 mb-8 border rounded-2xl p-4">
            <h2 className="text-lg font-medium mb-3">לוח מודעות</h2>

            {announcements.length === 0 ? (
              <div className="text-sm text-neutral-500">אין עדיין מודעות.</div>
            ) : (
              <ul className="text-sm space-y-2 mb-4 max-h-64 overflow-y-auto">
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className="mt-2 border rounded-xl px-3 py-2 flex justify-between gap-2"
                  >
                    <div>
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-neutral-600 whitespace-pre-line">
                        {a.body}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {a.courseId
                          ? `קורס: ${courseName(a.courseId)}`
                          : "מודעה כללית"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="text-xs underline text-red-600 self-start"
                    >
                      מחיקה
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t pt-3 mt-3 text-sm">
              <h3 className="font-medium mb-2">הוספת מודעה חדשה</h3>

              <label className="block mb-2">
                <span className="block mb-1">כותרת:</span>
                <input
                  className="border rounded-xl px-3 py-2 w-full dark:hover:bg-slate-800 dark:border-slate-700"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                />
              </label>

              <label className="block mb-2">
                <span className="block mb-1">תוכן:</span>
                <textarea
                  className="border rounded-xl px-3 py-2 w-full min-h-[80px] dark:hover:bg-slate-800 dark:border-slate-700"
                  value={newAnnBody}
                  onChange={(e) => setNewAnnBody(e.target.value)}
                />
              </label>

              <label className="block mb-2">
                <span className="block mb-1">שייך לקורס (לא חובה):</span>
                <select
        className="border rounded-xl px-3 py-1 hover:bg-neutral-50 flex-1 w-full dark:hover:bg-slate-800 dark:border-slate-700"
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
                onClick={handleAddAnnouncement}
        className="border rounded-xl px-3 py-1 hover:bg-neutral-50 lex-1 min-w-[220px] dark:hover:bg-slate-800 dark:border-slate-700"
              >
                הוספת מודעה
              </button>
            </div>
          </section>
        </>
      )}

      {/* 5. ועד־קורס – הקורסים שלו */}
      {isCourseVaad && (
        <section className="mb-8 border rounded-2xl p-4">
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
                      className="border rounded-xl px-3 py-1 text-xs hover:bg-neutral-50"
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
