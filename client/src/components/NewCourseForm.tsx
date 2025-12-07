// client/src/components/NewCourseForm.tsx
import { useState, type ChangeEvent, type FormEvent } from "react";

type NewCoursePayload = {
  name: string;
  shortName?: string;
  yearLabel: string;      // למשל: "שנה א'"
  semesterLabel: string;  // למשל: "סמסטר א'"
  courseCode?: string;    // קוד קורס / מזהה פנימי
};

type NewCourseFormProps = {
  // callback אופציונלי – לדוגמה: לנווט מיד לעריכת הקורס החדש
  onCreated?: (courseId: string) => void;
};

// אפשר לשנות כאן טקסטים אם תרצה
const YEAR_OPTIONS = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'", "שנה ה'", "שנה ו'"];
const SEMESTER_OPTIONS = ["סמסטר א'", "סמסטר ב'"];

export default function NewCourseForm({ onCreated }: NewCourseFormProps) {
  const [form, setForm] = useState<NewCoursePayload>({
    name: "",
    shortName: "",
    yearLabel: "",
    semesterLabel: "",
    courseCode: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange =
    (field: keyof NewCoursePayload) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.yearLabel || !form.semesterLabel) {
      setError("חובה למלא שם קורס, שנה וסמסטר.");
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[NewCourseForm] save failed", res.status, text);
        throw new Error("save failed");
      }

      const data = (await res.json()) as { id?: string };

      setSuccess("הקורס נוצר בהצלחה! 🎉");
      setForm({
        name: "",
        shortName: "",
        yearLabel: "",
        semesterLabel: "",
        courseCode: "",
      });

      if (data?.id && onCreated) {
        onCreated(data.id);
      }
    } catch (e) {
      console.warn("[NewCourseForm] error", e);
      setError("שמירת הקורס נכשלה. נסו שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 text-sm max-w-lg"
      dir="rtl"
    >
      <div>
        <label className="block mb-1 font-medium">שם הקורס *</label>
        <input
          type="text"
        className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
          placeholder="למשל: אנטומיה א'"
          value={form.name}
          onChange={handleChange("name")}
        />
      </div>

      <div>
        <label className="block mb-1">שם קצר (לא חובה)</label>
        <input
          type="text"
className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
          placeholder="למשל: אנטומיה"
          value={form.shortName}
          onChange={handleChange("shortName")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block mb-1">שנה *</label>
          <select
        className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
                     value={form.yearLabel}
            onChange={handleChange("yearLabel")}
          >
            <option value="">בחר/י שנה…</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">סמסטר *</label>
          <select
            className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
            value={form.semesterLabel}
            onChange={handleChange("semesterLabel")}
          >
            <option value="">בחר/י סמסטר…</option>
            {SEMESTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block mb-1">קוד קורס (לא חובה)</label>
        <input
          type="text"
         className="w-full border bg-white
          rounded-2xl px-3 py-2 text-sm 
          border-neutral-300 
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:border-blue-500
           dark: text-black
          dark:bg-slate-400 border-slate-400"
          placeholder="למשל: 0123-4567"
          value={form.courseCode}
          onChange={handleChange("courseCode")}
        />
      </div>

      {error && <div className="text-xs text-red-500">{error}</div>}
      {success && <div className="text-xs text-green-600">{success}</div>}

      <button
        type="submit"
        disabled={saving}
        className="
          border rounded-2xl px-4 py-2 text-sm
          bg-blue-600 text-white
          hover:bg-blue-700
          disabled:opacity-60 disabled:cursor-not-allowed
          dark: border-blue-600
          cursor-pointer
        "
      >
        {saving ? "שומר…" : "שמירת קורס חדש"}
      </button>
    </form>
  );
}
