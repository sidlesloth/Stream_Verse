import React from 'react';
import { Home, TrendingUp, PlaySquare, Clock, ThumbsUp, ChevronRight, LayoutDashboard } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => `
      flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
      ${isActive 
        ? 'bg-brand-primary/10 text-brand-primary' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'}
    `}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
  </NavLink>
);

const Sidebar = ({ isOpen }) => {
  const { isCreator } = useAuth();

  return (
    <aside className={`
      fixed left-0 top-14 bottom-0 w-64 border-r border-white/5 bg-black/30 backdrop-blur-sm z-40 transition-transform duration-300 ease-in-out lg:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-4 space-y-2">
        <NavItem to="/" icon={Home} label="Home" />
        <NavItem to="/trending" icon={TrendingUp} label="Trending" />
        <NavItem to="/subscriptions" icon={PlaySquare} label="Subscriptions" />
        <hr className="my-4 border-white/5" />
        <NavItem to="/library" icon={Clock} label="Library" />
        <NavItem to="/liked" icon={ThumbsUp} label="Liked Videos" />
        {isCreator && <NavItem to="/dashboard" icon={LayoutDashboard} label="Creator Dashboard" />}
      </div>
    </aside>
  );
};

export default Sidebar;

