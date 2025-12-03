// api/[[...path]].js
import app from "../server/index.js";

export default function handler(req, res) {
  // ב-Vercel הבקשה נכנסת כ "/health" במקום "/api/health",
  // אז נוסיף /api כדי שיתאים לראוטים שב-Express.
  if (!req.url.startsWith("/api")) {
    req.url = "/api" + (req.url === "/" ? "" : req.url);
  }

  return app(req, res);
}
