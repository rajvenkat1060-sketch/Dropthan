import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PostItem, UserRole, UserProfile } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { ImageCarousel } from './ImageCarousel';
import { ReviewModal } from './ReviewModal';
import { LocationMapModal } from './LocationMapModal';
import { PublicProfileModal } from './PublicProfileModal';

interface FeedTabProps {
  posts: PostItem[];
  currentUser?: UserProfile | null;
  searchQuery?: string;
  onOpenVendorChat: (post: PostItem) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
}

const PAGE_SIZE = 8;

// Smart search synonym & category taxonomy mapping
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  coconut: ['organic', 'agro', 'copra', 'farming', 'oil', 'agro_wholesaler', 'organic_wholesaler', 'spices', 'food', 'nature', 'agriculture', 'plantation'],
  apparel: ['textile', 'clothing', 'garment', 'dress', 'saree', 'kurti', 'shirt', 'fabric', 'cotton', 'denim', 'wholesaler', 'fashion', 'tshirt', 'cloth'],
  textile: ['apparel', 'clothing', 'fabric', 'cotton', 'yarn', 'silk', 'weaving', 'surat', 'tirupur', 'wholesaler'],
  export: ['exporter', 'iec', 'international', 'container', 'freight', 'global', 'shipping', 'customs', 'spice'],
  organic: ['organic_wholesaler', 'agro', 'spice', 'ayurveda', 'coconut', 'herbal', 'natural', 'pure', 'farm', 'honey'],
  influencer: ['creator', 'social', 'reels', 'promotion', 'collab', 'shoutout', 'ugc', 'model', 'video'],
  printing: ['packaging', 'box', 'label', 'carton', 'corrugated', 'pouch', 'polybag', 'tag', 'print'],
  packaging: ['printing', 'box', 'label', 'carton', 'corrugated', 'tape', 'pouch', 'bag'],
  marketing: ['agency', 'ads', 'meta', 'facebook', 'google', 'performance', 'roas', 'scale', 'growth', 'leads'],
  electronics: ['gadget', 'earbuds', 'mobile', 'charger', 'bluetooth', 'accessories', 'nova', 'speaker'],
};

