// client/src/components/CoursePage.tsx
import type { Course } from "../data/years";
import LinkCard from "./LinkCard";
import { IMG_DRIVE, IMG_MOODLE, IMG_PDF, IMG_WHATSAPP } from "../constants/icons";
import Chip from "./Chip";

function AssessmentTable({
  title,
  items,
}: {
  title: string;
  items?: Course["assignments"]; // אותו טייפ
}) {
  if (!items || !items.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium mb-2">{title}</h2>
      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-right">
              <th className="px-3 py-2 font-medium">שם</th>
              <th className="px-3 py-2 font-medium">תאריך</th>
              <th className="px-3 py-2 font-medium">משקל</th>
              <th className="px-3 py-2 font-medium">הערות</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{item.title}</td>
                <td className="px-3 py-2 whitespace-nowrap">{item.date || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{item.weight || "—"}</td>
                <td className="px-3 py-2 text-neutral-600">{item.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CoursePage({ course, onBack }: { course: Course; onBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={onBack} className="mb-6 text-sm underline">
        חזרה
      </button>

      <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2">
        {course.name}
        {course.note && <Chip>{course.note}</Chip>}
      </h1>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">מרכז/ת הקורס/מרצה:</span> {course.coordinator}
        </div>
        <div>
          <span className="font-medium">ועד קורס מטעמנו:</span> {course.reps}
        </div>
        <div>
          <span className="font-medium">מספר קורס:</span> {course.courseNumber}
        </div>

        {course.place && (
          <div className="flex items-center gap-2">
            <span className="font-medium">כיתה:</span>
            <Chip>{course.place}</Chip>
          </div>
        )}
      </div>

      {/* כפתורי קישורים */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <LinkCard href={course.syllabus} img={IMG_PDF} alt="סילבוס PDF" label="סילבוס (PDF)" />
        <LinkCard href={course.links?.drive} img={IMG_DRIVE} alt="Google Drive" label="דרייב הקורס" />
        <LinkCard href={course.links?.moodle} img={IMG_MOODLE} alt="Moodle" label="מודל הקורס" />
        <LinkCard href={course.links?.whatsapp} img={IMG_WHATSAPP} alt="WhatsApp" label="קבוצת וואטסאפ" />
      </div>

      {/* 👇 חדש: מטלות + מבחנים מעל חומרים חיצוניים */}
      <AssessmentTable title="מטלות" items={course.assignments} />
      <AssessmentTable title="מבחנים / בחנים" items={course.exams} />

      <div className="mt-8">
        <h2 className="text-lg font-medium mb-2">חומרים חיצוניים מומלצים</h2>
        {course.externalMaterials?.length ? (
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {course.externalMaterials.map((x, i) => (
              <li key={i}>
                <LinkCard href={x.href} img={x.icon || IMG_DRIVE} alt={x.label} label={x.label} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-neutral-500">—</div>
        )}
      </div>
    </div>
  );
}
