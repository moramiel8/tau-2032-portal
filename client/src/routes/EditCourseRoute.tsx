// client/src/routes/EditCourseRoute.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ALL_COURSES, type Course, type AssessmentItem } from "../data/years";

import RichTextEditor from "../components/RichTextEditor";

import {
  IMG_DRIVE,
  IMG_PDF,
  IMG_WHATSAPP,
  IMG_MOODLE,
  IMG_NET,
} from "../constants/icons";

// TODO: WYSIWYG maybe?

/* -------------------------------------------------
TYPES
---------------------------------------------------*/

type VaadUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type ExternalMaterial = {
  label: string;
  href: string;
  icon?: string;
};

/**
 * CourseContent = גרסה ״נוחה״ לעבודה
 * שבה reps תמיד string[]
 * ושאר השדות המערכיים/אובייקטים תמיד קיימים.
 */
type CourseContent = Omit<
  Course,
  "reps" | "assignments" | "exams" | "labs" | "externalMaterials" | "links"
> & {
  reps: string[];
  assignments: AssessmentItem[];
  exams: AssessmentItem[];
  labs: AssessmentItem[];
  externalMaterials: ExternalMaterial[];
  links: { drive?: string; moodle?: string; whatsapp?: string };
};

/* -------------------------------------------------
NORMALIZATION HELPERS
---------------------------------------------------*/

function normalizeReps(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") return [raw];
  return [];
}

function normalizeLoadedContent(raw: any): CourseContent {
  return {
    ...raw,
    reps: normalizeReps(raw.reps),
    externalMaterials: Array.isArray(raw.externalMaterials)
      ? raw.externalMaterials
      : [],
    assignments: Array.isArray(raw.assignments) ? raw.assignments : [],
    exams: Array.isArray(raw.exams) ? raw.exams : [],
    labs: Array.isArray(raw.labs) ? raw.labs : [],
    links: raw.links && typeof raw.links === "object" ? raw.links : {},
  };
}

function normalizeBaseCourse(c: Course | null): CourseContent | null {
  if (!c) return null;
  return {
    ...c,
    reps: normalizeReps(c.reps),
    externalMaterials: Array.isArray(c.externalMaterials)
      ? c.externalMaterials
      : [],
    assignments: Array.isArray(c.assignments) ? c.assignments : [],
    exams: Array.isArray(c.exams) ? c.exams : [],
    labs: Array.isArray(c.labs) ? c.labs : [],
    links: c.links && typeof c.links === "object" ? c.links : {},
  };
}

/* ===============================================
ICON OPTIONS
===============================================*/
const ICON_OPTIONS = [
  { label: "Drive", value: IMG_DRIVE },
  { label: "PDF", value: IMG_PDF },
  { label: "Moodle", value: IMG_MOODLE },
  { label: "WhatsApp", value: IMG_WHATSAPP },
  { label: "General Website", value: IMG_NET },
];

/* ===============================================
UTILITY FOR DATE CLEANUP
===============================================*/
const sanitizeDate = (raw: string) => raw.replace(/[^0-9./-]/g, "");

/* -------------------------------------------------
COMPONENT
---------------------------------------------------*/

