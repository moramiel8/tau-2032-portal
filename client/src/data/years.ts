// client/src/data/years.ts

/*
HOW TO ADD COURSE (CANNOT DO IT FROM THE SITE ITSELF BECAUSE IM LAZY)
(THOUGH YOU CAN EDIT IT FROM THE SITE ONCE YOU ADDED IT HERE!)
   {
            id: ID OF THE COURSE
            name: NAME OF THE COURSE
            note: SHORT NOTE
            coordinator: WHO IS THE LECTURER
            reps: WHO IS YOUR VAAD OF THE COURSE
            courseNumber: COURSE NUM 
            place: WHERE IS IT?
            syllabus: SYLLABUS - YOU CAN ALSO LEAVE IT EMPTY AND EDIT IT LATER ON THE SITE

            links: {
              drive:
                SAME LIKE SYLLABUS
              moodle:  SAME LIKE SYLLABUS
              whatsapp:  SAME LIKE SYLLABUS
            },
            assignments: [
              {
                title: ASSIGNMENTS TITLE
                date: DATE
                weight: WEIGHT
                notes: NOTES (SHORT)
              },
              {
                title: 2ND ASSIGNMENT
                date: SAME
                weight: SAME
              },
            ],
            exams: [
              {
                title: SAME
                date: SAME
                weight: SAME
              },
              {
                title: 2ND EXAM
                date: SAME
                weight: SAME
                notes: SAME
              },
            ],
            externalMaterials: 
            [
            {
              label: TITLE ACTUALLY,
                href: URL,
                icon: IMG_DRIVE/IMG_PDF/IMG_WHATSAPP/IMG_MOODLE
                }
            ],
          },
       
*/
import { IMG_DRIVE, IMG_PDF, IMG_NET } from "../constants/icons";

export type AssessmentItem = {
  title: string;   // שם המטלה / בחינה
  date?: string;   // תאריך (YYYY-MM-DD מומלץ)
  weight?: string; // משקל, למשל "10%" או "Pass/Fail"
  notes?: string;  // הערות נוספות
};

export type CourseLink = {
  type: "whatsapp" | "drive" | "moodle" | "pdf" | "other";
  label: string;
  url: string;
};

export type Course = {
  id: string;
  name: string;
  note?: string;
  whatwas?: string;
  whatwill?: string;
  coordinator?: string;
  reps?: string;
  courseNumber?: string;
  place?: string;
  syllabus?: string;
  // לינקים ישנים – עדיין תומך
  links?: { drive?: string; moodle?: string; whatsapp?: string };
  // לינקים חדשים עם אייקונים וכו׳
  externalMaterials?: { label: string; href: string; icon?: string }[];
  assignments?: AssessmentItem[];
  exams?: AssessmentItem[];
  labs?: AssessmentItem[];
};

export type Semester = { id: string; title: string; courses: Course[] };

export type Year = {
  id: string;
  title: string;
  kind: "preclinical" | "clinical";   // ⬅️ כאן ההפרדה
  semesters: Semester[];
};

