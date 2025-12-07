// client/src/components/CourseList.tsx
import { useState, useEffect } from "react";
import type { Year, Course } from "../data/years";

type Props = {
  years: Year[];
  onOpenCourse: (course: Course) => void;
};

type OpenYearsState = Record<string, boolean>;

const STORAGE_KEY = "courseListState-v2";

type PersistedState = {
  openPre: boolean;
  openClinical: boolean;
  openYears: OpenYearsState;
};

function loadInitialState(): PersistedState {
  if (typeof window === "undefined") {
    return { openPre: true, openClinical: true, openYears: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { openPre: true, openClinical: true, openYears: {} };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      openPre:
        typeof parsed.openPre === "boolean" ? parsed.openPre : true,
      openClinical:
        typeof parsed.openClinical === "boolean"
          ? parsed.openClinical
          : true,
      openYears:
        parsed.openYears && typeof parsed.openYears === "object"
          ? parsed.openYears
          : {},
    };
  } catch (e) {
    console.warn("[CourseList] failed to parse localStorage", e);
    return { openPre: true, openClinical: true, openYears: {} };
  }
}

export default function CourseList({ years, onOpenCourse }: Props) {
  const [openPre, setOpenPre] = useState<boolean>(
    () => loadInitialState().openPre
  );
  const [openClinical, setOpenClinical] = useState<boolean>(
    () => loadInitialState().openClinical
  );
  const [openYears, setOpenYears] = useState<OpenYearsState>(
    () => loadInitialState().openYears
  );

  // שמירה ל-localStorage בכל שינוי
  useEffect(() => {
    if (typeof window === "undefined") return;
    const state: PersistedState = {
      openPre,
      openClinical,
      openYears,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("[CourseList] failed to persist state", e);
    }
  }, [openPre, openClinical, openYears]);

  // חלוקה לפרה־קליני / קליני
  const preclinicalYears = years.filter((y) =>
    ["y1", "y2", "y3"].includes(y.id)
  );
  const clinicalYears = years.filter((y) =>
    ["y4", "y5", "y6"].includes(y.id)
  );

  const toggleYear = (yearId: string) => {
    setOpenYears((prev) => {
      const current = prev[yearId];
      const nextOpen = current === undefined ? false : !current;
      return {
        ...prev,
        [yearId]: nextOpen,
      };
    });
  };

  const renderYears = (ys: Year[]) => (
    <div className="space-y-4 mt-3">
      {ys.map((year) => {
        const isOpen = openYears[year.id] ?? true;

        return (
          <section
            key={year.id}
            className="
              border rounded-2xl p-4 shadow-sm
              bg-white border-neutral-200
              dark:bg-slate-900 dark:border-slate-700
            "
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">{year.title}</h3>

              <button
                type="button"
                onClick={() => toggleYear(year.id)}
                className="
                  text-[11px] border rounded-xl px-2 py-1
                  bg-white hover:bg-neutral-50
                  border-neutral-200 text-neutral-700
                  dark:bg-slate-900 dark:border-slate-700
                  dark:text-slate-100 dark:hover:bg-slate-800
                  transition-colors cursor-pointer
                "
              >
                {isOpen ? "מזער שנה" : "הצג שנה"}
              </button>
            </div>

            {isOpen && (
              <div className="space-y-3">
                {year.semesters.map((sem) => (
                  <div key={sem.id}>
                    <div className="text-xs font-medium text-neutral-500 dark:text-slate-300 mb-1">
                      {sem.title}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sem.courses.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => onOpenCourse(course)}
                          className="
                            text-xs sm:text-sm text-right
                            border rounded-xl px-3 py-2
                            bg-white border-neutral-200 text-neutral-900
                            hover:bg-neutral-50
                            dark:bg-slate-950/40 dark:border-slate-700
                            dark:text-slate-100 dark:hover:bg-slate-800
                            transition-colors cursor-pointer
                          "
                        >
                          <div className="font-medium">{course.name}</div>
                          {course.note && (
                            <div className="text-[11px] text-neutral-500 dark:text-slate-300">
                              {course.note}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* שנים פרה־קליניות */}
      {preclinicalYears.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">שנים פרה־קליניות</h2>
            <button
              type="button"
              onClick={() => setOpenPre((v) => !v)}
              className="
                text-xs border rounded-xl px-2 py-1
                bg-blue-700 hover:bg-blue-500
                border-blue-200 text-white
                dark:text-slate-100 dark:hover:bg-slate-500
                dark: bg-blue-700 hover:bg-blue-500
                dark: border-blue-700 text-white
                transition-colors cursor-pointer
              "
            >
              {openPre ? "הסתר" : "הצג"}
            </button>
          </div>
          {openPre && renderYears(preclinicalYears)}
        </section>
      )}

      {/* שנים קליניות */}
      {clinicalYears.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">שנים קליניות</h2>
            <button
              type="button"
              onClick={() => setOpenClinical((v) => !v)}
                className="
                text-xs border rounded-xl px-2 py-1
                bg-blue-700 hover:bg-blue-500
                border-blue-200 text-white
                dark:text-slate-100 dark:hover:bg-slate-500
                dark: bg-blue-700 hover:bg-blue-500
                dark: border-blue-700 text-white
                transition-colors cursor-pointer
              "
            >
              {openClinical ? "הסתר" : "הצג"}
            </button>
          </div>
          {openClinical && renderYears(clinicalYears)}
        </section>
      )}
    </div>
  );
}