export default function EditCourseRoute() {
  const { id } = useParams();
  const nav = useNavigate();

  const baseCourse: CourseContent | null = useMemo(
    () =>
      normalizeBaseCourse(ALL_COURSES.find((c) => c.id === id) || null),
    [id]
  );

  const [content, setContent] = useState<CourseContent | null>(baseCourse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);
  const [repSearch, setRepSearch] = useState("");

  const [autoStatus, setAutoStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const autoTimerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* -------------------------------------------------
  LOAD COURSE CONTENT FROM SERVER
  ---------------------------------------------------*/
  useEffect(() => {
    (async () => {
      if (!id) return;

      try {
        const res = await fetch(`/api/admin/course-content/${id}`, {
          credentials: "include",
        });

        if (!res.ok) {
          setContent(baseCourse);
        } else {
          const data = await res.json();
          if (data.exists && data.content) {
            setContent(normalizeLoadedContent(data.content));
          } else {
            setContent(baseCourse);
          }
        }
      } catch {
        setContent(baseCourse);
      } finally {
        setLoading(false);
        loadedRef.current = true;
      }
    })();
  }, [id, baseCourse]);

  /* -------------------------------------------------
  AUTO SAVE (DEBOUNCE)
  ---------------------------------------------------*/
  useEffect(() => {
    if (!id || !content) return;
    if (!loadedRef.current) return;

    setAutoStatus("saving");
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    autoTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/course-content/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(content),
        });

        if (!res.ok) throw new Error("autosave fail");

        setAutoStatus("saved");
      } catch {
        setAutoStatus("error");
      }
    }, 1200);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [id, content]);

  /* -------------------------------------------------
  MANUAL SAVE
  ---------------------------------------------------*/
  const manualSave = async () => {
    if (!id || !content) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/course-content/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(content),
      });

      if (!res.ok) throw new Error("save failed");

      alert("נשמר בהצלחה!");
    } catch {
      alert("שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------
  LOAD VAAD USERS
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
      } catch {
        // אפשר להוסיף לוג במקרה הצורך
      }
    })();
  }, []);

  /* -------------------------------------------------
  FILTERED REPRESENTATIVES
  ---------------------------------------------------*/
  const filteredVaadUsers = useMemo(() => {
    const q = repSearch.toLowerCase().trim();
    if (!q) return vaadUsers;

    return vaadUsers.filter((u) => {
      const name = (u.displayName || "").toLowerCase();
      const email = u.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [vaadUsers, repSearch]);

  /* -------------------------------------------------
  SYLLABUS UPLOAD
  ---------------------------------------------------*/
  const handleSyllabusUpload = async (file: File) => {
    if (!id || !content) return;

    setUploadingSyllabus(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(
        `/api/admin/course-content/${id}/syllabus-upload`,
        {
          method: "POST",
          body: fd,
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("upload failed");

      const data = await res.json();

      setContent({
        ...content,
        syllabus: data.url,
      });
    } catch {
      setUploadError("העלאה נכשלה");
    } finally {
      setUploadingSyllabus(false);
    }
  };

  /* -------------------------------------------------
  UPDATE HELPERS
  ---------------------------------------------------*/
  function updateArrayItem(
    field: "assignments" | "exams" | "labs",
    index: number,
    key: keyof AssessmentItem,
    value: string
  ) {
    const arr = [...content![field]];
    arr[index] = { ...arr[index], [key]: value };
    setContent({ ...content!, [field]: arr });
  }

  function addArrayItem(field: "assignments" | "exams" | "labs") {
    const arr = [...content![field]];
    arr.push({ title: "", date: "", weight: "", notes: "" });
    setContent({ ...content!, [field]: arr });
  }

  function removeArrayItem(
    field: "assignments" | "exams" | "labs",
    index: number
  ) {
    const arr = [...content![field]];
    arr.splice(index, 1);
    setContent({ ...content!, [field]: arr });
  }

  function updateExternalItem(
    index: number,
    key: keyof ExternalMaterial,
    value: string
  ) {
    const arr = [...content!.externalMaterials];
    arr[index] = { ...arr[index], [key]: value };
    setContent({ ...content!, externalMaterials: arr });
  }

  function addExternalItem() {
    const arr = [...content!.externalMaterials];
    arr.push({ label: "", href: "", icon: IMG_NET });
    setContent({ ...content!, externalMaterials: arr });
  }

  function removeExternalItem(index: number) {
    const arr = [...content!.externalMaterials];
    arr.splice(index, 1);
    setContent({ ...content!, externalMaterials: arr });
  }

  /* -------------------------------------------------
  RENDER
  ---------------------------------------------------*/
  if (loading || !content) {
    return <div className="p-4">טוען נתוני קורס…</div>;
  }

  const reps = content.reps;
  const assignments = content.assignments;
  const exams = content.exams;
  const labs = content.labs;
  const externalMaterials = content.externalMaterials;
  const links = content.links || {};

  return (
    <div className="max-w-3xl mx-auto pb-12 px-4">
      <h1 className="text-2xl font-semibold mb-1 dark:text-slate-100">
        עריכת קורס: {content.name}
      </h1>

      <p className="text-xs text-neutral-500 dark:text-slate-400 mb-4">
        מזהה קורס פנימי: <code>{id}</code>
      </p>

      <div className="space-y-6 text-sm dark:text-slate-200">
        {/* פרטי קורס */}
        <section className="border rounded-2xl p-4 bg-neutral-50 dark:bg-slate-900 border-neutral-200 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-3 dark:text-slate-100">
            פרטי קורס
          </h2>

          {/* שם הקורס */}
          <label className="block mb-3">
            <span className="block mb-1">שם הקורס:</span>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700 text-neutral-900 dark:text-slate-100"
              value={content.name}
              onChange={(e) => setContent({ ...content, name: e.target.value })}
            />
          </label>

          {/* רכז */}
          <label className="block mb-3">
            <span className="block mb-1">רכז/ת הקורס:</span>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700"
              value={content.coordinator || ""}
              onChange={(e) =>
                setContent({ ...content, coordinator: e.target.value })
              }
            />
          </label>

          {/* נציגי קורס */}
          <label className="block mb-3">
            <span className="block mb-1">נציגי קורס:</span>

            {/* Selected reps */}
            {reps.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
           {reps.map((email, idx) => {
  const user = vaadUsers.find((u) => u.email === email);
  const label = user?.displayName
    ? `${user.displayName} (${email})`
    : email;

  return (
    <span key={email} className="inline-block" dir="rtl">
      {label}
      {idx < reps.length - 1 && <span> ; </span>}
    </span>
  );
})}
              </div>
            )}

            {/* Search */}
            <input
              className="border rounded-xl px-3 py-2 w-full mb-2 text-sm bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700"
              placeholder="חיפוש לפי שם / מייל"
              value={repSearch}
              onChange={(e) => setRepSearch(e.target.value)}
            />

            {/* Results */}
            <div
              className="
                max-h-40 overflow-y-auto border rounded-xl p-2 text-xs
                bg-neutral-50 border-neutral-200
                dark:bg-slate-800 dark:border-slate-700
              "
            >
              {filteredVaadUsers.length === 0 ? (
                <div className="text-neutral-400">לא נמצאו תוצאות.</div>
              ) : (
                filteredVaadUsers.map((u) => {
                  const selected = reps.includes(u.email);
                  const label = u.displayName
                    ? `${u.displayName} (${u.email})`
                    : u.email;

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setContent({
                            ...content,
                            reps: reps.filter((e) => e !== u.email),
                          });
                        } else {
                          setContent({ ...content, reps: [...reps, u.email] });
                        }
                      }}
                      className={
                        "w-full text-right px-2 py-1 rounded-lg mb-1 border border-transparent " +
                        (selected
                          ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-50 dark:border-blue-400"
                          : "hover:bg-neutral-100 dark:hover:bg-slate-700")
                      }
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>
          </label>

          {/* מספר קורס */}
          <label className="block mb-3">
            <span className="block mb-1">מספר קורס:</span>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700"
              value={content.courseNumber || ""}
              onChange={(e) =>
                setContent({ ...content, courseNumber: e.target.value })
              }
            />
          </label>

          {/* הערה */}
          <label className="block mb-3">
            <span className="block mb-1">הערה קצרה:</span>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-950 border-neutral-300 dark:border-slate-700"
              value={content.note || ""}
              onChange={(e) => setContent({ ...content, note: e.target.value })}
            />
          </label>

         {/* מה היה */}
<label className="block mb-3">
  <span className="block mb-1">מה היה בשבוע האחרון?</span>

  <RichTextEditor
    value={content.whatwas || ""}                // אותו סטייט כמו קודם
    onChange={(value) =>
      setContent({ ...content, whatwas: value }) // שומר את ה-HTML שחוזר מה-editor
    }
    placeholder="מה היה בשבוע האחרון…"
    className="mt-2"
  />
</label>

          {/* מה יהיה */}
          <label className="block mb-1">
            <span className="block mb-1">מה יהיה בהמשך?</span>
              <RichTextEditor
              value={content.whatwill || ""}
              onChange={(value) =>
                setContent({ ...content, whatwill: value })
              }
            />
          </label>
        </section>

        {/* קישורים */}
        <section className="border rounded-2xl p-4 bg-white border-neutral-200 dark:bg-slate-900 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-3 dark:text-slate-100">
            קישורים
          </h2>

          {/* סילבוס */}
          <label className="block mb-3">
            <span className="block mb-1">סילבוס (PDF / קישור):</span>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="border rounded-xl px-3 py-2 w-full sm:flex-1 border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={content.syllabus || ""}
                onChange={(e) =>
                  setContent({
                    ...content,
                    syllabus: e.target.value,
                  })
                }
                placeholder="https://... או /uploads/syllabus/..."
              />

              <label className="text-xs border rounded-xl px-3 py-2 cursor-pointer hover:bg-neutral-50 border-neutral-200 bg-white flex items-center gap-1 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                📎 העלאת PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleSyllabusUpload(file);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>

            {uploadingSyllabus && (
              <div className="text-[11px] text-neutral-500 dark:text-slate-400 mt-1">
                מעלה את הקובץ… ⏳
              </div>
            )}
            {uploadError && (
              <div className="text-[11px] text-red-600 mt-1">
                {uploadError}
              </div>
            )}
            {content.syllabus && content.syllabus.startsWith("/uploads/") && (
              <div className="text-[11px] text-green-700 mt-1">
                קובץ סילבוס הועלה ונשמר
              </div>
            )}
          </label>

          {/* Drive */}
          <label className="block mb-3">
            <span className="block mb-1">קישור לדרייב הקורס:</span>
            <input
              className="border rounded-xl px-3 py-2 w-full border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={links.drive || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  links: {
                    ...links,
                    drive: e.target.value,
                  },
                })
              }
              placeholder="https://drive.google.com/..."
            />
          </label>

          {/* Moodle */}
          <label className="block mb-3">
            <span className="block mb-1">קישור למודל:</span>
            <input
              className="border rounded-xl px-3 py-2 w-full border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={links.moodle || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  links: {
                    ...links,
                    moodle: e.target.value,
                  },
                })
              }
              placeholder="https://moodle.tau.ac.il/..."
            />
          </label>

          {/* WhatsApp */}
          <label className="block mb-3">
            <span className="block mb-1">קבוצת וואטסאפ:</span>
            <input
              className="border rounded-xl px-3 py-2 w-full border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={links.whatsapp || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  links: {
                    ...links,
                    whatsapp: e.target.value,
                  },
                })
              }
              placeholder="https://chat.whatsapp.com/..."
            />
          </label>
        </section>

        {/* חומרים חיצוניים */}
        <section className="mt-2 border rounded-2xl p-4 bg-white border-neutral-200 dark:bg-slate-900 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-2 dark:text-slate-100">
            חומרים חיצוניים (externalMaterials)
          </h2>

          {externalMaterials.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
              אין חומרים חיצוניים מוגדרים. אפשר להוסיף.
            </div>
          )}

          <div className="space-y-3">
            {externalMaterials.map((m: ExternalMaterial, idx: number) => (
              <div
                key={idx}
                className="border rounded-xl p-3 text-xs flex flex-col gap-2 bg-neutral-50/80 border-neutral-200 dark:bg-slate-950/40 dark:border-slate-700"
              >
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className="border rounded-lg px-2 py-1 flex-1 min-w-[140px] border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="שם / תיאור הקישור"
                    value={m.label || ""}
                    onChange={(e) =>
                      updateExternalItem(idx, "label", e.target.value)
                    }
                  />
                  <input
                    className="border rounded-lg px-2 py-1 flex-[2] min-w-[180px] border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="https://..."
                    value={m.href || ""}
                    onChange={(e) =>
                      updateExternalItem(idx, "href", e.target.value)
                    }
                  />

                  <div className="flex items-center gap-1">
                    {m.icon && (
                      <img
                        src={m.icon}
                        alt=""
                        className="w-4 h-4 border rounded-full border-neutral-200 dark:border-slate-600"
                      />
                    )}
                    <select
                      className="border rounded-lg px-2 py-1 text-[11px] border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      value={m.icon || ""}
                      onChange={(e) =>
                        updateExternalItem(idx, "icon", e.target.value)
                      }
                    >
                      <option value="">ללא אייקון</option>
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeExternalItem(idx)}
                  className="self-start text-[11px] text-red-600 underline"
                >
                  הסרת חומר
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addExternalItem}
            className="mt-3 text-xs border rounded-xl px-3 py-1 border-neutral-200 bg-white hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            + הוספת חומר חיצוני
          </button>
        </section>

        {/* מטלות / עבודות */}
        <section className="mt-2 border rounded-2xl p-4 bg-neutral-50/60 border-neutral-200 dark:bg-slate-900 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-2 dark:text-slate-100">
            מטלות / עבודות (assignments)
          </h2>

          {assignments.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
              אין מטלות מוגדרות. אפשר להוסיף.
            </div>
          )}

          <div className="space-y-3">
            {assignments.map((a: AssessmentItem, idx: number) => (
              <div
                key={idx}
                className="border rounded-xl p-3 text-xs flex flex-col gap-1 bg-white border-neutral-200 dark:bg-slate-950/40 dark:border-slate-700"
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    className="border rounded-lg px-2 py-1 flex-1 min-w-[140px] border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="שם המטלה"
                    value={a.title || ""}
                    onChange={(e) =>
                      updateArrayItem(
                        "assignments",
                        idx,
                        "title",
                        e.target.value
                      )
                    }
                  />
                  <input
                    type="date"
                    className="border rounded-lg px-2 py-1 w-32 border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    value={a.date || ""}
                    onChange={(e) =>
                      updateArrayItem(
                        "assignments",
                        idx,
                        "date",
                        sanitizeDate(e.target.value)
                      )
                    }
                  />
                  <input
                    className="border rounded-lg px-2 py-1 w-24 border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="משקל"
                    value={a.weight || ""}
                    onChange={(e) =>
                      updateArrayItem(
                        "assignments",
                        idx,
                        "weight",
                        e.target.value
                      )
                    }
                  />
                </div>



<RichTextEditor
  value={a.notes || ""}
  onChange={(value) => updateArrayItem("assignments", idx, "notes", value)}
  placeholder="הערות (אופציונלי)"
  className="mt-2"
/>

      

                <button
                  type="button"
                  onClick={() => removeArrayItem("assignments", idx)}
                  className="self-start text-[11px] text-red-600 underline mt-1"
                >
                  הסרת מטלה
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addArrayItem("assignments")}
            className="mt-3 text-xs border rounded-xl px-3 py-1 border-neutral-200 bg-white hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            + הוספת מטלה
          </button>
        </section>

        {/* בחנים / מבחנים */}
        <section className="mt-2 border rounded-2xl p-4 bg-neutral-50/60 border-neutral-200 dark:bg-slate-900 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-2 dark:text-slate-100">
            בחנים / מבחנים (exams)
          </h2>

          {exams.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
              אין בחנים/מבחנים מוגדרים. אפשר להוסיף.
            </div>
          )}

          <div className="space-y-3">
            {exams.map((ex: AssessmentItem, idx: number) => (
              <div
                key={idx}
                className="border rounded-xl p-3 text-xs flex flex-col gap-1 bg-white border-neutral-200 dark:bg-slate-950/40 dark:border-slate-700"
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    className="border rounded-lg px-2 py-1 flex-1 min-w-[140px] border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="שם הבחינה"
                    value={ex.title || ""}
                    onChange={(e) =>
                      updateArrayItem("exams", idx, "title", e.target.value)
                    }
                  />
                  <input
                    type="date"
                    className="border rounded-lg px-2 py-1 w-32 border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    value={ex.date || ""}
                    onChange={(e) =>
                      updateArrayItem(
                        "exams",
                        idx,
                        "date",
                        sanitizeDate(e.target.value)
                      )
                    }
                  />
                  <input
                    className="border rounded-lg px-2 py-1 w-24 border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="משקל"
                    value={ex.weight || ""}
                    onChange={(e) =>
                      updateArrayItem("exams", idx, "weight", e.target.value)
                    }
                  />
                </div>



              <RichTextEditor
  value={ex.notes || ""}
  onChange={(value) => updateArrayItem("exams", idx, "notes", value)}
  placeholder="הערות (אופציונלי)"
  className="mt-2"
/>


                <button
                  type="button"
                  onClick={() => removeArrayItem("exams", idx)}
                  className="self-start text-[11px] text-red-600 underline mt-1"
                >
                  הסרת בחינה
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addArrayItem("exams")}
            className="mt-3 text-xs border rounded-xl px-3 py-1 border-neutral-200 bg-white hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            + הוספת בחינה
          </button>
        </section>

        {/* מעבדות */}
        <section className="mt-2 border rounded-2xl p-4 bg-neutral-50/60 border-neutral-200 dark:bg-slate-900 dark:border-slate-700">
          <h2 className="text-sm font-medium mb-2 dark:text-slate-100">
            מעבדות (labs)
          </h2>

          {labs.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
              אין מעבדות מוגדרות. אפשר להוסיף.
            </div>
          )}

          <div className="space-y-3">
            {labs.map((lab: AssessmentItem, idx: number) => (
              <div
                key={idx}
                className="border rounded-xl p-3 text-xs flex flex-col gap-1 bg-white border-neutral-200 dark:bg-slate-950/40 dark:border-slate-700"
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    className="border rounded-lg px-2 py-1 flex-1 min-w-[140px] border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="שם המעבדה"
                    value={lab.title || ""}
                    onChange={(e) =>
                      updateArrayItem("labs", idx, "title", e.target.value)
                    }
                  />
                  <input
                    type="date"
                    className="border rounded-lg px-2 py-1 w-32 border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    value={lab.date || ""}
                    onChange={(e) =>
                      updateArrayItem(
                        "labs",
                        idx,
                        "date",
                        sanitizeDate(e.target.value)
                      )
                    }
                  />
                  <input
                    className="border rounded-lg px-2 py-1 w-24 border-neutral-200 bg-white text-neutral-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="משקל"
                    value={lab.weight || ""}
                    onChange={(e) =>
                      updateArrayItem("labs", idx, "weight", e.target.value)
                    }
                  />
                </div>


<RichTextEditor
  value={lab.notes || ""}
  onChange={(value) => updateArrayItem("labs", idx, "notes", value)}
  placeholder="הערות (אופציונלי)"
  className="mt-2"
/>

                <button
                  type="button"
                  onClick={() => removeArrayItem("labs", idx)}
                  className="self-start text-[11px] text-red-600 underline mt-1"
                >
                  הסרת מעבדה
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addArrayItem("labs")}
            className="mt-3 text-xs border rounded-xl px-3 py-1 border-neutral-200 bg-white hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            + הוספת מעבדה
          </button>
        </section>


        {/* כפתורי שמירה */}
        <div className="flex flex-wrap gap-3 items-center mt-4">
          <button
            type="button"
            onClick={manualSave}
            disabled={saving}
            className="border rounded-xl px-4 py-2 text-sm border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100"
          >
            {saving ? "שומר..." : "שמירת שינויים ידנית"}
          </button>

          <button
            type="button"
            onClick={() => nav("/admin/courses")}
            className="text-xs text-neutral-500 dark:text-slate-400 underline"
          >
            ביטול / חזרה לרשימת הקורסים
          </button>

          <div className="text-[11px] text-neutral-500 dark:text-slate-400 ms-auto">
            {autoStatus === "saving" && "שומר אוטומטית..."}
            {autoStatus === "saved" && "נשמר אוטומטית לפני רגע"}
            {autoStatus === "error" &&
              "שגיאה בשמירה האוטומטית (השינויים עלולים שלא להישמר)"}
          </div>
        </div>
      </div>
    </div>
  );
}
