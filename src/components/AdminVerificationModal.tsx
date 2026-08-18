import React, { useState, useEffect } from 'react';
import { UserProfile, PostItem, LikeRecord } from '../types';
import {
  fetchAllUserProfilesFromSupabase,
  updateUserStatusInSupabase,
  fetchAllSupabaseMessages,
  fetchAllLikesFromSupabase,
  subscribeToAdminRealtime,
  PersistentMessage,
} from '../lib/supabase';

interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  posts?: PostItem[];
  onStatusChanged?: () => void;
}

const ADMIN_PHONE = '8838533014';
const DEFAULT_PIN = '1234';

export const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  posts = [],
  onStatusChanged,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [likesList, setLikesList] = useState<LikeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'approvals' | 'users' | 'daily' | 'chat' | 'products' | 'interactions'>('approvals');
  const [approvalFilter, setApprovalFilter] = useState<'pending' | 'all' | 'active' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Security PIN states
  const [pinInput, setPinInput] = useState('');
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');

  // Selected User Profile View Modal
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<UserProfile | null>(null);

  // Monitoring Chat & Messages
  const [recentMessages, setRecentMessages] = useState<PersistentMessage[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Rejection Reason Modal
  const [rejectReasonModal, setRejectReasonModal] = useState<{
    isOpen: boolean;
    phone: string;
    name: string;
    reason: string;
  }>({
    isOpen: false,
    phone: '',
    name: '',
    reason: '',
  });

  // Verify phone number match (STRICTLY REQUIRED: 8838533014)
  const userPhoneClean = currentUser?.phone ? currentUser.phone.replace(/\D/g, '') : '';
  const isAuthorizedPhone = userPhoneClean.endsWith(ADMIN_PHONE) || userPhoneClean === ADMIN_PHONE;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profilesData, messagesData, likesData] = await Promise.all([
        fetchAllUserProfilesFromSupabase(),
        fetchAllSupabaseMessages(),
        fetchAllLikesFromSupabase(),
      ]);
      setProfiles(profilesData);
      setRecentMessages(messagesData);
      setLikesList(likesData);
    } catch (e) {
      console.error('Error fetching admin live data from Supabase:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isAuthorizedPhone) {
        loadData();
      }
    } else {
      // Clear inputs and auth state on modal close
      setPinInput('');
      setPinError('');
      setIsPinAuthenticated(false);
      setSelectedUserForProfile(null);
    }
  }, [isOpen, isAuthorizedPhone]);

  // SUPABASE REALTIME SUBSCRIPTION FOR LIVE ADMIN MONITORING
  useEffect(() => {
    if (!isOpen || !isPinAuthenticated || !isAuthorizedPhone) return;

    const unsubscribe = subscribeToAdminRealtime({
      onProfilesChange: () => {
        fetchAllUserProfilesFromSupabase().then((data) => {
          setProfiles(data);
          if (onStatusChanged) onStatusChanged();
        });
      },
      onMessagesChange: () => {
        fetchAllSupabaseMessages().then((msgs) => {
          setRecentMessages(msgs);
        });
      },
      onLikesChange: () => {
        fetchAllLikesFromSupabase().then((likes) => {
          setLikesList(likes);
        });
        if (onStatusChanged) onStatusChanged();
      },
      onPostsChange: () => {
        if (onStatusChanged) onStatusChanged();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, isPinAuthenticated, isAuthorizedPhone, onStatusChanged]);

  if (!isOpen) return null;

  // IF PHONE IS NOT 8838533014: STRICT ACCESS DENIED SCREEN
  if (!isAuthorizedPhone) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-red-100 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto font-black shadow-inner">
            🚫
          </div>
          <h3 className="text-lg font-black text-slate-900">Admin Access Restricted</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            The System Administrator Panel is strictly restricted to user account phone number <span className="font-bold text-slate-900">8838533014</span>.
          </p>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Logged-in Phone</p>
            <p className="text-xs font-mono font-bold text-slate-800">{currentUser?.phone || 'No phone number linked'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer shadow-md active:scale-95"
          >
            Close & Exit
          </button>
        </div>
      </div>
    );
  }

  // 4-DIGIT PIN SECURITY PROMPT (DEFAULT '1234')
  const handlePinSubmit = (pinToTest = pinInput) => {
    if (pinToTest === DEFAULT_PIN) {
      setIsPinAuthenticated(true);
      setPinError('');
      loadData();
    } else {
      setPinError('❌ Incorrect Security PIN. Please try default PIN 1234.');
      setPinInput('');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);
      setPinError('');
      if (nextPin.length === 4) {
        setTimeout(() => {
          handlePinSubmit(nextPin);
        }, 150);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError('');
  };

  // Helper to switch user profile to 8838533014 in localStorage
  const handleSetAdminPhone = () => {
    const adminUser: UserProfile = {
      id: 'usr_8838533014',
      displayName: 'System Admin (8838533014)',
      fullName: 'Primary System Administrator',
      phone: '8838533014',
      companyName: 'Dropthan Admin HQ',
      role: 'wholesaler',
      gstin: '24AAAAA0000A1Z5',
      status: 'Active',
      location: 'Surat, Gujarat',
      country: 'India',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('dropthan_user', JSON.stringify(adminUser));
    setIsPinAuthenticated(true);
    loadData();
  };

  if (!isPinAuthenticated && !isAuthorizedPhone) {
    return (
      <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl border border-blue-100 text-center">
          {/* HEADER BADGE */}
          <div className="space-y-1.5">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-sm border border-amber-200">
              🔒
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Admin Security Gatekeeper</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Enter 4-Digit Security PIN to unlock the Admin Dashboard
            </p>
            <div className="inline-block bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold px-3 py-1 rounded-full">
              🔑 Default PIN: <span className="font-mono font-black text-amber-700">1234</span>
            </div>
          </div>

          {/* 4-DIGIT DISPLAY */}
          <div className="flex justify-center gap-3 py-1">
            {[0, 1, 2, 3].map((idx) => {
              const char = pinInput[idx];
              return (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-mono text-xl font-bold transition-all ${
                    char
                      ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1] shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {char ? '•' : ''}
                </div>
              );
            })}
          </div>

          {/* ERROR MESSAGE */}
          {pinError && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 animate-bounce">
              {pinError}
            </p>
          )}

          {/* NUMERIC KEYPAD */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num)}
                className="h-11 bg-slate-100 hover:bg-slate-200 active:bg-blue-600 active:text-white font-bold text-base text-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center shadow-2xs"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => {
                setPinInput('');
                setPinError('');
              }}
              className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center"
            >
              Clear
            </button>
            <button
              onClick={() => handleKeypadPress('0')}
              className="h-11 bg-slate-100 hover:bg-slate-200 active:bg-blue-600 active:text-white font-bold text-base text-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center shadow-2xs"
            >
              0
            </button>
            <button
              onClick={handleKeypadBackspace}
              className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          {/* QUICK ACTIONS */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={handleSetAdminPhone}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition shadow cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>⚡ Authenticate Admin Phone (+91 8838533014)</span>
            </button>
            <button
              onClick={onClose}
              className="w-full text-slate-500 hover:text-slate-800 text-xs font-bold py-1 transition cursor-pointer"
            >
              Cancel & Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. FULL MONITORING DASHBOARD (WHEN AUTHENTICATED)
  const handleApprove = async (phone: string) => {
    await updateUserStatusInSupabase(phone, 'Active');
    setProfiles((prev) =>
      prev.map((p) => (p.phone === phone ? { ...p, status: 'Active', rejectionReason: undefined } : p))
    );
    if (onStatusChanged) onStatusChanged();
  };

  const handleOpenReject = (phone: string, name: string) => {
    setRejectReasonModal({
      isOpen: true,
      phone,
      name,
      reason: 'GSTIN format or company registration details could not be verified against Govt portal records.',
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectReasonModal.phone) return;
    await updateUserStatusInSupabase(rejectReasonModal.phone, 'Rejected', rejectReasonModal.reason);
    setProfiles((prev) =>
      prev.map((p) =>
        p.phone === rejectReasonModal.phone
          ? { ...p, status: 'Rejected', rejectionReason: rejectReasonModal.reason }
          : p
      )
    );
    setRejectReasonModal({ isOpen: false, phone: '', name: '', reason: '' });
    if (onStatusChanged) onStatusChanged();
  };

  // COUNTERS & FILTERS
  const pendingCount = profiles.filter((p) => !p.status || p.status.toLowerCase() === 'pending').length;
  const activeCount = profiles.filter((p) => p.status?.toLowerCase() === 'active').length;
  const rejectedCount = profiles.filter((p) => p.status?.toLowerCase() === 'rejected').length;

  const filteredProfiles = profiles.filter((p) => {
    const status = (p.status || 'Pending').toLowerCase();
    if (approvalFilter === 'pending' && status !== 'pending') return false;
    if (approvalFilter === 'active' && status !== 'active') return false;
    if (approvalFilter === 'rejected' && status !== 'rejected') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (p.companyName || p.displayName || p.fullName || '').toLowerCase().includes(q);
      const matchGstin = (p.gstin || '').toLowerCase().includes(q);
      const matchPhone = (p.phone || '').toLowerCase().includes(q);
      const matchRole = (p.role || '').toLowerCase().includes(q);
      return matchName || matchGstin || matchPhone || matchRole;
    }
    return true;
  });

  // Calculate Product analytics metrics
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((acc, p) => acc + (p.likeCount || 0), 0);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-blue-100 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* TOP HEADER */}
        <div className="bg-[#0d47a1] text-white p-4 sm:p-5 rounded-t-3xl flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Admin Command & Monitoring Panel</h2>
              <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                🔒 +91 8838533014
              </span>
            </div>
            <p className="text-xs text-blue-100">
              Real-time user approvals, messages, product views & interaction logs monitoring.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
            title="Close Admin Panel"
          >
            ✕
          </button>
        </div>

        {/* MAIN NAVIGATION TABS */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>🛡️ GST Approvals</span>
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>👥 Registered Users ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>📈 Daily User Count</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>💬 Chat Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>👁️ Item Views ({totalPosts})</span>
          </button>

          <button
            onClick={() => setActiveTab('interactions')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'interactions'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>❤️ Likes & Engagement</span>
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* TAB 1: GST APPROVALS & VERIFICATION */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              {/* STATUS METRICS */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <button
                  onClick={() => setApprovalFilter('pending')}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    approvalFilter === 'pending'
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black text-amber-600">{pendingCount}</div>
                  <div className="text-[11px] font-bold text-slate-600">Pending Approvals</div>
                </button>
                <button
                  onClick={() => setApprovalFilter('active')}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    approvalFilter === 'active'
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black text-emerald-600">{activeCount}</div>
                  <div className="text-[11px] font-bold text-slate-600">Active / Verified</div>
                </button>
                <button
                  onClick={() => setApprovalFilter('rejected')}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    approvalFilter === 'rejected'
                      ? 'bg-red-50 border-red-300 ring-2 ring-red-400/40'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black text-red-600">{rejectedCount}</div>
                  <div className="text-[11px] font-bold text-slate-600">Rejected</div>
                </button>
              </div>

              {/* SEARCH FILTER */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search profile by Company Name, GSTIN, Phone, or Role..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1]"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              </div>

              {/* LIST OF PROFILES */}
              {isLoading ? (
                <div className="text-center py-10 space-y-2">
                  <div className="inline-block w-6 h-6 border-2 border-[#0d47a1] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-medium">Fetching registered profiles from Supabase...</p>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                  <span className="text-3xl">✨</span>
                  <h3 className="text-sm font-bold text-slate-700">No {approvalFilter} registrations found</h3>
                  <p className="text-xs text-slate-500">All submitted GST registrations are processed.</p>
                </div>
              ) : (
                filteredProfiles.map((user) => {
                  const statusStr = (user.status || 'Pending').toLowerCase();
                  const isPending = statusStr === 'pending';
                  const isApproved = statusStr === 'active';
                  const isRejected = statusStr === 'rejected';

                  return (
                    <div
                      key={user.phone || user.id}
                      className={`bg-white border rounded-2xl p-4 space-y-3 transition shadow-xs hover:shadow-md ${
                        isPending
                          ? 'border-amber-200 bg-amber-50/20'
                          : isApproved
                          ? 'border-emerald-200'
                          : 'border-red-200 bg-red-50/20'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">
                              {user.companyName || user.displayName || user.fullName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-blue-100 text-[#0d47a1]">
                              {user.role.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">
                            👤 Contact: {user.fullName || user.displayName} • 📞 <span className="font-bold text-slate-800">{user.phone}</span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            📍 {user.location || 'India'}, {user.country || 'India'} • Submitted: {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                          </p>
                        </div>

                        <div>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                              ⏳ Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
                              ✓ Active / Verified
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1 rounded-full">
                              ❌ Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* GST BOX */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">GSTIN Number</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {user.gstin ? user.gstin : 'Not Applicable / Exempt'}
                          </span>
                        </div>
                        {user.iecCode && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">IEC Code (Exporter)</span>
                            <span className="font-mono font-bold text-slate-800 text-xs">{user.iecCode}</span>
                          </div>
                        )}
                      </div>

                      {user.rejectionReason && isRejected && (
                        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-2.5 font-medium">
                          ⚠️ Rejection Reason: {user.rejectionReason}
                        </div>
                      )}

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 flex-wrap">
                        <button
                          onClick={() => setSelectedUserForProfile(user)}
                          className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          👁️ Full Profile Details
                        </button>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleOpenReject(user.phone, user.companyName || user.displayName)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
                            >
                              ❌ Reject Registration
                            </button>
                            <button
                              onClick={() => handleApprove(user.phone)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-1.5 rounded-xl transition shadow cursor-pointer flex items-center gap-1"
                            >
                              <span>✓ Approve GST & Activate</span>
                            </button>
                          </>
                        )}

                        {isRejected && (
                          <button
                            onClick={() => handleApprove(user.phone)}
                            className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            🔄 Re-evaluate & Approve
                          </button>
                        )}

                        {isApproved && (
                          <button
                            onClick={() => handleOpenReject(user.phone, user.companyName || user.displayName)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            Revoke Access
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2.5: DAILY USER COUNT & ACTIVE METRICS */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-[#0d47a1] text-white rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-black tracking-tight">Database & User Activity Monitor</h3>
                    <p className="text-xs text-blue-100">Live data directly queried from Supabase profiles, posts, and messages.</p>
                  </div>
                  <span className="bg-emerald-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full animate-pulse">
                    🟢 Live Database Stream
                  </span>
                </div>
              </div>

              {/* STAT METRICS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Active Verified</span>
                  <span className="text-xl font-black text-emerald-700">{activeCount}</span>
                  <span className="text-[10px] text-emerald-600 block">Approved Accounts</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Pending Review</span>
                  <span className="text-xl font-black text-amber-700">{pendingCount}</span>
                  <span className="text-[10px] text-amber-600 block">GST Verifications</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Total Registered</span>
                  <span className="text-xl font-black text-[#0d47a1]">{profiles.length}</span>
                  <span className="text-[10px] text-blue-600 block">Supabase Profiles</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">Total Messages</span>
                  <span className="text-xl font-black text-purple-700">{recentMessages.length}</span>
                  <span className="text-[10px] text-purple-600 block">Live Chat Logs</span>
                </div>
              </div>

              {/* USER ACTIVITY SUMMARY TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  👤 Real-Time User Accounts in Database ({profiles.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-100 text-[#0d47a1] font-black uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">User / Company</th>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Registered</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profiles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-500 font-medium text-xs">
                            No profiles found in Supabase database yet.
                          </td>
                        </tr>
                      ) : (
                        profiles.map((user, i) => (
                          <tr key={user.phone || user.id || i} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-bold text-slate-900">
                              {user.companyName || user.displayName || user.fullName || 'Member'}
                            </td>
                            <td className="p-2.5">
                              <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 uppercase">
                                {user.role}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{user.phone}</td>
                            <td className="p-2.5">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  user.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : user.status === 'Rejected'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {user.status || 'Pending'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => setSelectedUserForProfile(user)}
                                className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs"
                              >
                                👁️ Inspect
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED USERS MONITOR */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-[#0d47a1]">Registered User Database Monitor</h3>
                  <p className="text-[11px] text-blue-900">Total {profiles.length} user accounts saved in Supabase `profiles` table.</p>
                </div>
                <button
                  onClick={loadData}
                  className="bg-white hover:bg-blue-100 text-[#0d47a1] border border-blue-300 font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  🔄 Refresh Data
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-[#0d47a1] font-black uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">User / Company</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">GSTIN</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {profiles.map((p, i) => (
                      <tr key={p.phone || i} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900">
                          {p.companyName || p.fullName || p.displayName}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{p.phone}</td>
                        <td className="p-3">
                          <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                            {p.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{p.gstin || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{p.location || 'India'}</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status?.toLowerCase() === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status?.toLowerCase() === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedUserForProfile(p)}
                            className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs active:scale-95"
                          >
                            👁️ View Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CHAT LOGS MONITOR */}
          {activeTab === 'chat' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800">User Communication & Inquiry Logs</h3>
                  <p className="text-[11px] text-slate-500">Monitor messages exchanged between buyers and suppliers.</p>
                </div>
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Filter chat messages..."
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              {recentMessages.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-1">
                  <span className="text-2xl">💬</span>
                  <p className="text-xs font-bold text-slate-700">No recent chat logs found</p>
                  <p className="text-[11px] text-slate-500">User chats initiated on the platform will be logged here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentMessages
                    .filter((m) => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                    .map((msg, i) => (
                      <div key={msg.id || i} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#0d47a1]">{msg.sender_name || 'User'}</span>
                          <span className="text-slate-400">{msg.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRODUCT ITEM VIEWS */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center bg-blue-50 border border-blue-200 rounded-2xl p-3">
                <div>
                  <div className="text-base font-black text-[#0d47a1]">{totalPosts}</div>
                  <div className="text-[10px] font-bold text-blue-900">Total Catalog Listings</div>
                </div>
                <div>
                  <div className="text-base font-black text-amber-700">{totalLikes}</div>
                  <div className="text-[10px] font-bold text-amber-900">Total User Likes</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {posts.map((post) => {
                  return (
                    <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-3 flex gap-3 shadow-2xs">
                      <img
                        src={post.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200'}
                        alt={post.title}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                      />
                      <div className="flex-1 space-y-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{post.title}</h4>
                        <p className="text-[11px] text-[#0d47a1] font-bold">₹{post.moqPrice || 'N/A'}</p>
                        <p className="text-[10px] text-slate-500">🏢 Supplier: {post.author}</p>
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-600 font-medium">
                          <span>📦 MOQ: {post.moq || 1} units</span>
                          <span className="font-bold text-red-600">❤️ {post.likeCount || 0} Likes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: LIKES & ENGAGEMENT */}
          {activeTab === 'interactions' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <span>❤️</span> Live Supabase Likes & Engagement Stream
                  </h3>
                  <p className="text-[11px] text-amber-900">
                    Real-time buyer interest, saved products, and live interactions from Supabase `likes` table ({likesList.length} total like records).
                  </p>
                </div>
                <span className="bg-amber-200 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-300">
                  {likesList.length} Live Likes Tracked
                </span>
              </div>

              {/* LIVE LIKE RECORDS STREAM */}
              {likesList.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚡</span> Recent Live Like Activity Log
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {likesList.slice(0, 20).map((like, idx) => (
                      <div
                        key={like.id || `${like.post_id}-${like.user_phone}-${idx}`}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-red-500">❤️</span>
                          <div>
                            <span className="font-bold text-slate-900">{like.user_name || 'Buyer'}</span>
                            <span className="font-mono text-[10px] text-slate-500 ml-1.5">({like.user_phone})</span>
                            <p className="text-[10px] text-slate-600">
                              Liked listing: <span className="font-bold text-[#0d47a1]">{like.post_title || `Post #${like.post_id}`}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {like.created_at ? new Date(like.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRODUCT LIKES AGGREGATE BREAKDOWN */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Catalog Listings by Like Volume
                </h4>
                {posts.map((post) => (
                  <div key={post.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{post.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate">Author: {post.author} • Location: {post.location || 'India'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                        ❤️ {post.likeCount || 0} Likes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULL PROFILE DETAIL MODAL OVERLAY */}
      {selectedUserForProfile && (
        <div className="fixed inset-0 z-[160] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl border border-blue-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {selectedUserForProfile.companyName || selectedUserForProfile.fullName || selectedUserForProfile.displayName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Full Member Profile Details</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForProfile(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile Content */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <img
                  src={selectedUserForProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={selectedUserForProfile.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {selectedUserForProfile.displayName}
                    </span>
                    <span className="bg-blue-100 text-[#0d47a1] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {selectedUserForProfile.role}
                    </span>
                  </div>
                  <p className="text-slate-600 font-bold flex items-center gap-1">
                    <span>📞 {selectedUserForProfile.phone}</span>
                    <a
                      href={`https://wa.me/91${selectedUserForProfile.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] hover:bg-emerald-100 transition"
                    >
                      💬 WhatsApp
                    </a>
                  </p>
                </div>
              </div>

              {/* BUSINESS BIO / DESCRIPTION */}
              {(selectedUserForProfile.bio || selectedUserForProfile.description) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    📝 Business Bio / Custom Words
                  </span>
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                    {selectedUserForProfile.bio || selectedUserForProfile.description}
                  </p>
                </div>
              )}

              {/* GST & Registration Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">GSTIN Number</span>
                  <span className="font-mono font-black text-slate-900 text-xs">
                    {selectedUserForProfile.gstin || 'Not Provided / Exempt'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">IEC Code (Exporter)</span>
                  <span className="font-mono font-black text-slate-900 text-xs">
                    {selectedUserForProfile.iecCode || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Status Badge & Rejection Reason */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">GST Verification Status</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedUserForProfile.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedUserForProfile.status?.toLowerCase() === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedUserForProfile.status || 'Pending'}
                  </span>
                </div>
                {selectedUserForProfile.rejectionReason && (
                  <p className="text-[11px] text-red-700 font-medium pt-1">
                    ⚠️ Rejection Note: {selectedUserForProfile.rejectionReason}
                  </p>
                )}
              </div>

              {/* Address & GPS */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Store / Business Address</span>
                <p className="text-slate-800 font-medium">
                  📍 {selectedUserForProfile.storeAddress || selectedUserForProfile.location || 'India'}, {selectedUserForProfile.country || 'India'}
                </p>
                {selectedUserForProfile.lat && selectedUserForProfile.lng && (
                  <p className="text-[10px] font-mono text-slate-500">
                    GPS Coordinates: {selectedUserForProfile.lat.toFixed(5)}, {selectedUserForProfile.lng.toFixed(5)}
                  </p>
                )}
              </div>

              {/* Account Metadata */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex justify-between">
                <span>Created Date: {new Date(selectedUserForProfile.createdAt || Date.now()).toLocaleDateString()}</span>
                <span>Role: <strong className="text-slate-800">{selectedUserForProfile.role}</strong></span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedUserForProfile(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Close Profile
              </button>
              
              <div className="flex items-center gap-2">
                {selectedUserForProfile.status?.toLowerCase() !== 'active' && (
                  <button
                    onClick={() => {
                      handleApprove(selectedUserForProfile.phone);
                      setSelectedUserForProfile(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow cursor-pointer"
                  >
                    Approve GST
                  </button>
                )}
                {selectedUserForProfile.status?.toLowerCase() !== 'rejected' && (
                  <button
                    onClick={() => {
                      const phoneToReject = selectedUserForProfile.phone;
                      const nameToReject = selectedUserForProfile.companyName || selectedUserForProfile.displayName;
                      setSelectedUserForProfile(null);
                      handleOpenReject(phoneToReject, nameToReject);
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer border border-red-200"
                  >
                    Reject GST
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON PROMPT MODAL */}
      {rejectReasonModal.isOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl border border-red-100">
            <h3 className="text-sm font-extrabold text-slate-900">
              Reject Registration: {rejectReasonModal.name}
            </h3>
            <p className="text-xs text-slate-600">
              Specify the reason for rejecting this GST registration. The user will be notified upon logging in.
            </p>
            <textarea
              rows={3}
              value={rejectReasonModal.reason}
              onChange={(e) => setRejectReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. GSTIN details do not match business registration address."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectReasonModal({ isOpen: false, phone: '', name: '', reason: '' })}
                className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
