import React from 'react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreatePost?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems = [
    { id: 'feed', icon: '🏠', label: 'Home' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 py-2 px-6 z-50 flex justify-around text-[11px] font-bold text-slate-500 shadow-lg">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center transition cursor-pointer py-1 px-4 rounded-xl ${
              isActive ? 'text-[#0d47a1] font-black scale-105 bg-blue-50/80' : 'hover:text-slate-700 text-slate-400'
            }`}
          >
            <span className="text-lg leading-tight">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

