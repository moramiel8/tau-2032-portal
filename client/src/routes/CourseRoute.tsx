import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { stripHtml } from "../utils/stripHtml";

import { useYearsContext } from "../context/YearsContext";
import type { ExternalMaterial } from "../data/years";

import {
  IMG_DRIVE,
  IMG_MOODLE,
  IMG_WHATSAPP,
  IMG_PDF,
} from "../constants/icons";

/* ---------- Local types ---------- */

type AssessmentItem = {
  title?: string;
  date?: string;
  weight?: string;
  notes?: string;
};

type Links = {
  drive?: string;
  moodle?: string;
  whatsapp?: string;
};

type BaseCourse = {
  id: string;
  name: string;
  reps?: string[] | string;
  coordinator?: string;
  courseNumber?: string;
  note?: string;
  place?: string;
  whatwas?: string;
  whatwill?: string;
  assignments?: AssessmentItem[];
  exams?: AssessmentItem[];
  labs?: AssessmentItem[];
  syllabus?: string;
  links?: Links;
  externalMaterials?: ExternalMaterial[];
};

type VaadUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type CourseContent = BaseCourse & {
  lastEditedByEmail?: string | null;
  lastEditedByName?: string | null;
  lastEditedAt?: string | null;
};

type CourseAnnouncement = {
  id: string;
  title: string;
  body: string;
  courseId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  authorEmail?: string | null;
  authorName?: string | null;
};

/* ------------------------------------------------------------------ */

export default function CourseRoute() {
  const { allCourses } = useYearsContext();
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaadUsers, setVaadUsers] = useState<VaadUser[]>([]);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);

  /* -------------------------------------------------
  Navigation
  ---------------------------------------------------*/

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  /* -------------------------------------------------
  Load vaad users
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
      } catch (e) {
        console.warn("failed to load vaad users", e);
      }
    })();
  }, []);

  /* -------------------------------------------------
  Load course content
  ---------------------------------------------------*/

  useEffect(() => {
    if (!id) return;

    const baseCourse =
      (allCourses.find((c) => c.id === id) as BaseCourse | undefined) || null;

    (async () => {
      try {
        const res = await fetch(`/api/course-content/${id}`);
        if (!res.ok) {
          setCourse(baseCourse);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (data.exists && data.content) {
          setCourse(
            baseCourse
              ? { ...baseCourse, ...data.content }
              : (data.content as CourseContent)
          );
        } else {
          setCourse(baseCourse);
        }
      } catch (e) {
        console.warn("[CourseRoute] failed to load course content", e);
        setCourse(baseCourse);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, allCourses]);

  /* -------------------------------------------------
  Load announcements
  ---------------------------------------------------*/

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/announcements?courseId=${encodeURIComponent(id)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        const items: CourseAnnouncement[] = Array.isArray(data)
          ? data
          : data.items || [];

        setAnnouncements(items.filter((a) => a.courseId === id));
      } catch (e) {
        console.warn("[CourseRoute] failed to load announcements", e);
      }
    })();
  }, [id]);

  /* -------------------------------------------------
  Guards
  ---------------------------------------------------*/

  if (!id) {
    return <div className="p-4 text-sm">Missing course id</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm">Loading course…</div>;
  }

  if (!course) {
    return (
      <div className="p-4 text-sm">
        Course not found: <code>{id}</code>
      </div>
    );
  }

  /* -------------------------------------------------
  Helpers
  ---------------------------------------------------*/

  const reps: string[] = Array.isArray(course.reps)
    ? course.reps
    : course.reps
    ? [course.reps]
    : [];

  const getDisplayNameByEmail = (email?: string | null): string | null => {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const match = vaadUsers.find(
      (u) => u.email.trim().toLowerCase() === normalized
    );
    return match?.displayName || email;
  };

  const repsDisplay = reps.map((email) => {
    const name = getDisplayNameByEmail(email);
    return name && name !== email ? `${name} (${email})` : email;
  });

  const assignments = course.assignments || [];
  const exams = course.exams || [];
  const labs = course.labs || [];

  const hasLinks =
    !!course.links?.whatsapp ||
    !!course.links?.drive ||
    !!course.links?.moodle ||
    (course.externalMaterials && course.externalMaterials.length > 0);

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString("he-IL");
  };

  /* -------------------------------------------------
  External material open helper
  ---------------------------------------------------*/

  const openExternalMaterial = async (m: ExternalMaterial) => {
    if (m.kind === "link") {
      window.open(m.href, "_blank", "noopener,noreferrer");
      return;
    }

    const res = await fetch(
      `/api/admin/storage/signed-url?bucket=${encodeURIComponent(
        m.bucket || "materials"
      )}&path=${encodeURIComponent(m.storagePath)}`,
      { credentials: "include" }
    );

    if (!res.ok) {
      console.warn("failed to open material", m);
      return;
    }

    const data = await res.json();
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  /* -------------------------------------------------
  Render
  ---------------------------------------------------*/

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4">
      <header className="mb-5 border-b pb-3">
        <button
          onClick={handleBack}
          className="mb-2 rounded-xl border px-3 py-1 text-xs"
        >
          Back
        </button>

        <h1 className="text-2xl font-semibold">{course.name}</h1>
      </header>

      {hasLinks && (
        <section className="mb-8 border rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Links</h2>

          <div className="flex flex-wrap gap-3 text-xs">
            {course.links?.whatsapp && (
              <a
                href={course.links.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2"
              >
                <img src={IMG_WHATSAPP} className="w-4 h-4" />
                WhatsApp
              </a>
            )}

            {course.links?.drive && (
              <a
                href={course.links.drive}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2"
              >
                <img src={IMG_DRIVE} className="w-4 h-4" />
                Drive
              </a>
            )}

            {course.links?.moodle && (
              <a
                href={course.links.moodle}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2"
              >
                <img src={IMG_MOODLE} className="w-4 h-4" />
                Moodle
              </a>
            )}

            {course.syllabus && (
              <a
                href={course.syllabus}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2"
              >
                <img src={IMG_PDF} className="w-4 h-4" />
                Syllabus
              </a>
            )}

            {course.externalMaterials?.map((m) => (
              <button
                key={m.id}
                onClick={() => openExternalMaterial(m)}
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-2"
              >
                {m.icon && <img src={m.icon} className="w-4 h-4" />}
                {m.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* The rest of the component (general info, tables, announcements)
          remains unchanged */}
    </div>
  );
}
