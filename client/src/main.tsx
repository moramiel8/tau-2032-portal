import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import CourseRoute from './routes/CoursePageRoute';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename="/client">
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/course/:id" element={<CourseRoute />} />
      {/* fallback */}
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
