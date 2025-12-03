// client/src/components/CalendarEmbed.tsx

type CalendarItem = {
  id: string;       // calendarId
  color?: string;   // "#RRGGBB" או "RRGGBB"
};

type Props = {
  calendars: CalendarItem[];     // רשימת היומנים
  mode?: "WEEK" | "MONTH" | "AGENDA";
  tz?: string;                   // אזור זמן
  hl?: string;                   // שפה בממשק (למשל "he")
  height?: number;               // גובה ה־iframe
  showTitle?: 0 | 1;
  showTabs?: 0 | 1;
  showDate?: 0 | 1;
  showNav?: 0 | 1;
};

function CalendarEmbed({
  calendars,
  mode = "WEEK",
  tz = "Asia/Jerusalem",
  hl = "he",
  height = 380,
  showTitle = 0,
  showTabs = 0,
  showDate = 1,
  showNav = 1,
}: Props) {
  const base = new URLSearchParams({
    hl,
    mode,
    ctz: tz,
    showTitle: String(showTitle),
    showTabs: String(showTabs),
    showDate: String(showDate),
    showNav: String(showNav),
  });

  // הוסף src (+ color אם קיים) על כל יומן
  const parts: string[] = [`https://calendar.google.com/calendar/embed?${base.toString()}`];
  for (const cal of calendars) {
    parts.push(`src=${encodeURIComponent(cal.id)}`);
    if (cal.color) {
      // חשוב: # -> %23
      const hex = cal.color.startsWith("#") ? cal.color.replace("#", "%23") : `%23${cal.color}`;
      parts.push(`color=${hex}`);
    }
  }

  const src = parts.join("&");

  return (
    <div className="border rounded-2xl overflow-hidden">
      <iframe
        title="Google Calendar"
        src={src}
        style={{ border: 0, width: "100%", height }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default CalendarEmbed;