export const FeedTab: React.FC<FeedTabProps> = ({
  posts,
  currentUser,
  searchQuery = '',
  onOpenVendorChat,
  onToggleLike,
  onToggleSave,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{ locationName: string; authorName?: string } | null>(null);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Public profile modal state
  const [publicProfileState, setPublicProfileState] = useState<{
    isOpen: boolean;
    vendorName: string;
    vendorRole?: string;
    vendorPost?: PostItem | null;
  }>({
    isOpen: false,
    vendorName: '',
  });

  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    targetId: string;
    targetName: string;
    targetRole?: string;
  }>({
    isOpen: false,
    targetId: '',
    targetName: '',
  });

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: '🔥 All Offers' },
    { id: 'wholesaler', label: '📦 Wholesalers' },
    { id: 'exporter', label: '🌐 Exporters' },
    { id: 'organic_wholesaler', label: '🌱 Organic Wholesalers' },
    { id: 'influencer', label: '⭐ Influencers' },
    { id: 'printing', label: '🖨️ Print & Packaging' },
    { id: 'marketing', label: '📢 Agencies & Marketing' },
    { id: 'reseller', label: '🏷️ Resellers' },
  ];

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchQuery]);

  // Helper function to match post category/role
  const matchCategory = (p: PostItem, catId: string): boolean => {
    if (catId === 'all') return true;

    const roleClean = (p.role || '').toLowerCase();
    const catClean = (p.category || '').toLowerCase();
    const captionClean = (p.caption || '').toLowerCase();

    if (catId === 'wholesaler') {
      return (
        roleClean === 'wholesaler' ||
        roleClean === 'dropshipper' ||
        catClean.includes('wholesal') ||
        catClean.includes('apparel') ||
        catClean.includes('textile') ||
        catClean.includes('electronics')
      );
    }

    if (catId === 'organic_wholesaler') {
      return (
        roleClean === 'organic_wholesaler' ||
        catClean.includes('organic') ||
        catClean.includes('agro') ||
        catClean.includes('spice') ||
        catClean.includes('food') ||
        catClean.includes('coconut') ||
        captionClean.includes('organic') ||
        captionClean.includes('coconut')
      );
    }

    if (catId === 'exporter') {
      return (
        roleClean === 'exporter' ||
        catClean.includes('export') ||
        captionClean.includes('export')
      );
    }

    if (catId === 'influencer') {
      return (
        roleClean === 'influencer' ||
        catClean.includes('influenc') ||
        captionClean.includes('influenc')
      );
    }

    if (catId === 'printing') {
      return (
        roleClean === 'printing' ||
        catClean.includes('packag') ||
        catClean.includes('print') ||
        catClean.includes('box') ||
        catClean.includes('label')
      );
    }

    if (catId === 'marketing') {
      return (
        roleClean === 'marketing' ||
        catClean.includes('market') ||
        catClean.includes('agency') ||
        catClean.includes('ad')
      );
    }

    if (catId === 'reseller') {
      return (
        roleClean === 'reseller' ||
        roleClean === 'dropshipper' ||
        catClean.includes('resell') ||
        catClean.includes('dropship')
      );
    }

    return roleClean === catId || catClean.includes(catId);
  };

  // SMART DUAL SEARCH ALGORITHM: Match by Business Name & Category / Product Keywords
  const filteredPosts = useMemo(() => {
    const categoryFiltered = posts.filter((p) => matchCategory(p, activeCategory));

    const rawQuery = searchQuery.trim().toLowerCase();
    if (!rawQuery) return categoryFiltered;

    // Tokenize query words
    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    // Expand search tokens with synonym taxonomy
    const expandedTokens: string[] = [];
    queryTokens.forEach((tok) => {
      expandedTokens.push(tok);
      // Check if token matches any category key
      Object.keys(CATEGORY_SYNONYMS).forEach((catKey) => {
        if (tok.includes(catKey) || catKey.includes(tok)) {
          expandedTokens.push(...CATEGORY_SYNONYMS[catKey]);
        }
      });
    });

    const uniqueExpandedTokens = Array.from(new Set(expandedTokens));

    return categoryFiltered.filter((p) => {
      const authorClean = (p.author || '').toLowerCase();
      const captionClean = (p.caption || '').toLowerCase();
      const categoryClean = (p.category || '').toLowerCase();
      const roleClean = (p.role || '').toLowerCase().replace(/_/g, ' ');
      const locationClean = (p.location || '').toLowerCase();
      const countryClean = (p.country || '').toLowerCase();
      const priceClean = (p.price || '').toLowerCase();
      const moqClean = (p.moq || '').toLowerCase();
      const phoneClean = (p.phone || '').toLowerCase();
      const gstinClean = (p.gstin || '').toLowerCase();

      // Combined searchable text block
      const searchableCorpus = `${authorClean} ${captionClean} ${categoryClean} ${roleClean} ${locationClean} ${countryClean} ${priceClean} ${moqClean} ${phoneClean} ${gstinClean}`;

      // 1. Check direct query token match (strict AND across raw words)
      const matchesDirectWords = queryTokens.every((word) => searchableCorpus.includes(word));
      if (matchesDirectWords) return true;

      // 2. Check business name / author exact or partial match
      const matchesBusinessName = queryTokens.some((tok) => authorClean.includes(tok));
      if (matchesBusinessName) return true;

      // 3. Check expanded category / keyword semantic match
      const matchesCategoryKeywords = uniqueExpandedTokens.some((tok) =>
        searchableCorpus.includes(tok)
      );
      return matchesCategoryKeywords;
    });
  }, [posts, activeCategory, searchQuery]);

  // Slice visible items for virtualization / DOM optimization
  const visiblePosts = useMemo(() => {
    return filteredPosts.slice(0, visibleCount);
  }, [filteredPosts, visibleCount]);

  const hasMore = visibleCount < filteredPosts.length;

  // IntersectionObserver for auto infinite scroll loading
  useEffect(() => {
    if (!hasMore || !observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredPosts.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, filteredPosts.length]);

  const handleShare = async (post: PostItem) => {
    const shareData = {
      title: `Dropthan Offer: ${post.author}`,
      text: `${post.author} (${post.price}, ${post.moq}): ${post.caption}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share cancelled or error:', err);
      }
    } else {
      navigator.clipboard.writeText(`${post.author} - ${post.price} (${post.moq}): ${post.caption}`);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2000);
    }
  };

  const openPublicProfile = (post: PostItem) => {
    setPublicProfileState({
      isOpen: true,
      vendorName: post.author,
      vendorRole: post.role,
      vendorPost: post,
    });
  };

  return (
    <div className="space-y-3.5">
      {/* Category filter buttons */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#0d47a1] text-white shadow'
                  : 'bg-white text-[#0d47a1] border border-blue-200 hover:bg-blue-50'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* SMART SEARCH RESULT SUMMARY & DUAL-SEARCH TAGS */}
      {searchQuery && (
        <div className="bg-blue-50 border border-blue-200 text-[#0d47a1] rounded-2xl p-3 space-y-2 text-xs shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <span>🔍</span>
              <span>
                Found <strong>{filteredPosts.length}</strong> supplier results for "{searchQuery}"
              </span>
            </span>
            <span className="text-[10px] bg-blue-100/90 text-[#0d47a1] font-extrabold px-2 py-0.5 rounded-md">
              Dual-Search Active
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
            <span className="text-slate-600 font-semibold text-[10px]">Filter match:</span>
            <span className="bg-white border border-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
              🏢 Business Name
            </span>
            <span className="bg-white border border-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
              🏷️ Category & Keywords
            </span>
          </div>
        </div>
      )}

      {/* Feed Posts List */}
      <div className="space-y-3.5">
        {filteredPosts.length === 0 ? (
          <div className="bg-white border border-blue-100 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-sm space-y-2">
            <span className="text-3xl block">🔍</span>
            <p className="font-bold text-slate-800 text-sm">No suppliers or offers found</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No businesses or categories match "${searchQuery}". Try typing keywords like 'Apparel', 'Coconut', 'Exporter', 'Agency', or a company name.`
                : `Click "➕ Post Offer" to list your products or services!`}
            </p>
          </div>
        ) : (
          visiblePosts.map((post) => {
            return (
              <div
                key={post.id}
                className="bg-white border border-blue-100 rounded-2xl p-3.5 space-y-2.5 shadow-sm hover:shadow-md hover:border-blue-200 transition"
              >
                {/* AUTHOR HEADER -> PUBLIC PROFILE TRIGGER */}
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => openPublicProfile(post)}
                    className="flex items-center space-x-2.5 cursor-pointer group flex-1 min-w-0"
                    title={`View Public Profile of ${post.author}`}
                  >
                    {/* AVATAR WITH STORY RING ON HOVER */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-[#0d47a1] group-hover:scale-105 transition">
                        <img
                          src={getAvatarUrl(post.authorAvatar, post.role)}
                          alt={post.author}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full rounded-full border border-white object-cover bg-white"
                        />
                      </div>
                      {post.gstin && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 bg-[#0d47a1] text-white text-[7px] font-black px-1 rounded-full border border-white"
                          title="Verified GST"
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0d47a1] transition flex items-center gap-1 flex-wrap">
                        <span className="truncate">{post.author}</span>
                        {post.role === 'organic_wholesaler' ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[8px] font-extrabold px-1.5 py-0.2 rounded">
                            🌱 Organic
                          </span>
                        ) : (
                          <span className="text-[#0d47a1] text-[9px] font-bold">✓ GST</span>
                        )}
                        {post.role === 'exporter' && (
                          <span className="text-blue-700 bg-blue-50 border border-blue-200 text-[8px] font-extrabold px-1.5 py-0.2 rounded">
                            🌐 IEC
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
                        <span>📍 {post.location || 'Location'}{post.country ? `, ${post.country}` : ''}</span>
                        <span className="text-[#0d47a1] font-bold">• View Profile ↗</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openPublicProfile(post)}
                      className="text-[9px] bg-blue-50 hover:bg-blue-100 text-[#0d47a1] px-2.5 py-1 rounded-full font-bold uppercase border border-blue-200 transition cursor-pointer shadow-2xs active:scale-95"
                      title="View Full Public Profile"
                    >
                      {post.role} ↗
                    </button>
                  </div>
                </div>

                {/* PHOTO CAROUSEL */}
                {((post.images && post.images.length > 0) || post.img) && (
                  <ImageCarousel
                    images={post.images && post.images.length > 0 ? post.images : [post.img]}
                    fallbackImg={
                      post.img ||
                      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
                    }
                    alt={post.caption || 'Product offer'}
                    onDoubleTap={() => onToggleLike(post.id)}
                  />
                )}

                {/* POST ACTION BAR (LIKE, SAVE, REVIEW, PROFILE, SHARE) */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center space-x-2">
                    {/* LIKE BUTTON */}
                    <button
                      onClick={() => onToggleLike(post.id)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                        post.isLiked
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{post.isLiked ? '❤️' : '🤍'}</span>
                      <span className="text-[11px]">{post.likesCount || 0}</span>
                    </button>

                    {/* SAVE / BOOKMARK BUTTON */}
                    <button
                      onClick={() => onToggleSave(post.id)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                        post.isSaved
                          ? 'bg-blue-50 text-[#0d47a1] border border-blue-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{post.isSaved ? '🔖 Saved' : '🔖 Save'}</span>
                    </button>

                    {/* RATE & REVIEW BUTTON */}
                    <button
                      onClick={() =>
                        setReviewModalState({
                          isOpen: true,
                          targetId: post.author,
                          targetName: post.author,
                          targetRole: post.role,
                        })
                      }
                      className="flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer"
                      title="Rate & Review Wholesaler"
                    >
                      <span>⭐</span>
                      <span>Review</span>
                    </button>
                  </div>

                  {/* SHARE BUTTON */}
                  <button
                    onClick={() => handleShare(post)}
                    className="flex items-center space-x-1 px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-medium transition cursor-pointer"
                  >
                    <span>📤</span>
                    <span>{copiedPostId === post.id ? 'Copied!' : 'Share'}</span>
                  </button>
                </div>

                {/* CAPTION */}
                <p className="text-xs text-slate-700 leading-relaxed pt-0.5">{post.caption}</p>

                {/* WEBSITE & SOCIAL LINK BADGES IF AVAILABLE */}
                <div className="pt-0.5 flex flex-wrap gap-1.5">
                  {post.instagram && (
                    <a
                      href={post.instagram.startsWith('http') ? post.instagram : `https://${post.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-800 bg-blue-50/90 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-xl transition active:scale-95 cursor-pointer shadow-2xs"
                      title="Visit Social Profile"
                    >
                      <span>🔗</span>
                      <span className="truncate max-w-[150px]">{post.instagram.startsWith('@') ? post.instagram : `@${post.instagram}`}</span>
                      <span className="text-[9px]">↗</span>
                    </a>
                  )}
                  {post.website && (
                    <a
                      href={post.website.startsWith('http') ? post.website : `https://${post.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0d47a1] bg-blue-50/90 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 px-2.5 py-1 rounded-xl transition active:scale-95 cursor-pointer shadow-2xs"
                      title="Visit official business website"
                    >
                      <span>🌐</span>
                      <span className="truncate max-w-[180px] underline">{post.website.replace(/^https?:\/\//i, '')}</span>
                      <span className="text-[9px]">↗</span>
                    </a>
                  )}
                </div>

                {/* PRICE & CHAT CTA */}
                <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-[#0d47a1]">{post.price}</span>
                    <span className="text-[10px] font-semibold text-slate-500">{post.moq}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openPublicProfile(post)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer border border-slate-300"
                      title="View Public Profile"
                    >
                      Profile 👤
                    </button>
                    <button
                      onClick={() => onOpenVendorChat(post)}
                      className="bg-[#0d47a1] hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow transition cursor-pointer flex items-center gap-1"
                    >
                      💬 Chat & Call
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* INFINITE SCROLL / LOAD MORE SENTINEL */}
        {hasMore && (
          <div ref={observerRef} className="pt-2 text-center">
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredPosts.length))}
              className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              Load More Offers ({filteredPosts.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* INSTAGRAM-STYLE PUBLIC PROFILE MODAL */}
      <PublicProfileModal
        isOpen={publicProfileState.isOpen}
        onClose={() => setPublicProfileState({ isOpen: false, vendorName: '' })}
        vendorName={publicProfileState.vendorName}
        vendorRole={publicProfileState.vendorRole}
        vendorPost={publicProfileState.vendorPost}
        allPosts={posts}
        currentUser={currentUser}
        onOpenVendorChat={onOpenVendorChat}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
      />

      {/* RATING & REVIEW MODAL */}
      <ReviewModal
        isOpen={reviewModalState.isOpen}
        onClose={() => setReviewModalState({ isOpen: false, targetId: '', targetName: '' })}
        targetId={reviewModalState.targetId}
        targetName={reviewModalState.targetName}
        targetRole={reviewModalState.targetRole}
        currentUser={currentUser || null}
      />

      {/* GOOGLE MAPS LOCATION MODAL */}
      <LocationMapModal
        isOpen={Boolean(selectedMapLocation)}
        onClose={() => setSelectedMapLocation(null)}
        locationName={selectedMapLocation?.locationName || ''}
        authorName={selectedMapLocation?.authorName}
      />
    </div>
  );
};
