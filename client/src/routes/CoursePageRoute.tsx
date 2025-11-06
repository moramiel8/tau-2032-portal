import { useParams, useNavigate } from "react-router-dom";
import CoursePage from "../components/CoursePage";
import { YEARS } from "../data/years";

export default function CourseRoute() {
  const { id } = useParams();     // מתוך ה-URL
  const nav = useNavigate();

  // דוגמה: למצוא את הקורס לפי id (תתאם ללוגיקה שלך)
// פונקציה כללית שמוצאת קורס בכל רמה
function extractCourses(data: any): any[] {
  const result: any[] = [];
  const traverse = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(traverse);
    if (Array.isArray(node.courses)) result.push(...node.courses);
    if (Array.isArray(node.semesters)) traverse(node.semesters);
    if (Array.isArray(node.years)) traverse(node.years);
  };
  traverse(data);
  return result;
}

const allCourses = extractCourses(YEARS);
const course = allCourses.find(c => String(c.id) === id);

  if (!course) return <div style={{padding:16}}>לא נמצא קורס</div>;

  return <CoursePage course={course} onBack={() => nav("/client/")} />;
}
