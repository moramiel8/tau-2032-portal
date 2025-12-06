// client/src/components/RichTextEditor.tsx
import { useRef, useState, useMemo } from "react";
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

// --- צבעי טקסט ---
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
];

// --- צבעי רקע ---
const BACKGROUND_MATRIX: string[][] = [
  // שורה 1 – לבן + אפורים
  ["#ffffff", "#f9fafb", "#f3f4f6", "#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563"],
  // שורה 2 – ורדרדים / חמים
  ["#fef2f2", "#fee2e2", "#fecaca", "#fee2e2", "#ffedd5", "#fed7aa", "#fdba74", "#fb923c"],
  // שורה 3 – צהובים / זהובים
  ["#fffbeb", "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#facc15", "#eab308", "#ca8a04"],
  // שורה 4 – ירוקים / טורקיז
  ["#ecfdf5", "#dcfce7", "#bbf7d0", "#86efac", "#6ee7b7", "#a7f3d0", "#67e8f9", "#22c55e"],
  // שורה 5 – כחולים/סגולים
  ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#ede9fe"],
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

// רשימת אימוג׳יז
const EMOJIS = [
  "⬅️", "➡️", 
  "📝", "📚", "📖", "💻", "💡", "💯", "👩🏻‍💻", "👨🏻‍💻", "📓", "✍🏻", "💡",  "🧠", "️💪",
  "😀", "😁","😂","🤣","😊",  "😍",  "😎",  "🤓",  "🤩",  "😅",  "🥲",  "😢",  "😴",  "🤒",
  "❤️",  "🩷", "🧡",  "💛",  "💚",  "💙",  "💜",  "🖤",  "🤍",
  "⭐",  "✨",  "🔥",
  "📌",  "✅", "❌",  "⚠️",
  "💉",  "🩺", "👨🏻‍⚕️", "👩🏻‍⚕️", "☤", "❤️‍🩹", "🫀", "🔬", "🩻", "🧬"
];

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
  const quillRef = useRef<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const insertEmoji = (emoji: string) => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;

    const range = editor.getSelection(true);
    if (range) {
      editor.insertText(range.index, emoji, "user");
      editor.setSelection(range.index + emoji.length, 0);
    } else {
      editor.insertText(editor.getLength(), emoji, "user");
    }
  };

  // modules כולל כפתור emoji בטולבר
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "emoji"], // 👈 כפתור האימוג׳י בתוך הטולבר
          [{ color: COLOR_PALETTE }, { background: BACKGROUND_PALETTE }],
          ["clean"],
        ],
        handlers: {
          emoji: () => setShowEmojiPicker((v) => !v),
        },
      },
    }),
    []
  );

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
      <div className="relative">
        <QuillEditor
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />

        {/* פופאפ האימוג׳יז – נפתח מתחת לטולבר */}
        {showEmojiPicker && (
          <div className="absolute z-20 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-2xl shadow-lg p-2 flex flex-wrap gap-1 top-10 right-2 max-w-[260px]">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="text-xl px-1 rounded-md hover:bg-neutral-100 dark:hover:bg-slate-800"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
