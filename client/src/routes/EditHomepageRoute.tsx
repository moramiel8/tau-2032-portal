// client/src/routes/EditHomepageRoute.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type HomepageContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  introText?: string;
};

export default function EditHomepageRoute() {
  const nav = useNavigate();
  const [content, setContent] = useState<HomepageContent>({
    heroTitle: "",
    heroSubtitle: "",
    introText: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // טעינה מהשרת
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/homepage");
        if (!res.ok) throw new Error("failed to load homepage");
        const data = await res.json() as {
          exists: boolean;
          content: HomepageContent;
        };
        setContent(data.content || {});
      } catch (e) {
        console.warn("[EditHomepageRoute] load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!res.ok) throw new Error("save failed");
      await res.json();
      alert("עמוד הבית נשמר בהצלחה!");
    } catch (e) {
      console.warn("[EditHomepageRoute] save failed", e);
      alert("שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-neutral-600">טוען תוכן עמוד הבית…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 px-4">
      <h1 className="text-2xl font-semibold mb-2">עריכת עמוד הבית</h1>
      <p className="text-xs text-neutral-500 mb-4">
        הטקסטים כאן מופיעים בחלק העליון של העמוד הראשי.
      </p>

      <div className="space-y-4 text-sm">
        <label className="block">
          <span className="block mb-1">כותרת ראשית (Hero title):</span>
          <input
            className="border rounded-xl px-3 py-2 w-full"
            value={content.heroTitle || ""}
            onChange={(e) =>
              setContent((prev) => ({ ...prev, heroTitle: e.target.value }))
            }
          />
        </label>

        <label className="block">
          <span className="block mb-1">כותרת משנה:</span>
          <input
            className="border rounded-xl px-3 py-2 w-full"
            value={content.heroSubtitle || ""}
            onChange={(e) =>
              setContent((prev) => ({ ...prev, heroSubtitle: e.target.value }))
            }
          />
        </label>

        <label className="block">
          <span className="block mb-1">טקסט פתיחה / הסבר:</span>
          <textarea
            className="border rounded-xl px-3 py-2 w-full min-h-[100px]"
            value={content.introText || ""}
            onChange={(e) =>
              setContent((prev) => ({ ...prev, introText: e.target.value }))
            }
          />
        </label>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="border rounded-xl px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמירת שינויים"}
          </button>
          <button
            type="button"
            onClick={() => nav("/admin")}
            className="text-xs text-neutral-500 underline"
          >
            חזרה לפאנל המנהל
          </button>
        </div>
      </div>
    </div>
  );
}
