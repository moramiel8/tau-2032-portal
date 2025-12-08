// client/src/data/years.ts
// קובץ טייפים בלבד – אין בו יותר נתונים סטטיים של קורסים

export type AssessmentItem = {
  title: string;
  date?: string;
  weight?: string;
  notes?: string;
};

export type CourseLinks = {
  drive?: string;
  moodle?: string;
  whatsapp?: string;
};

export type ExternalMaterial = {
  label: string;
  href: string;
  icon?: string;
};

export type Course = {
  id: string;
  name: string;

  // שדות שיכולים להיות null מה-DB
  shortName?: string | null;
  courseNumber?: string | null;
  courseCode?: string | null;
  note?: string | null;
  coordinator?: string | null;
  reps?: string[] | string | null;
  place?: string | null;

  // טקסט עשיר
  whatwas?: string | null;
  whatwill?: string | null;

  assignments?: AssessmentItem[] | null;
  exams?: AssessmentItem[] | null;
  labs?: AssessmentItem[] | null;

  externalMaterials?: ExternalMaterial[] | null;

  links?: CourseLinks | null;

  syllabus?: string | null;
};

export type Semester = {
  id: string;
  title: string;
  courses: Course[];
};

export type YearKind = "preclinical" | "clinical";

export type Year = {
  id: string;
  title: string;
  kind: YearKind;
  semesters: Semester[];
};

// לשמירת תאימות – ריקים
export const YEARS: Year[] = [];
export const ALL_COURSES: Course[] = [];
