// client/src/components/CalendarEmbed.tsx

// אפשר להשתמש בשני מצבים:
// 1) מקור ישיר: <CalendarEmbed src="https://calendar.google.com/calendar/embed?..."/>
// 2) בנייה מ-id: <CalendarEmbed calendarId="...@group.calendar.google.com" mode="MONTH" tz="Asia/Jerusalem" />

type CalendarEmbedFromSrc = {
  src: string;
  height?: number;
};

type CalendarEmbedFromId = {
  calendarId: string;               // למשל: "...@group.calendar.google.com"
  mode?: "WEEK" | "MONTH" | "AGENDA";
  tz?: string;                      // ברירת מחדל: "Asia/Jerusalem"
  height?: number;                  // ברירת מחדל: 600
  showTitle?: 0 | 1;                // ברירות מחדל ידידותיות ל-embed
  showTabs?: 0 | 1;
  showCalendars?: 0 | 1;
  showDate?: 0 | 1;
  showNav?: 0 | 1;
  src?: never;                      // כדי למנוע העברה כפולה של src ו-id ביחד
};

type CalendarEmbedProps = CalendarEmbedFromSrc | CalendarEmbedFromId;

export default function CalendarEmbed(props: CalendarEmbedProps) {
  const height = "height" in props && props.height ? props.height : 600;

  const src =
    "src" in props
      ? props.src
      : buildSrc({
          calendarId: props.calendarId,
          mode: props.mode ?? "MONTH",
          tz: props.tz ?? "Asia/Jerusalem",
          showTitle: props.showTitle ?? 0,
          showTabs: props.showTabs ?? 0,
          showCalendars: props.showCalendars ?? 0,
          showDate: props.showDate ?? 1,
          showNav: props.showNav ?? 1,
        });

  return (
    <div className="border rounded-2xl overflow-hidden">
      <iframe
        title="Google Calendar"
        src={src}
        style={{ border: 0, width: "100%", height }}
        referrerPolicy="no-referrer-when-downgrade"
        loading="lazy"
      />
    </div>
  );
}

function buildSrc(opts: {
  calendarId: string;
  mode: "WEEK" | "MONTH" | "AGENDA";
  tz: string;
  showTitle: 0 | 1;
  showTabs: 0 | 1;
  showCalendars: 0 | 1;
  showDate: 0 | 1;
  showNav: 0 | 1;
}) {
  const params = new URLSearchParams({
    src: opts.calendarId,
    ctz: opts.tz,
    mode: opts.mode,
    showTitle: String(opts.showTitle),
    showTabs: String(opts.showTabs),
    showCalendars: String(opts.showCalendars),
    showDate: String(opts.showDate),
    showNav: String(opts.showNav),
  });
  return `https://calendar.google.com/calendar/embed?${params.toString()}`;
}
