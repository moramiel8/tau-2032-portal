// api/index.js
const app = require("../server/index.js");

export default function handler(req, res) {
  return app(req, res);
}
