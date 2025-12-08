// client/src/context/YearsContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ============================
   TYPES
============================ */

export type SimpleCourse = {
  id: string;
  name: string;
  shortName?: string | null;
  yearLabel: string;     // למשל: "שנה א'"
  semesterLabel: string; // למשל: "סמסטר א'"
  courseCode?: string | null;
};

export type Semester = {
  id: string;
  title: string;
  courses: SimpleCourse[];
};

export type Year = {
  id: string;
  title: string;
  semesters: Semester[];
};

export type YearsContextValue = {
  years: Year[];
  allCourses: SimpleCourse[];
  loading: boolean;
  error: string | null;
reload: () => Promise<void>;   
};

/* ============================
   CONTEXT
============================ */

const YearsContext = createContext<YearsContextValue | undefined>(undefined);

type YearsProviderProps = {
  children: ReactNode;
};

/* ============================
   HELPER – GROUP BY YEAR/SEM
============================ */

function groupCoursesByYearSemester(courses: SimpleCourse[]): Year[] {
  const yearsMap = new Map<
    string,
    { title: string; semesters: Map<string, Semester> }
  >();

  for (const c of courses) {
    // שנה
    if (!yearsMap.has(c.yearLabel)) {
      yearsMap.set(c.yearLabel, {
        title: c.yearLabel,
        semesters: new Map(),
      });
    }
    const year = yearsMap.get(c.yearLabel)!;

    // סמסטר בתוך השנה
    if (!year.semesters.has(c.semesterLabel)) {
      year.semesters.set(c.semesterLabel, {
        id: `sem-${c.yearLabel}-${c.semesterLabel}`,
        title: c.semesterLabel,
        courses: [],
      });
    }
    const sem = year.semesters.get(c.semesterLabel)!;

    // הוספת הקורס
    sem.courses.push(c);
  }

  // החזרה כמערך
  const yearsArray: Year[] = [...yearsMap.entries()].map(
    ([yearLabel, yearData]) => ({
      id: `year-${yearLabel}`,
      title: yearData.title,
      semesters: [...yearData.semesters.values()],
    })
  );

  return yearsArray;
}

/* ============================
   PROVIDER
============================ */

export function YearsProvider({ children }: YearsProviderProps) {
  const [years, setYears] = useState<Year[]>([]);
  const [allCourses, setAllCourses] = useState<SimpleCourse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/courses");
      if (!res.ok) {
        throw new Error(`failed to load /api/courses (${res.status})`);
      }

      const json = await res.json();
      const items: any[] = Array.isArray(json.items) ? json.items : json;

      const courses: SimpleCourse[] = items.map((r) => ({
        id: String(r.id),
        name: r.name,
        shortName: r.shortName ?? r.short_name ?? null,
        yearLabel: r.yearLabel ?? r.year_label,
        semesterLabel: r.semesterLabel ?? r.semester_label,
        courseCode: r.courseCode ?? r.course_code ?? null,
      }));

      setAllCourses(courses);
      setYears(groupCoursesByYearSemester(courses));
    } catch (e: any) {
      console.error("[YearsContext] failed to load courses", e);
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadCourses();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCourses]);

  return (
    <YearsContext.Provider
      value={{ years, allCourses, loading, error, reload: loadCourses }}
    >
      {children}
    </YearsContext.Provider>
  );
}


/* ============================
   HOOKS
============================ */

export function useYears() {
  const ctx = useContext(YearsContext);
  if (!ctx) {
    throw new Error("useYears must be used inside <YearsProvider>");
  }
  return ctx;
}

// שיהיה לך גם השם הישן שהשתמשת בו
export const useYearsContext = useYears;
