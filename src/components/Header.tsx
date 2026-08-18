import React from 'react';
import { UserProfile } from '../types';
import { getAvatarUrl } from '../utils/avatar';

interface HeaderProps {
  user: UserProfile | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onOpenAdmin,
}) => {
  const userAvatar = getAvatarUrl(user?.avatarUrl, user?.role);

  const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '') : '';
  const isAdminAuthorized = cleanPhone.endsWith('8838533014') || cleanPhone === '8838533014';

  return (
    <header className="bg-[#0d47a1] border-b border-blue-900/40 px-3 py-2.5 sticky top-0 z-50 flex flex-col space-y-2 shadow-md">
      {/* TOP LOGO BAR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* CONDITIONAL BACK BUTTON: Rendered when on Profile/Settings screen (NOT on main root login page) */}
          {(activeTab === 'profile' || (activeTab !== 'login' && activeTab !== 'feed')) && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  window.history.back();
                }
                onSelectTab('feed');
              }}
              className="flex items-center space-x-1.5 bg-blue-800 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-300/40 transition cursor-pointer shadow-sm mr-1"
              title="Go Back"
            >
              <span className="text-sm font-extrabold">←</span>
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onSelectTab('feed')}>
            <div className="bg-white text-[#0d47a1] font-black text-lg px-2 py-0.5 rounded-lg italic tracking-tighter shadow-sm">
              dptn
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-white flex items-center gap-1">
                Dropthan <span className="text-[9px] bg-blue-800 text-white border border-blue-300/40 px-1.5 py-0.2 rounded-full font-bold">B2B</span>
              </h1>
              <p className="text-[9px] text-blue-100/90">
                {user?.role ? `${user.role.toUpperCase()} Network` : 'Wholesale Network'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAdminAuthorized && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-[10px] sm:text-xs px-2.5 py-1 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1 active:scale-95 border border-amber-500"
              title="Admin GST & Monitoring Dashboard"
            >
              <span>🛡️</span>
              <span>Admin Panel</span>
            </button>
          )}

          {user?.location && (
            <span className="text-[10px] text-blue-100 font-semibold bg-blue-800/80 px-2 py-0.5 rounded-full border border-blue-400/40 hidden sm:inline-block">
              📍 {user.location}
            </span>
          )}

          {/* DYNAMIC CIRCULAR USER DP */}
          {user && (
            <button
              onClick={() => onSelectTab('profile')}
              className="flex items-center space-x-1.5 bg-blue-800/60 hover:bg-blue-800 p-1 rounded-full border border-blue-300/40 transition cursor-pointer"
              title="View Profile"
            >
              <img
                src={userAvatar}
                alt={user.displayName}
                loading="lazy"
                decoding="async"
                className="w-7 h-7 rounded-full object-cover border border-white/80 shadow-xs"
              />
              <span className="text-[10px] text-white font-bold pr-1.5 hidden xs:inline-block max-w-[80px] truncate">
                {user.displayName}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* REAL-TIME SEARCH BAR - RESTRICTED TO FEED TAB ONLY */}
      {activeTab === 'feed' && (
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-blue-300 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by business name or category (e.g. 'Apex', 'Coconut', 'Apparel')..."
            className="w-full bg-blue-950/40 border border-blue-400/30 text-white placeholder-blue-200/70 rounded-xl pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:bg-blue-950/70 focus:border-white transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-2 flex items-center text-blue-200 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </header>
  );
};


