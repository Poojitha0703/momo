import { NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';
import '../index.css';

export default function TopNav() {
  return (
    <nav className="top-nav">
      <div className="nav-brand">
        <h1>MoMo<span className="brand-emoji">🤬</span></h1>
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
      </div>
    </nav>
  );
}
