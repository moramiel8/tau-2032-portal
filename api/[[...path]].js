// api/[[...path]].js
import app from "../server/index.js";

export default app;

export const config = {
  api: {
    bodyParser: false,
  },
};
