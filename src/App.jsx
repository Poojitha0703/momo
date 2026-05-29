import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import GymTracker from './pages/GymTracker';
import Planner from './pages/Planner';
import Passes from './pages/Passes';
import Journal from './pages/Journal';

function App() {
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
