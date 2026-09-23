import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Playground from '@/components/Playground';
import Blog from '@/components/Blog';
import Community from '@/components/Community';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';
import Dashboard from '@/components/Dashboard';
import AuthPage from '@/components/AuthPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Landing() {
  return (
    <div className="min-h-screen bg-ink-950 relative">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Playground />
        <Blog />
        <Community />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<Navigate to="/dashboard/chats" replace />} />
        <Route path="/dashboard/:section" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}