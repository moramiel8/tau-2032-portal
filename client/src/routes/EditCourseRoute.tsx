import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ALL_COURSES, type Course, type AssessmentItem } from "../data/years";

type CourseContent = Course & {
  [key: string]: any;
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

  // ------- autosave (עם debounce) -------
  useEffect(() => {
    if (!id || !content) return;
    if (!loadedRef.current) return; // לא לשמור בזמן הטעינה הראשונית

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

  // ------- helpers לעריכת arrays של assignments / exams -------

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

  // רק ספרות + ./- בתאריך
  const sanitizeDate = (raw: string) => raw.replace(/[^0-9./-]/g, "");

  if (!id) {
    return <div className="p-4">לא הועבר מזהה קורס.</div>;
  }

  if (loading || !content) {
    return <div className="p-4">טוען נתוני קורס...</div>;
  }

  const assignments: AssessmentItem[] = content.assignments || [];
  const exams: AssessmentItem[] = content.exams || [];

  const links = content.links || {};

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
      // autosave כבר ידאג לשמור ב־DB
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
      <p className="text-xs text-neutral-500 mb-4">
        מזהה קורס פנימי: <code>{id}</code>
      </p>

      <div className="space-y-6 text-sm">
        {/* פרטים בסיסיים */}
        <section className="border rounded-2xl p-4 bg-neutral-50/60">
          <h2 className="text-sm font-medium mb-3">פרטי קורס</h2>

          <label className="block mb-3">
            <span className="block mb-1">שם הקורס:</span>
            <input
              className="border rounded-xl px-3 py-2 w-full"
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
              className="border rounded-xl px-3 py-2 w-full"
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
            <span className="block mb-1">מספר קורס:</span>
            <input
              className="border rounded-xl px-3 py-2 w-full"
              value={content.courseNumber || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  courseNumber: e.target.value,
                })
              }
            />
          </label>

          <label className="block">
            <span className="block mb-1">הערה (טקסט חופשי):</span>
            <textarea
              className="border rounded-xl px-3 py-2 w-full min-h-[80px]"
              value={content.note || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  note: e.target.value,
                })
              }
            />
          </label>
        </section>

        {/* קישורים */}
        <section className="border rounded-2xl p-4 bg-white">
          <h2 className="text-sm font-medium mb-3">קישורים</h2>

          <label className="block mb-3">
            <span className="block mb-1">סילבוס (PDF / קישור):</span>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="border rounded-xl px-3 py-2 w-full sm:flex-1"
                value={content.syllabus || ""}
                onChange={(e) =>
                  setContent({
                    ...content,
                    syllabus: e.target.value,
                  })
                }
                placeholder="https://... או /uploads/syllabus/..."
              />

              <label className="text-xs border rounded-xl px-3 py-2 cursor-pointer hover:bg-neutral-50 flex items-center gap-1">
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
              <div className="text-[11px] text-neutral-500 mt-1">
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
              className="border rounded-xl px-3 py-2 w-full"
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
              className="border rounded-xl px-3 py-2 w-full"
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
              className="border rounded-xl px-3 py-2 w-full"
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

        {/* מטלות / עבודות */}
        {/* ... שאר הקומפוננטה ללא שינוי לוגי ... */}

        {/* כפתורי שמירה וכו' */}
        <div className="flex flex-wrap gap-3 items-center mt-4">
          <button
            type="button"
            onClick={manualSave}
            disabled={saving}
            className="border rounded-xl px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמירת שינויים ידנית"}
          </button>
          <button
            type="button"
            onClick={() => nav("/admin/courses")}
            className="text-xs text-neutral-500 underline"
          >
            ביטול / חזרה לרשימת הקורסים
          </button>

          <div className="text-[11px] text-neutral-500 ms-auto">
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
