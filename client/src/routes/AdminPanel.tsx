// client/src/routes/AdminPanel.tsx
import { useState, useEffect, useMemo } from "react";
import type { User } from "../utils/auth";
import { YEARS } from "../data/years";
import type { Course } from "../data/years";

// ---------- types ----------
type Props = {
  user: User | null;
};

type CourseVaadEntry = {
  id: string;
  email: string;
  courseIds: string[];
};

type GlobalRoleEntry = {
  id: string;
  email: string;
  role: "admin" | "vaad";
};

type GlobalRoleFormProps = {
  onAdd: (email: string, role: "admin" | "vaad") => Promise<void> | void;
};

// ---------- small form component for global roles ----------
function GlobalRoleForm({ onAdd }: GlobalRoleFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "vaad">("vaad");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    try {
      await onAdd(email, role);
      setEmail("");
      setRole("vaad");
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
        className="border rounded-xl px-3 py-2 flex-1 min-w-[220px]"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "admin" | "vaad")}
        className="border rounded-xl px-3 py-2"
      >
        <option value="vaad">ועד כללי</option>
        <option value="admin">מנהל מערכת</option>
      </select>
      <button
        type="submit"
        disabled={saving}
        className="border rounded-xl px-3 py-2 hover:bg-neutral-50 disabled:opacity-60"
      >
        הוספה
      </button>
    </form>
  );
}

// ---------- main component ----------
export default function AdminPanel({ user }: Props) {
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [editingCourseVaadId, setEditingCourseVaadId] = useState<string | null>(
    null
  );

  const [courseVaad, setCourseVaad] = useState<CourseVaadEntry[]>([]);
  const [globalRoles, setGlobalRoles] = useState<GlobalRoleEntry[]>([]);

  const [saving, setSaving] = useState(false);

  const allCourses: Course[] = useMemo(
    () => YEARS.flatMap((y) => y.semesters.flatMap((s) => s.courses)),
    []
  );

  // טעינה ראשונית מהשרת (כשיהיה API אמיתי)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/assignments");
        if (!res.ok) return;
        const data = (await res.json()) as {
          courseVaad: CourseVaadEntry[];
          globalRoles: GlobalRoleEntry[];
        };
        setCourseVaad(data.courseVaad);
        setGlobalRoles(data.globalRoles);
      } catch (e) {
        console.warn("[AdminPanel] failed to load assignments", e);
      }
    })();
  }, []);

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setSelectedUserEmail("");
    setSelectedCourseIds([]);
    setEditingCourseVaadId(null);
  };

  const handleSaveCourseVaad = async () => {
    if (!selectedUserEmail || selectedCourseIds.length === 0) return;
    setSaving(true);
    try {
      const body = {
        email: selectedUserEmail,
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
      });
      if (!res.ok) throw new Error("save failed");

      const saved: CourseVaadEntry = await res.json();

      setCourseVaad((prev) =>
        editingCourseVaadId
          ? prev.map((x) => (x.id === saved.id ? saved : x))
          : [...prev, saved]
      );

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
    setSelectedCourseIds(entry.courseIds);
  };

  const handleDeleteCourseVaad = async (id: string) => {
    if (!window.confirm("להסיר הרשאות ועד קורס מהסטודנט/ית?")) return;

    try {
      await fetch(`/api/admin/course-vaad/${id}`, { method: "DELETE" });
      setCourseVaad((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.warn("[AdminPanel] delete course vaad failed", e);
    }
  };

  const handleAddGlobalRole = async (email: string, role: "admin" | "vaad") => {
    try {
      const res = await fetch("/api/admin/global-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) throw new Error("save failed");
      const saved: GlobalRoleEntry = await res.json();
      setGlobalRoles((prev) => [...prev, saved]);
    } catch (e) {
      console.warn("[AdminPanel] add global role failed", e);
    }
  };

  const handleDeleteGlobalRole = async (id: string) => {
    if (!window.confirm("להסיר הרשאות גלובליות מהמשתמש/ת?")) return;
    try {
      await fetch(`/api/admin/global-role/${id}`, { method: "DELETE" });
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

      {/* 1. הקצאת ועד קורס */}
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
            className="border rounded-xl px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
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

      {/* 2. רשימת ועד קורס קיימים */}
      <section className="mb-8 border rounded-2xl p-4">
        <h2 className="text-lg font-medium mb-3">רשימת &quot;ועד קורס&quot;</h2>

        {courseVaad.length === 0 ? (
          <div className="text-sm text-neutral-500">עדיין אין הקצאות.</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-neutral-500">
                <th className="text-right py-2">מייל</th>
                <th className="text-right py-2">קורסים</th>
                <th className="text-right py-2 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {courseVaad.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className="py-2 align-top">{entry.email}</td>
                  <td className="py-2 align-top">
                    <ul className="space-y-0.5">
                      {entry.courseIds.map((cid) => (
                        <li key={cid} className="text-xs">
                          {courseName(cid)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 align-top">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCourseVaad(entry)}
                        className="text-xs underline"
                        title="עריכה"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCourseVaad(entry.id)}
                        className="text-xs underline text-red-600"
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

      {/* 3. ועד כללי / מנהלים */}
      <section className="mb-8 border rounded-2xl p-4">
        <h2 className="text-lg font-medium mb-3">ועד כללי / מנהלים</h2>

        {globalRoles.length === 0 ? (
          <div className="text-sm text-neutral-500">
            אין עדיין משתמשים עם הרשאות גלובליות.
          </div>
        ) : (
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b text-xs text-neutral-500">
                <th className="text-right py-2">מייל</th>
                <th className="text-right py-2">תפקיד</th>
                <th className="text-right py-2 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {globalRoles.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2">{r.email}</td>
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

      {/* 4. ניהול תוכן (placeholder לעתיד) */}
      <section className="border rounded-2xl p-4">
        <h2 className="text-lg font-medium mb-3">ניהול תוכן האתר</h2>
        <p className="text-sm text-neutral-600 mb-3">
          בהמשך נוסיף כאן ממשק עריכה לעמוד הבית ולדפי הקורסים.
        </p>
        <ul className="text-sm space-y-2">
          <li>
            <button
              type="button"
              className="border rounded-xl px-3 py-2 hover:bg-neutral-50"
            >
              עריכת עמוד הבית
            </button>
          </li>
          <li>
            <button
              type="button"
              className="border rounded-xl px-3 py-2 hover:bg-neutral-50"
            >
              עריכת דפי הקורסים
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}
