import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopNav from './components/TopNav';
import Home from './pages/Home';
import GymTracker from './pages/GymTracker';

function App() {
  return (
    <Router>
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gym" element={<GymTracker />} />
      </Routes>
    </Router>
  );
}

export default App;
