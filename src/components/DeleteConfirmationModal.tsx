import React, { useState } from 'react';
import { PostItem } from '../types';
import { getPostImageUrl } from '../utils/image';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  post: PostItem | null;
  onClose: () => void;
  onConfirm: (postId: string) => Promise<void> | void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  post,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !post) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(post.id);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete post:', err);
      setIsSubmitting(false);
    }
  };

  const previewImg = getPostImageUrl(post);
  const title = post.title || post.productName || post.caption || 'Product Offer';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-5 text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Delete Post?</h3>
              <p className="text-xs text-slate-500 font-medium">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* POST PREVIEW CARD */}
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
          {previewImg && (
            <img
              src={previewImg}
              alt={title}
              className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-200"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate">{title}</h4>
            <div className="flex items-center space-x-2 text-[11px] text-slate-600 mt-0.5">
              <span className="font-extrabold text-[#0d47a1]">{post.price || 'Wholesale Rate'}</span>
              <span>•</span>
              <span className="truncate">{post.moq || 'Direct MOQ'}</span>
            </div>
          </div>
        </div>

        {/* WARNING NOTICE */}
        <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200/70 rounded-xl p-3 text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            Are you sure you want to permanently delete this photo and offer? It will be removed from your catalog and the live marketplace feed.
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
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Deleting...</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
