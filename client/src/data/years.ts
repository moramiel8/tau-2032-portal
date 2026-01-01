// Types only – no static data

export type AssessmentItem = {
  title?: string;
  date?: string;
  weight?: string;
  notes?: string;
};

export type CourseLinks = {
  drive?: string;
  moodle?: string;
  whatsapp?: string;
};

export type ExternalMaterial =
  | {
      id: string;
      kind: "link";
      label: string;
      href: string;
      icon?: string;
    }
  | {
      id: string;
      kind: "file";
      label: string;
      storagePath: string;
      bucket?: string;        // defaults to "materials" on backend
      originalName?: string;
      mime?: string;
      icon?: string;
    };

export type Course = {
  id: string;
  name: string;

  // Nullable fields from DB
  shortName?: string | null;
  courseNumber?: string | null;
  courseCode?: string | null;
  note?: string | null;
  coordinator?: string | null;
  reps?: string[] | string | null;
  place?: string | null;

  // Rich text
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

// Kept for backward compatibility
export const YEARS: Year[] = [];
export const ALL_COURSES: Course[] = [];
