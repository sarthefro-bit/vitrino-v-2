import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Setup from './pages/Setup';
import TechList from './pages/TechList';
import Vitrin from './pages/Vitrin';
import SecretAdmin from './pages/SecretAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Splash & Multi-step Setup Flow */}
        <Route path="/" element={<Setup />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/register" element={<Setup />} />
        <Route path="/login" element={<Setup />} />

        {/* Explore Nail Techs List */}
        <Route path="/techs" element={<TechList />} />
        <Route path="/explore" element={<TechList />} />

        {/* Public Vitrin Showcase */}
        <Route path="/vitrin/:slug" element={<Vitrin />} />
        <Route path="/tech/:slug" element={<Vitrin />} />

        {/* Secret Backlog & Diagnostics Dashboard */}
        <Route path="/secret-admin" element={<SecretAdmin />} />
        <Route path="/secret-backlog" element={<SecretAdmin />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
