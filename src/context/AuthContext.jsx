import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize tracking cookie and auth state
  useEffect(() => {
    // 1. Simulate "Tracking Cookie" logic per requirements
    // This logs visit timestamps and assigns an anonymous ID if none exists
    const initTrackingCookie = () => {
      let tracker = localStorage.getItem('rheum_tracking_cookie');
      if (!tracker) {
        tracker = {
          visitorId: 'anon_' + Math.random().toString(36).substring(2, 9),
          firstVisit: new Date().toISOString(),
          visits: [],
        };
      } else {
        try {
          tracker = JSON.parse(tracker);
        } catch (e) {
          tracker = { visits: [] };
        }
      }
      tracker.visits.push(new Date().toISOString());
      localStorage.setItem('rheum_tracking_cookie', JSON.stringify(tracker));
    };

    initTrackingCookie();

    // 2. Load auth state
    const savedUser = localStorage.getItem('rheum_auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    setLoading(false);
  }, []);

  // Save auth state whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('rheum_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rheum_auth_user');
    }
  }, [user]);

  // Mock API functions for the simulated flow
  const register = (userData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Just store the pending user without logging them in fully yet
        // The Verify Email flow will complete the setup
        localStorage.setItem('rheum_pending_registration', JSON.stringify({
          ...userData,
          id: 'user_' + Math.random().toString(36).substring(2, 9),
          verified: false,
        }));
        resolve(true);
      }, 600);
    });
  };

  const verifyEmail = (code) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (code === '123456') { // Mock secure code
          const pending = localStorage.getItem('rheum_pending_registration');
          if (pending) {
            const newUser = { ...JSON.parse(pending), verified: true };
            setUser(newUser);
            localStorage.removeItem('rheum_pending_registration');
            
            // Link tracking cookie to known user
            const trackerStr = localStorage.getItem('rheum_tracking_cookie');
            if (trackerStr) {
              const tracker = JSON.parse(trackerStr);
              tracker.linkedUserId = newUser.id;
              localStorage.setItem('rheum_tracking_cookie', JSON.stringify(tracker));
            }
            
            resolve(true);
          } else {
            reject(new Error('No pending registration found.'));
          }
        } else {
          reject(new Error('Invalid verification code. Use 123456 for this demo.'));
        }
      }, 800);
    });
  };

  const login = (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Because there's no real DB, look for a saved mock user or just fake it
        // If they enter email='demo@example.com', log in a fake user
        // OR try to reuse the last registered user if the email matches
        const savedUserAuth = localStorage.getItem('rheum_auth_user');
        if (savedUserAuth) {
           const parsed = JSON.parse(savedUserAuth);
           if (parsed.email === email && parsed.password === password) {
              setUser(parsed);
              return resolve(parsed);
           }
        }
        
        // Fallback demo user if they type anything and pass 'password'
        if (password === 'password') {
          const fakeUser = {
            id: 'mock_123',
            name: 'Demo User',
            email: email,
            zip: '90210',
            diseases: ['ra', 'sle'], // Rheumatoid Arthritis, Systemic Lupus Erythematosus
            verified: true
          };
          setUser(fakeUser);
          resolve(fakeUser);
        } else {
          reject(new Error('Invalid email or password. Use password "password" for the demo.'));
        }
      }, 600);
    });
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    loading,
    register,
    verifyEmail,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
