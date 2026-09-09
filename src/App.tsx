import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LiveChat from './components/LiveChat';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Process from './pages/Process';
import FAQ from './pages/FAQ';
import Track from './pages/Track';
import Admin from './pages/Admin';
import QuoteView from './pages/QuoteView';
import { recordPageView } from './lib/analytics';
import { destroyAdminSession } from './lib/security';
import { fetchCloudBusinessSettings } from './lib/businessSettings';

function NavigationSecurityWatcher() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // If the user was on /admin and navigates away (e.g. to / or any other page), automatically log out
    if (prevPathRef.current.startsWith('/admin') && !location.pathname.startsWith('/admin')) {
      destroyAdminSession();
    }
    prevPathRef.current = location.pathname;

    // Exclude /admin from public visitor tracking
    if (!location.pathname.startsWith('/admin')) {
      recordPageView(location.pathname);
    }
  }, [location.pathname]);

  return null;
}

function App() {
  useEffect(() => {
    fetchCloudBusinessSettings().catch(() => {});
  }, []);

  return (
    <Router>
      <NavigationSecurityWatcher />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/process" element={<Process />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/track" element={<Track />} />
            <Route path="/quote/:id" element={<QuoteView />} />
            <Route path="/cotizacion/:id" element={<QuoteView />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
        
        {/* Global Floating Live Chat Widget */}
        <LiveChat />
      </div>
    </Router>
  );
}

export default App;
