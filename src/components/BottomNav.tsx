import React from 'react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreatePost: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, onOpenCreatePost }) => {
  const navItems = [
    { id: 'feed', icon: '🏠', label: 'Home' },
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 py-2 px-3 z-50 flex justify-around text-[10px] font-bold text-slate-500 shadow-lg">
      {navItems.map((item) => {
        const isActive = activeTab === item.id || (item.id === 'messages' && activeTab === 'chat');
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'post') {
                onOpenCreatePost();
              } else {
                onSelectTab(item.id);
              }
            }}
            className={`flex flex-col items-center transition cursor-pointer py-0.5 ${
              isActive ? 'text-[#0d47a1] font-black scale-105' : 'hover:text-slate-700 text-slate-400'
            }`}
          >
            <span className="text-base leading-tight">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

