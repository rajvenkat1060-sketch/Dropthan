import React, { useState, useEffect } from 'react';
import { UserProfile, RatingSummary } from '../types';
import { fetchUserRatingsFromSupabase, saveUserRatingToSupabase } from '../lib/supabase';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  targetRole?: string;
  currentUser: UserProfile | null;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetName,
  targetRole,
  currentUser,
}) => {
  const [ratingStats, setRatingStats] = useState<RatingSummary>({
    average: 0,
    count: 0,
    reviews: [],
  });
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && targetId) {
      const reviewerId = currentUser?.phone || currentUser?.id || 'anonymous';
      fetchUserRatingsFromSupabase(targetId, reviewerId).then((stats) => {
        setRatingStats(stats);
        if (stats.userRating) setSelectedStars(stats.userRating);
        if (stats.userReview) setReviewText(stats.userReview);
      });
    }
  }, [isOpen, targetId, currentUser]);

  if (!isOpen) return null;

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setFeedbackMsg('⚠️ Please log in to submit a rating and review.');
      return;
    }

    setIsSubmitting(true);
    const reviewerId = currentUser.phone || currentUser.id || 'reviewer';
    const reviewerName = currentUser.displayName || currentUser.companyName || 'Member';

    const updatedStats = await saveUserRatingToSupabase(
      targetId,
      reviewerId,
      selectedStars,
      reviewerName,
      reviewText.trim()
    );

    setRatingStats(updatedStats);
    setFeedbackMsg(`✓ Rating & Review saved successfully!`);
    setIsSubmitting(false);

    setTimeout(() => {
      setFeedbackMsg('');
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-blue-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0d47a1] text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <span>⭐ Ratings & Reviews</span>
            </h3>
            <p className="text-[11px] text-blue-100 font-medium truncate max-w-[280px]">
              {targetName} {targetRole ? `(${targetRole})` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-base flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* Average Rating Score Card */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-2xl font-black text-amber-950">{ratingStats.average.toFixed(1)}</span>
                <span className="text-amber-500 text-lg font-bold">★</span>
                <span className="text-xs text-amber-800 font-bold">/ 5.0</span>
              </div>
              <p className="text-[10px] text-amber-800 font-bold mt-0.5">
                Based on {ratingStats.count} verified {ratingStats.count === 1 ? 'user review' : 'user reviews'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1 rounded-full border border-amber-300 inline-block uppercase">
                Authentic Reviews
              </span>
            </div>
          </div>

          {/* Submit Rating Form */}
          <form onSubmit={handleSubmitRating} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Rate this Wholesaler / Brand / Product</h4>

            {/* Star Picker */}
            <div className="flex items-center space-x-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStars(star)}
                  className={`text-2xl transition cursor-pointer hover:scale-125 ${
                    selectedStars >= star ? 'text-amber-500 font-bold scale-110' : 'text-slate-300 hover:text-amber-400'
                  }`}
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
              <span className="text-xs font-extrabold text-amber-800 ml-2">
                {selectedStars} / 5 Stars
              </span>
            </div>

            {/* Review Comment Box */}
            <div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your genuine review feedback (e.g. Quality fabric, prompt dispatch, good pricing)..."
                rows={3}
                className="w-full bg-white border border-slate-300 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0d47a1] placeholder-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-xs py-2 rounded-xl shadow transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Review...' : 'Submit Rating & Review'}
            </button>

            {feedbackMsg && (
              <p className={`text-[10px] font-extrabold p-2 rounded-lg text-center ${
                feedbackMsg.includes('✓')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                {feedbackMsg}
              </p>
            )}
          </form>

          {/* List of Reviews */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Customer Reviews ({ratingStats.reviews.length})</span>
            </h4>

            {ratingStats.reviews.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-500 text-xs">
                No reviews posted yet. Be the first to submit a review!
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {ratingStats.reviews.map((item, idx) => (
                  <div
                    key={`review-item-${item.id || idx}`}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px]">
                        {item.reviewerName || 'Verified Member'}
                      </span>
                      <span className="text-amber-500 font-bold text-[11px]">
                        {'★'.repeat(item.ratingScore)} ({item.ratingScore}/5)
                      </span>
                    </div>
                    {item.reviewText && (
                      <p className="text-[11px] text-slate-600 leading-snug">{item.reviewText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
