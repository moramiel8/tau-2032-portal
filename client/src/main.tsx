// client/src/main.tsx
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import CourseRoute from "./routes/CoursePageRoute";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/course/:id" element={<CourseRoute />} />
    </Routes>
  </HashRouter>
);
