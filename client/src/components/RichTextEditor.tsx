// client/src/components/RichTextEditor.tsx
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Quill מצייר את הפלטה בעמודות:
 * columns = numberOfColors / rows
 * indices: 0,rows,2*rows... = עמודה ראשונה
 *
 * לכן מגדירים מטריצה של צבעים (rows x cols)
 * ואז משטחים אותה לפי עמודות.
 */

// --- טקסט ---
const COLOR_MATRIX: string[][] = [
  // שורה 1 – כהים
  ["#7f1d1d", "#92400e", "#854d0e", "#14532d", "#0f766e", "#1d4ed8", "#312e81", "#701a75"],
  // שורה 2 – בינוניים
  ["#b91c1c", "#c2410c", "#a16207", "#15803d", "#0d9488", "#2563eb", "#3730a3", "#86198f"],
  // שורה 3 – חזקים
  ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7"],
  // שורה 4 – בהירים
  ["#fca5a5", "#fdba74", "#facc15", "#86efac", "#67e8f9", "#93c5fd", "#a5b4fc", "#e9d5ff"],
  // שורה 5 – הכי עדינים
  ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#ecfeff", "#eff6ff", "#e0e7ff", "#f5e9ff"],

   ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#ecfeff", "#eff6ff", "#e0e7ff", "#f5e9ff"],

    ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#ecfeff", "#eff6ff", "#e0e7ff", "#f5e9ff"],
];

const BACKGROUND_MATRIX: string[][] = [
  // שורה 1 – לבן + אפורים
 ["#7f1d1d", "#92400e", "#854d0e", "#14532d", "#0f766e", "#1d4ed8", "#312e81", "#701a75"],
  // שורה 2 – בינוניים
  ["#b91c1c", "#c2410c", "#a16207", "#15803d", "#0d9488", "#2563eb", "#3730a3", "#86198f"],
  // שורה 3 – חזקים
  ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7"],
  // שורה 4 – בהירים
  ["#fca5a5", "#fdba74", "#facc15", "#86efac", "#67e8f9", "#93c5fd", "#a5b4fc", "#e9d5ff"],
  // שורה 5 – הכי עדינים
  ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#ecfeff", "#eff6ff", "#e0e7ff", "#f5e9ff"],

   ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#ecfeff", "#eff6ff", "#e0e7ff", "#f5e9ff"],

    ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#ecfeff", "#eff6ff", "#e0e7ff", "#f5e9ff"],
];

// משטיח מטריצה לעמודות (כמו ש-Quill מצפה)
function flattenColumnMajor(matrix: string[][]): string[] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const out: string[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      out.push(matrix[r][c]);
    }
  }
  return out;
}

const COLOR_PALETTE = flattenColumnMajor(COLOR_MATRIX);
const BACKGROUND_PALETTE = flattenColumnMajor(BACKGROUND_MATRIX);

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    [{ color: COLOR_PALETTE }, { background: BACKGROUND_PALETTE }],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "link",
  "color",
  "background",
];

const QuillEditor: any = ReactQuill;

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  return (
    <div
      className={`
        rtl-quill
        ${className ?? ""}
        rounded-2xl border border-neutral-300
        overflow-hidden
      `}
      dir="rtl"
    >
      <QuillEditor
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
