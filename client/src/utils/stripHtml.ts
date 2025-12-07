// client/src/utils/stripHtml.ts
export function stripHtml(html: string): string {
  if (!html) return "";

  let text = html;

  // להפוך <br> ו־</p> לשבירת שורה
  text = text.replace(/<\s*br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p\s*>/gi, "\n");

  // למחוק את כל יתר התגיות
  text = text.replace(/<[^>]+>/g, "");

  // לנקות עודף רווחים/שורות
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
