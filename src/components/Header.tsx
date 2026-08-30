import React from 'react';
import { UserProfile } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { Home, Briefcase, User, PlusCircle, ShieldCheck } from 'lucide-react';

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
  onOpenCreatePost,
}) => {
  const userAvatar = getAvatarUrl(user?.avatarUrl, user?.role);

  const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '') : '';
  const isAdminAuthorized = cleanPhone.endsWith('8838533014') || cleanPhone === '8838533014';

  const desktopNavItems = [
    { id: 'feed', icon: <Home className="w-4 h-4" />, label: 'Marketplace' },
    { id: 'services', icon: <Briefcase className="w-4 h-4" />, label: 'Business Services' },
    { id: 'profile', icon: <User className="w-4 h-4" />, label: 'My Account' },
  ];

  return (
    <header className="bg-[#0d47a1] border-b border-blue-900/40 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-4">
        {/* TOP ROW: LOGO & MOBILE USER CONTROLS */}
        <div className="flex items-center justify-between shrink-0">
          <div
            id="dropthan-brand-header"
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            onClick={() => onSelectTab('feed')}
          >
            <div className="bg-white text-[#0d47a1] font-black text-sm sm:text-base px-2.5 py-0.5 rounded-xl italic tracking-tighter shadow-sm flex items-center justify-center select-none shrink-0 border border-blue-200/50 group-hover:scale-105 transition-transform">
              dptn
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                Dropthan <span className="text-[9px] sm:text-[10px] bg-blue-800 text-blue-100 border border-blue-300/40 px-1.5 py-0.2 rounded-full font-bold">B2B Ecosystem</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-blue-100/90 font-medium">
                {user?.role ? `${user.role.toUpperCase()} Network` : 'Verified Wholesalers & Services'}
              </p>
            </div>
          </div>

          {/* MOBILE ONLY USER BADGES */}
          <div className="flex items-center space-x-1.5 md:hidden">
            {isAdminAuthorized && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-[10px] px-2 py-1 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1 active:scale-95 border border-amber-500"
                title="Admin GST & Monitoring Dashboard"
              >
                <span>🛡️</span>
                <span>Admin</span>
              </button>
            )}

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
              </button>
            )}
          </div>
        </div>

        {/* SEARCH BAR (FLEXIBLE EXPANDABLE ON DESKTOP) */}
        {activeTab === 'feed' ? (
          <div className="relative flex-1 max-w-full md:max-w-md lg:max-w-xl">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-blue-300 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products, suppliers, brands or hubs (e.g. 'Cotton', 'Apex', 'Surat')..."
              className="w-full bg-blue-950/50 hover:bg-blue-950/70 border border-blue-400/30 focus:border-white text-white placeholder-blue-200/70 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-white transition shadow-inner"
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
          <div className="hidden md:block flex-1" />
        )}

        {/* DESKTOP NAVIGATION TABS & ACTION BUTTONS */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-3 shrink-0">
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

          {/* POST OFFER CTA (DESKTOP) */}
          {onOpenCreatePost && (
            <button
              onClick={onOpenCreatePost}
              className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
              title="Post New B2B Offer / Listing"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Post Offer</span>
            </button>
          )}

          {/* ADMIN BUTTON (DESKTOP) */}
          {isAdminAuthorized && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs px-3 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 border border-amber-500"
              title="Admin GST & Monitoring Dashboard"
            >
              <ShieldCheck className="w-4 h-4 text-slate-900" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* USER PROFILE AVATAR & NAME (DESKTOP) */}
          {user && (
            <button
              onClick={() => onSelectTab('profile')}
              className="flex items-center space-x-2 bg-blue-800/60 hover:bg-blue-800/90 pl-1.5 pr-3 py-1 rounded-2xl border border-blue-300/40 transition cursor-pointer text-left"
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
                <span className="text-[11px] text-white font-black leading-tight max-w-[100px] truncate">
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
    </header>
  );
};


