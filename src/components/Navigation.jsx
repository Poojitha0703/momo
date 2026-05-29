import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Dumbbell, Gift, BookOpen } from 'lucide-react';
import '../index.css';

export default function Navigation() {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
        <LayoutDashboard size={20} />
        <span>Hub</span>
      </NavLink>
      <NavLink to="/planner" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
        <ListTodo size={20} />
        <span>Planner</span>
      </NavLink>
      <NavLink to="/gym" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
        <Dumbbell size={20} />
        <span>Gymson</span>
      </NavLink>
      <NavLink to="/passes" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
        <Gift size={20} />
        <span>Kit</span>
      </NavLink>
      <NavLink to="/journal" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
        <BookOpen size={20} />
        <span>Notes</span>
      </NavLink>
    </nav>
  );
}