export const YEARS: Year[] = [
  {
    id: "y1",
    title: "שנה א",
    kind: "preclinical",   // ⬅️ שנה א׳ = פרה־קליני
    semesters: [
      {
        id: "y1s1",
        title: "סמסטר א",
        courses: [
          {
            id: "chem-gen-phys",
            name: "כימיה כללית ופיזיקלית",
            note: "חצי סמסטריאלי – מחצית ראשונה",
            whatwas: "nothing",
            whatwill: "nothing, too",
            coordinator: 'ד"ר ענאן חג` יחיא ערישה',
            reps: "—",
            courseNumber: "0111-1212",
            place: "אולם לולה 001",
            syllabus:
              "https://ims.tau.ac.il/Tal/Scans/Syllabus_Download.aspx?kurs=01111212&syllabus=kr_syllabus_s20251_k00_v00.pdf&dt=24102025105813",
            links: {
              drive:
                "https://drive.google.com/drive/u/5/folders/1ahSnTBRzJQtax-3e56tWQrfI3h1FQ1xG",
              moodle: "https://moodle.tau.ac.il/course/view.php?id=111121201",
              whatsapp: "https://chat.whatsapp.com/DDTXpj3IheGGI9nSYITeW7",
            },
            assignments: [
              {
                title: "מטלת בית 1 – גזים",
                date: "2025-12-10",
                weight: "5%",
                notes: "הגשה במודל עד 23:59",
              },
              {
                title: "מטלת בית 2 – תרמודינמיקה",
                date: "2025-12-24",
                weight: "5%",
              },
            ],
            exams: [
              {
                title: "בחן אמצע",
                date: "2026-01-15",
                weight: "20%",
              },
              {
                title: "מבחן סיום",
                date: "2026-03-10",
                weight: "70%",
                notes: "חומר מצטבר, כולל כל המטלות",
              },
            ],
           externalMaterials: 
            [
            {
              label: "title",
                href: "https://google.com",
                icon: IMG_NET,
                }
            ],
          },
          {
            id: "chem-organic",
            name: "כימיה אורגנית",
            note: "חצי סמסטריאלי – מחצית שנייה",
            coordinator: 'ד"ר ענאן חג` יחיא ערישה',
             whatwas: "nothing",
            whatwill: "nothing, too",
            reps: "—",
            courseNumber: "0111-1213",
            syllabus:
              "https://ims.tau.ac.il/Tal/Scans/Syllabus_Download.aspx?kurs=01111213&syllabus=kr_syllabus_s20251_k00_v00.pdf&dt=24102025110541",
            links: {
              drive:
                "https://drive.google.com/drive/u/5/folders/1tKHY5MwU-8MC5X8y-50_pgHQxDMUF5Ro",
              moodle: "https://moodle.tau.ac.il/course/view.php?id=111121301",
              whatsapp: "https://chat.whatsapp.com/DDTXpj3IheGGI9nSYITeW7",
            },
          externalMaterials: [
              {
                label: "StatQuest – YouTube",
                href: "https://www.youtube.com/c/joshstarmer",
                icon: IMG_DRIVE,
              },
              {
                label: "StatQuest",
                href: "https://www.youtube.com/c/joshstarmer",
                icon: IMG_DRIVE,
              },

            ],
          },
          {
            id: "bioch-found",
            name: "יסודות ביוכימיים של הרפואה",
            note: "שבועי",
            coordinator: "פרופ' מעין גל",
             whatwas: "nothing",
            whatwill: "nothing, too",
            reps: "—",
            courseNumber: "0111-1215",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [
              {
                label: "Biochemistry – OpenStax",
                href: "https://openstax.org/subjects/science",
                icon: IMG_PDF,
              },
            ],
          },
          {
            id: "biophys-intro",
            name: "מבוא לביופיזיקה ופיזיולוגיה כללית",
            note: "שבועי",
            coordinator: 'ד"ר מריה גוזמן אלוש',
            whatwas: "nothing",
            whatwill: "nothing, too",
            reps: "—",
            courseNumber: "0111-1219",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [
              {
                label: "Khan Academy – Physiology",
                href: "https://www.khanacademy.org/science/health-and-medicine/human-anatomy-and-physiology",
                icon: IMG_DRIVE,
              },

              {
                label: "StatQuest",
                href: "https://www.youtube.com/c/joshstarmer",
                icon: IMG_DRIVE,
              },
            ],
          },
          {
            id: "stats-intro",
            name: "מבוא לסטטיסטיקה",
            note: "שבועי",
            coordinator: 'ד"ר יעל איזנבך',
             whatwas: "nothing",
            whatwill: "nothing, too",
            reps: "—",
            courseNumber: "0111-1219",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [
              {
                label: "StatQuest – YouTube1",
                href: "https://www.youtube.com/c/joshstarmer",
                icon: IMG_DRIVE,
              },
            ],
          },
          {
            id: "physics-intro",
            name: "מבוא לפיזיקה",
            note: "שבועי – א-סינכרוני",
            coordinator: 'ד"ר בן צוקר',
             whatwas: "nothing",
            whatwill: "nothing, too",
            reps: "—",
            courseNumber: "0111-1226",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [
              {
                label: "Physics – MIT OpenCourseWare",
                href: "https://ocw.mit.edu",
                icon: IMG_DRIVE,
              },
            ],
          },
          {
            id: "epi-methods",
            name: "אפידמיולוגיה ושיטות מחקר",
            note: "שבועי – א-סינכרוני",
            coordinator: "מרצה: טרם ידוע",
             whatwas: "nothing",
            whatwill: "nothing, too",
            reps: "—",
            courseNumber: "0111-1321",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [
              {
                label: "Epidemiology – Coursera",
                href: "https://www.coursera.org",
                icon: IMG_DRIVE,
              },
            ],
          },

           {
            id: "hibuki",
            name: "חינוך רפואי בראייה חברתית (חיבוקי)",
            note:  "הערות",
            coordinator: "מרצה: טרם ידוע",
             whatwas: "nothing",
            whatwill: "nothing, too",
            reps: "—",
            courseNumber: "0111-1321",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
         
          },
        ],
      },
      {
        id: "y1s2",
        title: "סמסטר ב",
        courses: [

           {
            id: "basis-molec",
            name: "יסודות מולקולריים של הרפואה",
            note: "חצי סמסטריאלי - מחצית שניה",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },
    {
            id: "basis-genetic",
            name: "יסודות גנטיים של הרפואה",
            note: "חצי סמסטריאלי - מחצית שניה",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },
          
              {
            id: "neuroscience",
            name: "מבוא למדעי העצב",
            note: "חצי סמסטריאלי - מחצית שניה",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },

             {
            id: "medical-physics",
            name: "פיזיקה רפואית",
            note: "שבועי",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },

             {
            id: "bacteriology",
            name: "בקטריולוגיה",
            note: "חצי סמסטריאלי - מחצית שניה",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },

               {
            id: "bio-cell",
            name: "ביולוגיה של התא",
            note: "שבועי",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },
               {
            id: "advanced-statistical",
            name: "שיטות סטטיסטיות מתקדמות",
            note: "שבועי",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },

               {
            id: "pro-healthy-lifestyle",
            name: "קידום אורח חיים בריא",
            note: "שבועי",
            coordinator: 'ד"ר הדגמה',
            reps: "—",
            courseNumber: "001-1002",
            syllabus: "",
            links: { drive: "", moodle: "", whatsapp: "" },
            externalMaterials: [],
          },
        ],
      },
    ],
  },
  // שנים 2–6 עם קורסי דוגמה
  ...Array.from({ length: 5 }, (_, k) => {
    const idx = k + 2; // years 2..6
    const heb = "אבגדהו"[idx - 1];

    // ⬅️ 2–3 פרה־קליניים, 4–6 קליניים
    const kind: "preclinical" | "clinical" =
      idx <= 3 ? "preclinical" : "clinical";

    return {
      id: `y${idx}`,
      title: `שנה ${heb}`,
      kind,
      semesters: [
        {
          id: `y${idx}s1`,
          title: "סמסטר א",
          courses: [
            {
              id: `demo-${idx}-a`,
              name: `קורס לדוגמה שנה ${heb} סמסטר א`,
              note: "חובה",
              coordinator: 'ד"ר הדגמה',
              reps: "—",
              courseNumber: `00${idx}-1001`,
              syllabus: "",
              links: { drive: "", moodle: "", whatsapp: "" },
              externalMaterials: [],
            },
          ],
        },
        {
          id: `y${idx}s2`,
          title: "סמסטר ב",
          courses: [
            {
              id: `demo-${idx}-b`,
              name: `קורס לדוגמה שנה ${heb} סמסטר ב`,
              note: "בחירה",
              coordinator: 'ד"ר הדגמה',
              reps: "—",
              courseNumber: `00${idx}-1002`,
              syllabus: "",
              links: { drive: "", moodle: "", whatsapp: "" },
              externalMaterials: [],
            },
          ],
        },
      ],
    } as Year;
  }),
];

// אחרי שסגרנו את YEARS, אפשר לייצר אוסף קורסים נוח
export const ALL_COURSES = YEARS
  .flatMap((y) => y.semesters)
  .flatMap((s) => s.courses);
