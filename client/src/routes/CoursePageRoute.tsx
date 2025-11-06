import { useParams, useNavigate } from "react-router-dom";
import CoursePage from "../components/CoursePage";
import { YEARS } from "../data/years";

export default function CourseRoute() {
  const { id } = useParams();     // מתוך ה-URL
  const nav = useNavigate();

  // דוגמה: למצוא את הקורס לפי id
  const course = YEARS.flatMap(y => y.courses).find(c => String(c.id) === id);

  if (!course) return <div style={{padding:16}}>לא נמצא קורס</div>;

  return <CoursePage course={course} onBack={() => nav("/client/")} />;
}
