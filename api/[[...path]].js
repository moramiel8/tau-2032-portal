// api/[[...path]].js
import app from "../server/index.js";

// Vercel פשוט מעביר את הבקשה ל־Express
export default function handler(req, res) {
  return app(req, res);
}
