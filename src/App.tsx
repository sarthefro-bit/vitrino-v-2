import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import TechList from './pages/TechList';
import Vitrin from './pages/Vitrin';
import SecretAdmin from './pages/SecretAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Explore (landing page, no login needed) */}
        <Route path="/" element={<TechList />} />
        <Route path="/techs" element={<TechList />} />
        <Route path="/explore" element={<TechList />} />

        {/* Step-by-step Email OTP / Google Auth & Profile Completion */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/setup" element={<Auth />} />

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
