// client/src/components/CourseList.tsx
import React, { useState } from "react";
import type { Year, Course } from "../data/years";
import Chip from "./Chip";

export function nextOpenState(s: Record<string, boolean>, id: string) {
  const n: Record<string, boolean> = Object.assign({}, s);
  n[id] = !Boolean(s[id]);
  return n;
}

export default function CourseList({
  years,
  onOpenCourse,
}: {
  years: Year[];
  onOpenCourse: (c: Course) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((s) => nextOpenState(s, id));

  return (
    <div className="grid grid-cols-1 gap-4">
      {years.map((year) => (
        <section key={year.id} className="border rounded-2xl">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">{year.title}</h2>
          </div>
          <div className="divide-y">
            {year.semesters.map((sem) => (
              <div key={sem.id}>
                <button
                  type="button"
                  onClick={() => toggle(sem.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 clickable"
                >
                  <span className="text-sm">{sem.title}</span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-5 h-5 transition-transform ${open[sem.id] ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {open[sem.id] && (
                  <div className="px-4 pb-4">
                    {sem.courses.length ? (
                      <ul className="text-sm divide-y border rounded-xl overflow-hidden">
                        {sem.courses.map((c) => (
                          <li key={c.id} className="hover:bg-neutral-50">
                            <button
                              type="button"
                              onClick={() => onOpenCourse(c)}
                              className="w-full text-right px-4 py-3 flex items-center justify-between clickable"
                            >
                              <span className="flex items-center gap-2">
                                <span>{c.name}</span>
                                {c.note && <Chip>{c.note}</Chip>}
                              </span>
                              <span className="text-xs text-neutral-500">פתיחת עמוד הקורס →</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-neutral-500">אין קורסים עדיין</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
