import React from 'react';
import { Home, Briefcase, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreatePost?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems = [
    { id: 'feed', icon: <Home className="w-5 h-5" />, label: 'Home' },
    { id: 'services', icon: <Briefcase className="w-5 h-5" />, label: 'Services' },
    { id: 'profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 z-50 flex justify-around items-center text-[11px] font-bold text-slate-500 shadow-lg">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center transition-all duration-150 cursor-pointer py-1 px-3 sm:px-5 rounded-xl ${
              isActive
                ? 'text-[#0d47a1] font-black scale-105 bg-blue-50/90'
                : 'hover:text-slate-700 text-slate-400 hover:bg-slate-50'
            }`}
          >
            <div className="leading-none mb-0.5">{item.icon}</div>
            <span className="leading-tight tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

