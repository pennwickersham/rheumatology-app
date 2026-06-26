import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { useAuth } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Diseases from './pages/Diseases';
import Medications from './pages/Medications';
import SymptomLookup from './pages/SymptomLookup';
import ClinicVisit from './pages/ClinicVisit';
import WhenToCall from './pages/WhenToCall';
import Chatbot from './pages/Chatbot';
import Tracker from './pages/Tracker';
import Interactions from './pages/Interactions';
import ClinicalTrials from './pages/ClinicalTrials';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

function DisclaimerModal({ onAccept, onDecline }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal" style={{ width: '90%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)', border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          <span style={{ fontSize: '3rem' }}>⚕️</span>
        </div>
        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          Terms & Disclaimers
        </h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            <strong style={{ color: 'var(--warning)' }}>This app is for informational purposes only and does NOT provide medical advice.</strong>
          </p>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            The content is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your rheumatologist or other qualified health provider with any questions regarding a medical condition.
          </p>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            Never disregard professional medical advice or delay seeking it because of something you have read in this app.
          </p>
          <div style={{ padding: 'var(--space-md)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-lg)' }}>
            <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>Privacy & Cookies</strong>
            <p style={{ marginBottom: 0, fontSize: '0.9em' }}>
              Rheum Companion uses local device storage ("cookies") to securely save your profile, personalize your experience, and track basic app usage. By using this app, you consent to our use of these tracking technologies.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <button
            className="btn btn--primary btn--full"
            onClick={onAccept}
            style={{ fontWeight: 700, fontSize: 'var(--font-md)', padding: 'var(--space-md)' }}
          >
            I Understand & Agree
          </button>
          <button
            className="btn btn--outline btn--full"
            onClick={onDecline}
            style={{ fontWeight: 700, fontSize: 'var(--font-md)', padding: 'var(--space-md)' }}
          >
            Opt-Out & Exit App
          </button>
        </div>
      </div>
    </div>
  );
}

function HardwareBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBack = async () => {
      // If we are on the Home screen or Login screen, prompt to exit
      if (location.pathname === '/' || location.pathname === '/login') {
        const { value } = await Dialog.confirm({
          title: 'Confirm Exit',
          message: 'Are you sure you want to quit Rheum Companion?',
        });
        if (value) {
          CapacitorApp.exitApp();
        }
      } else {
        // Normal navigation back
        navigate(-1);
      }
    };

    const backListener = CapacitorApp.addListener('backButton', handleBack);

    return () => {
      backListener.then(listener => listener.remove());
    };
  }, [navigate, location]);

  return null;
}

// Protected Route Wrapper
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }
  
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const { user } = useAuth();

  // Re-trigger disclaimer every time the app comes to foreground
  useEffect(() => {
    const handleAppStateChange = ({ isActive }) => {
      if (isActive) {
        setDisclaimerAccepted(false);
      }
    };
    
    const stateListener = CapacitorApp.addListener('appStateChange', handleAppStateChange);
    
    return () => {
      stateListener.then(listener => listener.remove());
    };
  }, []);

  const handleDecline = () => {
    CapacitorApp.exitApp();
  };

  // Only show disclaimer if they are logged in and haven't accepted it yet
  const showDisclaimer = user && !disclaimerAccepted;

  return (
    <SubscriptionProvider>
      {showDisclaimer && <DisclaimerModal onAccept={() => setDisclaimerAccepted(true)} onDecline={handleDecline} />}
      <Router>
        <HardwareBackButton />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Layout><Login /></Layout>} />
          <Route path="/register" element={<Layout><Register /></Layout>} />
          <Route path="/verify" element={<Layout><VerifyEmail /></Layout>} />
          
          {/* Protected App Routes */}
          <Route path="/*" element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/diseases" element={<Diseases />} />
                  <Route path="/diseases/:id" element={<Diseases />} />
                  <Route path="/medications" element={<Medications />} />
                  <Route path="/medications/:id" element={<Medications />} />
                  <Route path="/symptom-lookup" element={<SymptomLookup />} />
                  <Route path="/clinic-visit" element={<ClinicVisit />} />
                  <Route path="/when-to-call" element={<WhenToCall />} />
                  <Route path="/chatbot" element={<Chatbot />} />
                  <Route path="/tracker" element={<Tracker />} />
                  <Route path="/interactions" element={<Interactions />} />
                  <Route path="/clinical-trials" element={<ClinicalTrials />} />
                </Routes>
              </Layout>
            </RequireAuth>
          } />
        </Routes>
      </Router>
    </SubscriptionProvider>
  );
}
