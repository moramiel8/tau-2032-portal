// client/src/routes/CourseRoute.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CoursePage from "../components/CoursePage";
import { ALL_COURSES, type Course } from "../data/years";

export default function CourseRoute() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const baseCourse =
    ALL_COURSES.find((c) => String(c.id) === id) || null;

  const [course, setCourse] = useState<Course | null>(baseCourse);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res = await fetch(`/api/course-content/${id}`);
        if (!res.ok) {
          console.warn("course-content fetch failed", res.status);
          return;
        }

        const data = await res.json();

        if (data && data.content) {
          // מיזוג התוכן מה-DB על גבי הקורס הבסיסי
          setCourse((prev) =>
            prev
              ? ({ ...prev, ...data.content } as Course)
              : (data.content as Course)
          );
        }
      } catch (e) {
        console.warn("[CourseRoute] failed to load course content", e);
      }
    })();
  }, [id]);

  if (!course) {
    return <div style={{ padding: 16 }}>לא נמצא קורס</div>;
  }

  return <CoursePage course={course} onBack={() => nav("/")} />;
}
