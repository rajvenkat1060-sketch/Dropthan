import React, { useState } from 'react';
import { UserProfile } from '../types';
import { fetchUserProfileStatus } from '../lib/supabase';
import { AdminVerificationModal } from './AdminVerificationModal';

interface PendingVerificationViewProps {
  user: UserProfile;
  onStatusApproved: (updatedUser: UserProfile) => void;
  onEditDetails: () => void;
  onLogout: () => void;
}

export const PendingVerificationView: React.FC<PendingVerificationViewProps> = ({
  user,
  onStatusApproved,
  onEditDetails,
  onLogout,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const cleanPhone = user?.phone ? user.phone.replace(/\D/g, '') : '';
  const isAuthorizedAdmin = cleanPhone.endsWith('8838533014') || cleanPhone === '8838533014';

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    const result = await fetchUserProfileStatus(user.phone);
    setIsChecking(false);

    if (result) {
      if (result.status.toLowerCase() === 'active') {
        const updated = { ...user, status: 'Active' as const, rejectionReason: undefined };
        localStorage.setItem('dropthan_user', JSON.stringify(updated));
        onStatusApproved(updated);
      } else if (result.status.toLowerCase() === 'rejected') {
        setStatusMessage(`Registration rejected: ${result.rejectionReason || 'Invalid GSTIN'}`);
      } else {
        setStatusMessage('Status is still Pending GST verification. Please wait for admin review.');
      }
    } else {
      setStatusMessage('Pending verification in progress.');
    }
  };

  const isPending = !user.status || user.status.toLowerCase() === 'pending';
  const isRejected = user.status?.toLowerCase() === 'rejected';

  return (
    <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-blue-100 text-slate-800 my-auto">
        {/* BRAND LOGO & HEADER ICON */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md flex items-center justify-center select-none bg-[#0d47a1] p-1.5">
            <img
              src="/dropthan-logo.png"
              alt="dptn B2B BUSINESS"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 text-2xl shadow-inner relative">
            {isPending ? '🛡️' : '❌'}
            {isPending && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full animate-ping"></span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              {isPending ? 'GST Verification Pending' : 'Registration Request Rejected'}
            </h2>
            <p className="text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
              {isPending
                ? 'Your GST is under verification. Please wait for admin approval.'
                : 'Your registration request was rejected by the admin panel.'}
            </p>
          </div>
        </div>

        {/* DETAILS CARD */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-slate-500 font-semibold">Business / Company Name:</span>
            <span className="font-extrabold text-slate-900">{user.companyName || user.displayName}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-slate-500 font-semibold">Role:</span>
            <span className="font-bold text-[#0d47a1] uppercase">{user.role.replace('_', ' ')}</span>
          </div>
          {user.gstin && (
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">GSTIN Number:</span>
              <span className="font-mono font-bold text-slate-900">{user.gstin}</span>
            </div>
          )}
          {user.iecCode && (
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">IEC Code:</span>
              <span className="font-mono font-bold text-slate-900">{user.iecCode}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">Registered Phone:</span>
            <span className="font-mono font-bold text-slate-900">{user.phone}</span>
          </div>
        </div>

        {isRejected && user.rejectionReason && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 font-medium">
            ⚠️ <strong>Rejection Reason:</strong> {user.rejectionReason}
          </div>
        )}

        {statusMessage && (
          <div className="bg-blue-50 border border-blue-200 text-[#0d47a1] text-xs p-3 rounded-xl font-bold text-center animate-fade-in">
            {statusMessage}
          </div>
        )}

        {/* BUTTON ACTIONS */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full bg-[#0d47a1] hover:bg-blue-800 text-white font-extrabold text-xs py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Verifying Status with Admin Portal...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Check Approval Status</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onEditDetails}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              ✏️ Edit Details
            </button>
            <button
              onClick={onLogout}
              className="w-full bg-slate-100 hover:bg-red-50 text-red-700 font-bold text-xs py-3 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              🚪 Log Out
            </button>
          </div>

          {/* ADMIN SHORTCUT (LOCKED STRICTLY TO +91 8838533014) */}
          {isAuthorizedAdmin && (
            <div className="pt-3 border-t border-slate-100 text-center space-y-1.5">
              <p className="text-[11px] text-slate-500 font-medium">Administrator Access Detected</p>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>🛡️ Open Admin Approval Dashboard</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN MODAL */}
      {isAuthorizedAdmin && (
        <AdminVerificationModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onStatusChanged={handleCheckStatus}
          currentUser={user}
        />
      )}
    </div>
  );
};
