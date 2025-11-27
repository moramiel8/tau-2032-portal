import { useParams, useNavigate } from "react-router-dom";
import CoursePage from "../components/CoursePage";
import { ALL_COURSES } from "../data/years";

export default function CourseRoute() {
  const { id } = useParams();
  const nav = useNavigate();

  const course = ALL_COURSES.find(c => String(c.id) === id);

  if (!course) return <div style={{ padding: 16 }}>לא נמצא קורס</div>;

  return <CoursePage course={course} onBack={() => nav("/")} />;
}
