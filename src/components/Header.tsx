import React from 'react';
import { UserProfile } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { Home, Sparkles, User, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAdmin?: () => void;
  onOpenCreatePost?: () => void;
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

  const desktopNavItems = [
    { id: 'feed', icon: <Home className="w-4 h-4" />, label: 'Marketplace' },
    { id: 'services', icon: <Sparkles className="w-4 h-4 text-amber-300" />, label: 'Digital Services' },
    { id: 'profile', icon: <User className="w-4 h-4" />, label: 'My Account' },
  ];

  return (
    <header className="bg-[#0d47a1] border-b border-blue-900/40 px-3 sm:px-6 lg:px-8 py-2 md:py-2.5 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto w-full">
        {/* DESKTOP STREAMLINED HEADER: LEFT BRANDING, CENTER SEARCH, RIGHT NAVIGATION & ACTIONS */}
        <div className="hidden md:flex md:items-center md:justify-between md:gap-6">
          {/* LEFT: SLEEK BRAND IDENTITY */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              id="dropthan-brand-header"
              onClick={() => onSelectTab('feed')}
              className="flex items-center space-x-2.5 group cursor-pointer focus:outline-none transition-transform hover:scale-[1.02] text-left"
              title="Dropthan B2B Ecosystem - Home"
            >
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1 shadow-md shadow-blue-950/40">
                <img
                  src="/favicon.svg"
                  alt="Dropthan"
                  className="w-full h-full object-contain"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm lg:text-base font-black tracking-tight text-white leading-none">
                    DROPTHAN
                  </span>
                  <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none uppercase tracking-wide">
                    B2B
                  </span>
                </div>
                <span className="text-[9px] font-medium text-blue-200/90 tracking-tight leading-none mt-0.5">
                  Dropshippers • Wholesalers • Exporters
                </span>
              </div>
            </button>
          </div>

          {/* CENTER: SEARCH INPUT BAR (FLEXIBLE WITH MAX WIDTH) */}
          <div className="flex-1 max-w-lg mx-2">
            {activeTab === 'feed' ? (
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-blue-300 text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search products, hubs, GST suppliers..."
                  className="w-full bg-blue-950/60 hover:bg-blue-950/80 border border-blue-400/30 focus:border-white text-white placeholder-blue-200/70 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-white transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute inset-y-0 right-2.5 flex items-center text-blue-200 hover:text-white text-xs font-bold cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 text-blue-100 text-xs font-bold bg-blue-950/40 px-4 py-2 rounded-xl border border-blue-400/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Verified Direct B2B Wholesale Network</span>
              </div>
            )}
          </div>

          {/* RIGHT: NAVIGATION TABS, ACTIONS & PROFILE */}
          <div className="flex items-center space-x-2 lg:space-x-3 shrink-0">
            {/* NAVIGATION LINKS */}
            <div className="flex items-center space-x-1 bg-blue-950/40 p-1 rounded-2xl border border-blue-400/20">
              {desktopNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`desktop-nav-${item.id}`}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#0d47a1] shadow-xs'
                        : 'text-blue-100 hover:text-white hover:bg-blue-800/60'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ADMIN BUTTON (DESKTOP) */}
            {isAdminAuthorized && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs px-3 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 border border-amber-500 shrink-0"
                title="Admin GST & Monitoring Dashboard"
              >
                <ShieldCheck className="w-4 h-4 text-slate-900" />
                <span>Admin</span>
              </button>
            )}

            {/* USER PROFILE AVATAR (DESKTOP) */}
            {user && (
              <button
                onClick={() => onSelectTab('profile')}
                className="flex items-center space-x-2 bg-blue-800/60 hover:bg-blue-800/90 pl-1.5 pr-3 py-1 rounded-2xl border border-blue-300/40 transition cursor-pointer text-left shrink-0"
                title="Account & Settings"
              >
                <img
                  src={userAvatar}
                  alt={user.displayName}
                  loading="lazy"
                  decoding="async"
                  className="w-7 h-7 rounded-full object-cover border border-white/90 shadow-xs"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] text-white font-black leading-tight max-w-[90px] truncate">
                    {user.displayName}
                  </span>
                  <span className="text-[9px] text-blue-200 uppercase font-semibold leading-tight">
                    {user.role}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* MOBILE HEADER: COMPACT BRANDING & CLEAN CONTROLS */}
        <div className="md:hidden flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            {/* LEFT: SLEEK BRAND BADGE */}
            <button
              id="dropthan-brand-header-mobile"
              onClick={() => onSelectTab('feed')}
              className="flex items-center space-x-2 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm">
                <img
                  src="/favicon.svg"
                  alt="Dropthan"
                  className="w-full h-full object-contain"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-black tracking-tight text-white">
                  DROPTHAN
                </span>
                <span className="bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded uppercase">
                  B2B
                </span>
              </div>
            </button>

            {/* RIGHT: ADMIN BADGE & USER AVATAR */}
            <div className="flex items-center space-x-2">
              {isAdminAuthorized && onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-[10px] px-2.5 py-1 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1 active:scale-95 border border-amber-500"
                  title="Admin GST & Monitoring Dashboard"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-900" />
                  <span>Admin</span>
                </button>
              )}

              {user && (
                <button
                  onClick={() => onSelectTab('profile')}
                  className="flex items-center space-x-1.5 bg-blue-800/60 hover:bg-blue-800 p-0.5 rounded-full border border-blue-300/40 transition cursor-pointer"
                  title="View Profile"
                >
                  <img
                    src={userAvatar}
                    alt={user.displayName}
                    loading="lazy"
                    decoding="async"
                    className="w-7 h-7 rounded-full object-cover border border-white/80 shadow-xs"
                  />
                </button>
              )}
            </div>
          </div>

          {/* MOBILE SEARCH BAR (WHEN ON FEED TAB) */}
          {activeTab === 'feed' && (
            <div className="relative w-full pt-0.5">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-blue-300 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products, suppliers, brands or hubs..."
                className="w-full bg-blue-950/60 hover:bg-blue-950/80 border border-blue-400/30 focus:border-white text-white placeholder-blue-200/70 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-white transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-2.5 flex items-center text-blue-200 hover:text-white text-xs font-bold cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


