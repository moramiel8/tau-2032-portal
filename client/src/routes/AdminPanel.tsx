// client/src/routes/AdminPanel.tsx
import type { User } from "../utils/auth";
import { YEARS } from "../data/years";
import type { Course } from "../data/years";
import { useState } from "react";

type Props = {
    user: User | null;       
};

export default function AdminPanel({ user }: Props) {

 if (!user) {
    return <div>אין גישה לפאנל מנהל.</div>;
  }


  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // TODO: בפועל תמשוך רשימת משתמשים/תפקידים מהשרת
  // כאן רק שלד UI

  const allCourses: Course[] = YEARS.flatMap((y) =>
    y.semesters.flatMap((s) => s.courses)
  );

 const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    // TODO: קריאה לשרת
  };

 return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">פאנל מנהל</h1>
      <p className="text-sm text-neutral-600 mb-6">
        מחובר כ-<span className="font-medium">{user.email}</span>{" "}
        ({user.role ?? "ללא תפקיד"})
      </p>

      <section className="mb-8 border rounded-2xl p-4">
        <h2 className="text-lg font-medium mb-3">הקצאת תפקיד &quot;ועד קורס&quot;</h2>

        <label className="block text-sm mb-2">
          מייל של הסטודנט:
          <input
            type="email"
            value={selectedUserEmail}
            onChange={(e) => setSelectedUserEmail(e.target.value)}
            className="border rounded-xl px-3 py-2 mt-1 w-full text-sm"
            placeholder="student@mail.tau.ac.il"
          />
        </label>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">בחר קורסים:</div>
          <div className="max-h-72 overflow-y-auto border rounded-xl p-2 text-sm space-y-1">
            {allCourses.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCourseIds.includes(c.id)}
                  onChange={() => toggleCourse(c.id)}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-4 border rounded-xl px-4 py-2 text-sm hover:bg-neutral-50"
        >
          שמירת הקצאה
        </button>
      </section>

      {/* אפשר להוסיף כאן עוד סקשן:
          - ניהול תפקיד גלובלי "ועד"
          - העלאת חומרים
          - עריכת קורסים וכו'
      */}
    </div>
  );
}
