import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteAllPostsModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  postCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteAllPostsModal: React.FC<DeleteAllPostsModalProps> = ({
  isOpen,
  user,
  postCount,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete all posts:', err);
      setIsSubmitting(false);
    }
  };

  const displayName = user.companyName || user.displayName || user.fullName || 'this account';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-rose-100 overflow-hidden space-y-4 p-5 text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-950 leading-tight">Remove All Posts?</h3>
              <p className="text-xs text-slate-500 font-medium">Permanent account action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ACCOUNT INFO */}
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-rose-900">
            <span className="truncate max-w-[200px]">{displayName}</span>
            <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
              {postCount} {postCount === 1 ? 'Post' : 'Posts'}
            </span>
          </div>
          <p className="text-[11px] text-rose-700/90 leading-snug">
            All photos, pricing offers, and wholesale listings associated with this account will be totally removed.
          </p>
        </div>

        {/* WARNING NOTICE */}
        <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200/70 rounded-xl p-3 text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            Are you sure you want to completely remove all {postCount} posts? They will be removed from your catalog and the live marketplace feed permanently.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete All</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
