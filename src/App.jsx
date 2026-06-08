import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Home from './pages/Home';
import GymTracker from './pages/GymTracker';
import Planner from './pages/Planner';
import Passes from './pages/Passes';
import Journal from './pages/Journal';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="login-screen-overlay">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-loading"></div>
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Entering MoMo's Hub...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-layout">
        <Navigation />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/gym" element={<GymTracker />} />
            <Route path="/passes" element={<Passes />} />
            <Route path="/journal" element={<Journal />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
