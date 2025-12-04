// client/src/routes/EditCourseRoute.tsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ALL_COURSES, type Course, type AssessmentItem } from "../data/years";

import {
  IMG_DRIVE,
  IMG_PDF,
  IMG_WHATSAPP,
  IMG_MOODLE,
  IMG_NET,
} from "../constants/icons";

type CourseContent = Course & {
  [key: string]: any;
};

type ExternalMaterial = {
  label: string;
  href: string;
  icon?: string;
};

export default function EditCourseRoute() {
  const { id } = useParams();
  const nav = useNavigate();

  const baseCourse = ALL_COURSES.find((c) => c.id === id) || null;

  const [content, setContent] = useState<CourseContent | null>(baseCourse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // מצב שמירת אוטומטית
  const [autoStatus, setAutoStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const autoTimerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // טעינה ראשונית מהשרת
  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/admin/course-content/${id}`, {
          credentials: "include",
        });
        if (!res.ok) {
          setContent(baseCourse);
          setLoading(false);
          loadedRef.current = true;
          return;
        }
        const data = await res.json();
        if (data.exists && data.content) {
          setContent(data.content as CourseContent);
        } else {
          setContent(baseCourse);
        }
      } catch (e) {
        console.warn("[EditCourseRoute] failed to load content", e);
        setContent(baseCourse);
      } finally {
        setLoading(false);
        loadedRef.current = true;
      }
    })();
  }, [id, baseCourse]);

  // שמירה ידנית
  const manualSave = async () => {
    if (!id || !content) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/course-content/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
        credentials: "include",
      });
      if (!res.ok) throw new Error("save failed");
      await res.json();
      alert("נשמר בהצלחה!");
    } catch (e) {
      console.warn("[EditCourseRoute] save failed", e);
      alert("שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  // autosave עם debounce
  useEffect(() => {
    if (!id || !content) return;
    if (!loadedRef.current) return;

    setAutoStatus("saving");
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
    }

    autoTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/course-content/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(content),
          credentials: "include",
        });
        if (!res.ok) throw new Error("autosave failed");
        await res.json();
        setAutoStatus("saved");
      } catch (err) {
        console.warn("[EditCourseRoute] autosave failed", err);
        setAutoStatus("error");
      }
    }, 1200);

    return () => {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current);
      }
    };
  }, [id, content]);

  // ------- helpers לעריכת arrays -------

  const updateArrayItem = (
    field: "assignments" | "exams",
    index: number,
    key: keyof AssessmentItem,
    value: string
  ) => {
    if (!content) return;
    const arr: AssessmentItem[] = [...(content[field] || [])];
    arr[index] = {
      ...arr[index],
      [key]: value,
    };
    setContent({
      ...content,
      [field]: arr,
    });
  };

  const addArrayItem = (field: "assignments" | "exams") => {
    if (!content) return;
    const arr: AssessmentItem[] = [...(content[field] || [])];
    arr.push({ title: "", date: "", weight: "", notes: "" });
    setContent({
      ...content,
      [field]: arr,
    });
  };

  const removeArrayItem = (field: "assignments" | "exams", index: number) => {
    if (!content) return;
    const arr: AssessmentItem[] = [...(content[field] || [])];
    arr.splice(index, 1);
    setContent({
      ...content,
      [field]: arr,
    });
  };

  const updateExternalItem = (
    index: number,
    key: keyof ExternalMaterial,
    value: string
  ) => {
    if (!content) return;
    const arr: ExternalMaterial[] = [...(content.externalMaterials || [])];
    arr[index] = {
      ...arr[index],
      [key]: value,
    };
    setContent({
      ...content,
      externalMaterials: arr,
    });
  };

  const addExternalItem = () => {
    if (!content) return;
    const arr: ExternalMaterial[] = [...(content.externalMaterials || [])];
    arr.push({
      label: "",
      href: "",
      icon: IMG_NET,
    });
    setContent({
      ...content,
      externalMaterials: arr,
    });
  };

  const removeExternalItem = (index: number) => {
    if (!content) return;
    const arr: ExternalMaterial[] = [...(content.externalMaterials || [])];
    arr.splice(index, 1);
    setContent({
      ...content,
      externalMaterials: arr,
    });
  };

  const ICON_OPTIONS: { label: string; value: string }[] = [
    { label: "Drive", value: IMG_DRIVE },
    { label: "PDF", value: IMG_PDF },
    { label: "Moodle", value: IMG_MOODLE },
    { label: "WhatsApp", value: IMG_WHATSAPP },
    { label: "Chrome (For General Website)", value: IMG_NET },
  ];

  const sanitizeDate = (raw: string) => raw.replace(/[^0-9./-]/g, "");

  if (!id) {
    return <div className="p-4 text-sm">לא הועבר מזהה קורס.</div>;
  }

  if (loading || !content) {
    return <div className="p-4 text-sm">טוען נתוני קורס...</div>;
  }

  const assignments: AssessmentItem[] = content.assignments || [];
  const exams: AssessmentItem[] = content.exams || [];
  const links = content.links || {};
  const externalMaterials: ExternalMaterial[] =
    (content.externalMaterials as ExternalMaterial[]) || [];

  const handleSyllabusUpload = async (file: File) => {
    if (!id || !content) return;
    setUploadingSyllabus(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/admin/course-content/${id}/syllabus-upload`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("upload failed");
      const data = (await res.json()) as { url: string };

      setContent({
        ...content,
        syllabus: data.url,
      });
    } catch (e) {
      console.warn("[EditCourseRoute] syllabus upload failed", e);
      setUploadError("העלאת הקובץ נכשלה");
    } finally {
      setUploadingSyllabus(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 px-4">
      <h1 className="text-2xl font-semibold mb-1">
        עריכת קורס: {content.name}
      </h1>
      <p className="text-xs text-neutral-500 dark:text-slate-400 mb-4">
        מזהה קורס פנימי: <code>{id}</code>
      </p>

      <div className="space-y-6 text-sm">
        {/* פרטים בסיסיים */}
        <section
          className="
            border rounded-2xl p-4
            bg-neutral-50/60 border-neutral-200
            dark:bg-slate-900 dark:border-slate-700
          "
        >
          <h2 className="text-sm font-medium mb-3">פרטי קורס</h2>

          <label className="block mb-3">
            <span className="block mb-1">שם הקורס:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                dark:placeholder-slate-500
              "
              value={content.name || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  name: e.target.value,
                })
              }
            />
          </label>

          <label className="block mb-3">
            <span className="block mb-1">רכז/ת הקורס:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
              value={content.coordinator || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  coordinator: e.target.value,
                })
              }
            />
          </label>

          <label className="block mb-3">
            <span className="block mb-1">נציגי קורס:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
              value={content.reps || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  reps: e.target.value,
                })
              }
            />
          </label>

          <label className="block mb-3">
            <span className="block mb-1">מספר קורס:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
              value={content.courseNumber || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  courseNumber: e.target.value,
                })
              }
            />
          </label>

          <label className="block mb-3">
            <span className="block mb-1">הערה קצרה בלבד:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
              value={content.note || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  note: e.target.value,
                })
              }
            />
          </label>

          <label className="block mb-3">
            <span className="block mb-1">מה היה בשבוע האחרון?</span>
            <textarea
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
              value={content.whatwas || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  whatwas: e.target.value,
                })
              }
            />
          </label>

          <label className="block">
            <span className="block mb-1">מה יהיה בהמשך?</span>
            <textarea
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
              value={content.whatwill || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  whatwill: e.target.value,
                })
              }
            />
          </label>
        </section>

        {/* קישורים */}
        <section
          className="
            border rounded-2xl p-4
            bg-white border-neutral-200
            dark:bg-slate-900 dark:border-slate-700
          "
        >
          <h2 className="text-sm font-medium mb-3">קישורים</h2>

          <label className="block mb-3">
            <span className="block mb-1">סילבוס (PDF / קישור):</span>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="
                  border rounded-xl px-3 py-2 w-full sm:flex-1
                  border-neutral-200 bg-white text-neutral-900
                  dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                "
                value={content.syllabus || ""}
                onChange={(e) =>
                  setContent({
                    ...content,
                    syllabus: e.target.value,
                  })
                }
                placeholder="https://... או /uploads/syllabus/..."
              />

              <label
                className="
                  text-xs border rounded-xl px-3 py-2 cursor-pointer
                  hover:bg-neutral-50
                  border-neutral-200 bg-white
                  flex items-center gap-1
                  dark:border-slate-700 dark:bg-slate-900
                  dark:hover:bg-slate-800
                "
              >
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

          <label className="block mb-3">
            <span className="block mb-1">קישור לדרייב הקורס:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
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

          <label className="block mb-3">
            <span className="block mb-1">קישור למודל:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
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

          <label className="block">
            <span className="block mb-1">קבוצת וואטסאפ:</span>
            <input
              className="
                border rounded-xl px-3 py-2 w-full
                border-neutral-200 bg-white text-neutral-900
                dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
              "
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
        <section
          className="
            mt-2 border rounded-2xl p-4
            bg-white border-neutral-200
            dark:bg-slate-900 dark:border-slate-700
          "
        >
          <h2 className="text-sm font-medium mb-2">
            חומרים חיצוניים (externalMaterials)
          </h2>

          {externalMaterials.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
              אין חומרים חיצוניים מוגדרים. אפשר להוסיף.
            </div>
          )}

          <div className="space-y-3">
            {externalMaterials.map((m, idx) => (
              <div
                key={idx}
                className="
                  border rounded-xl p-3 text-xs flex flex-col gap-2
                  bg-neutral-50/80 border-neutral-200
                  dark:bg-slate-950/40 dark:border-slate-700
                "
              >
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className="
                      border rounded-lg px-2 py-1 flex-1 min-w-[140px]
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
                    placeholder="שם / תיאור הקישור"
                    value={m.label || ""}
                    onChange={(e) =>
                      updateExternalItem(idx, "label", e.target.value)
                    }
                  />
                  <input
                    className="
                      border rounded-lg px-2 py-1 flex-[2] min-w-[180px]
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
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
                      className="
                        border rounded-lg px-2 py-1 text-[11px]
                        border-neutral-200 bg-white text-neutral-900
                        dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                      "
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
            className="
              mt-3 text-xs border rounded-xl px-3 py-1
              border-neutral-200 bg-white hover:bg-neutral-50
              dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800
            "
          >
            + הוספת חומר חיצוני
          </button>
        </section>

        {/* מטלות / עבודות */}
        <section
          className="
            mt-2 border rounded-2xl p-4
            bg-neutral-50/60 border-neutral-200
            dark:bg-slate-900 dark:border-slate-700
          "
        >
          <h2 className="text-sm font-medium mb-2">
            מטלות / עבודות (assignments)
          </h2>

          {assignments.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
              אין מטלות מוגדרות. אפשר להוסיף.
            </div>
          )}

          <div className="space-y-3">
            {assignments.map((a, idx) => (
              <div
                key={idx}
                className="
                  border rounded-xl p-3 text-xs flex flex-col gap-1
                  bg-white border-neutral-200
                  dark:bg-slate-950/40 dark:border-slate-700
                "
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    className="
                      border rounded-lg px-2 py-1 flex-1 min-w-[140px]
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
                    placeholder="שם המטלה"
                    value={a.title || ""}
                    onChange={(e) =>
                      updateArrayItem("assignments", idx, "title", e.target.value)
                    }
                  />
                  <input
                    type="date"
                    className="
                      border rounded-lg px-2 py-1 w-32
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
                    placeholder="תאריך"
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
                    className="
                      border rounded-lg px-2 py-1 w-24
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
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
                <textarea
                  className="
                    border rounded-lg px-2 py-1 w-full
                    border-neutral-200 bg-white text-neutral-900
                    dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                  "
                  placeholder="הערות (אופציונלי)"
                  value={a.notes || ""}
                  onChange={(e) =>
                    updateArrayItem(
                      "assignments",
                      idx,
                      "notes",
                      e.target.value
                    )
                  }
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
            className="
              mt-3 text-xs border rounded-xl px-3 py-1
              border-neutral-200 bg-white hover:bg-neutral-50
              dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800
            "
          >
            + הוספת מטלה
          </button>
        </section>

        {/* בחנים / מבחנים */}
        <section
          className="
            mt-2 border rounded-2xl p-4
            bg-neutral-50/60 border-neutral-200
            dark:bg-slate-900 dark:border-slate-700
          "
        >
          <h2 className="text-sm font-medium mb-2">בחנים / מבחנים (exams)</h2>

          {exams.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 mb-2">
              אין בחנים/מבחנים מוגדרים. אפשר להוסיף.
            </div>
          )}

          <div className="space-y-3">
            {exams.map((ex, idx) => (
              <div
                key={idx}
                className="
                  border rounded-xl p-3 text-xs flex flex-col gap-1
                  bg-white border-neutral-200
                  dark:bg-slate-950/40 dark:border-slate-700
                "
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    className="
                      border rounded-lg px-2 py-1 flex-1 min-w-[140px]
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
                    placeholder="שם הבחינה"
                    value={ex.title || ""}
                    onChange={(e) =>
                      updateArrayItem("exams", idx, "title", e.target.value)
                    }
                  />
                  <input
                    type="date"
                    className="
                      border rounded-lg px-2 py-1 w-32
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
                    placeholder="תאריך"
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
                    className="
                      border rounded-lg px-2 py-1 w-24
                      border-neutral-200 bg-white text-neutral-900
                      dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                    "
                    placeholder="משקל"
                    value={ex.weight || ""}
                    onChange={(e) =>
                      updateArrayItem("exams", idx, "weight", e.target.value)
                    }
                  />
                </div>
                <textarea
                  className="
                    border rounded-lg px-2 py-1 w-full
                    border-neutral-200 bg-white text-neutral-900
                    dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100
                  "
                  placeholder="הערות (אופציונלי)"
                  value={ex.notes || ""}
                  onChange={(e) =>
                    updateArrayItem("exams", idx, "notes", e.target.value)
                  }
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
            className="
              mt-3 text-xs border rounded-xl px-3 py-1
              border-neutral-200 bg-white hover:bg-neutral-50
              dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800
            "
          >
            + הוספת בחינה
          </button>
        </section>

        {/* כפתורי שמירה וכו' */}
        <div className="flex flex-wrap gap-3 items-center mt-4">
          <button
            type="button"
            onClick={manualSave}
            disabled={saving}
            className="
              border rounded-xl px-4 py-2 text-sm
              border-neutral-200 bg-white hover:bg-neutral-50
              disabled:opacity-60
              dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800
              dark:text-slate-100
            "
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
