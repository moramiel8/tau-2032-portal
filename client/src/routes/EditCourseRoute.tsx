import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Course, AssessmentItem, ExternalMaterial } from "../data/years";
import { useYearsContext } from "../context/YearsContext";

import RichTextEditor from "../components/RichTextEditor";

import {
  IMG_DRIVE,
  IMG_PDF,
  IMG_WHATSAPP,
  IMG_MOODLE,
  IMG_NET,
} from "../constants/icons";

/* -------------------------------------------------
Types
---------------------------------------------------*/

type VaadUser = {
  id: string;
  email: string;
  displayName: string | null;
};

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
Normalization helpers
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

/* -------------------------------------------------
Constants
---------------------------------------------------*/

const ICON_OPTIONS = [
  { label: "Drive", value: IMG_DRIVE },
  { label: "PDF", value: IMG_PDF },
  { label: "Moodle", value: IMG_MOODLE },
  { label: "WhatsApp", value: IMG_WHATSAPP },
  { label: "General Website", value: IMG_NET },
];

const sanitizeDate = (raw: string) => raw.replace(/[^0-9./-]/g, "");

/* -------------------------------------------------
Component
---------------------------------------------------*/

export default function EditCourseRoute() {
  const { id } = useParams();
  const nav = useNavigate();

  const { allCourses, reload } = useYearsContext();

  const baseCourse = useMemo<CourseContent | null>(
    () =>
      normalizeBaseCourse(
        (allCourses.find((c) => c.id === id) as Course | undefined) || null
      ),
    [id, allCourses]
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

/* -------------------------------------------------
Load course content
---------------------------------------------------*/

  useEffect(() => {
    (async () => {
      if (!id) return;

      try {
        const res = await fetch(`/api/admin/course-content/${id}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.exists && data.content) {
            setContent(normalizeLoadedContent(data.content));
          } else {
            setContent(baseCourse);
          }
        } else {
          setContent(baseCourse);
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
Autosave
---------------------------------------------------*/

  useEffect(() => {
    if (!id || !content || !loadedRef.current) return;

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

        if (!res.ok) throw new Error();
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
External materials helpers
---------------------------------------------------*/

  function addExternalItem() {
    if (!content) return;

    setContent({
      ...content,
      externalMaterials: [
        ...content.externalMaterials,
        {
          id: crypto.randomUUID(),
          kind: "link",
          label: "",
          href: "",
          icon: IMG_NET,
        },
      ],
    });
  }

  function updateExternalLink(
    index: number,
    key: "label" | "href" | "icon",
    value: string
  ) {
    if (!content) return;
    const arr = [...content.externalMaterials];
    const item = arr[index];
    if (item.kind !== "link") return;
    arr[index] = { ...item, [key]: value };
    setContent({ ...content, externalMaterials: arr });
  }

  async function uploadExternalMaterialFile(
    index: number,
    file: File
  ) {
    if (!id || !content) return;

    const item = content.externalMaterials[index];
    if (!item?.id) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("materialId", item.id);

    const res = await fetch(
      `/api/admin/course-content/${id}/external-materials/upload`,
      {
        method: "POST",
        body: fd,
        credentials: "include",
      }
    );

    if (!res.ok) {
      alert("Upload failed");
      return;
    }

    const data = await res.json();

    const arr = [...content.externalMaterials];
    arr[index] = {
      id: item.id,
      kind: "file",
      label: item.label || file.name,
      bucket: data.bucket,
      storagePath: data.storagePath,
      originalName: data.originalName,
      mime: data.mime,
      icon: file.type.includes("pdf") ? IMG_PDF : IMG_NET
    };

    setContent({ ...content, externalMaterials: arr });
  }

  function removeExternalItem(index: number) {
    if (!content) return;
    const arr = [...content.externalMaterials];
    arr.splice(index, 1);
    setContent({ ...content, externalMaterials: arr });
  }

/* -------------------------------------------------
Render guards
---------------------------------------------------*/

  if (loading) {
    return <div className="p-4">Loading course…</div>;
  }

  if (!content) {
    return <div className="p-4 text-red-600">Course not found</div>;
  }

/* -------------------------------------------------
Render
---------------------------------------------------*/

  return (
    <div className="max-w-3xl mx-auto pb-12 px-4">
      <h1 className="text-2xl font-semibold mb-4">
        Edit course: {content.name}
      </h1>

      {/* External materials */}
      <section className="border rounded-2xl p-4">
        <h2 className="text-sm font-medium mb-3">External materials</h2>

        {content.externalMaterials.map((m, idx) => (
          <div key={m.id} className="border rounded-xl p-3 mb-2 text-xs">
         {m.kind === "link" ? (
  <>
    <input
      className="border rounded px-2 py-1 w-full mb-1"
      placeholder="Label"
      value={m.label}
      onChange={(e) =>
        updateExternalLink(idx, "label", e.target.value)
      }
    />
    <input
      className="border rounded px-2 py-1 w-full mb-1"
      placeholder="https://..."
      value={m.href}
      onChange={(e) =>
        updateExternalLink(idx, "href", e.target.value)
      }
    />

    <label className="underline cursor-pointer">
      Upload file instead
      <input
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadExternalMaterialFile(idx, file);
          e.target.value = "";
        }}
      />
    </label>
  </>
) : (
  <div>
    File: {m.originalName || m.storagePath}
  </div>
)}


            <label className="underline cursor-pointer">
              Upload file
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadExternalMaterialFile(idx, file);
                  e.target.value = "";
                }}
              />
            </label>

            <button
              onClick={() => removeExternalItem(idx)}
              className="block text-red-600 underline mt-1"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          onClick={addExternalItem}
          className="mt-2 border rounded px-3 py-1"
        >
          + Add material
        </button>
      </section>
    </div>
  );
}
