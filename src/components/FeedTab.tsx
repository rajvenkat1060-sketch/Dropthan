import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PostItem, UserRole, UserProfile } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { getPostImageUrl, getPostImagesList } from '../utils/image';
import { ImageCarousel } from './ImageCarousel';
import { ReviewModal } from './ReviewModal';
import { LocationMapModal } from './LocationMapModal';
import { PublicProfileModal } from './PublicProfileModal';
import { fetchAllUserProfilesFromSupabase, subscribeToSupabaseProfiles, searchProfilesFromSupabase } from '../lib/supabase';

interface FeedTabProps {
  posts: PostItem[];
  currentUser?: UserProfile | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenVendorChat: (post: PostItem) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
}

const PAGE_SIZE = 8;

// Smart Indian B2B Search synonym & category taxonomy mapping
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  coconut: ['organic', 'agro', 'copra', 'farming', 'oil', 'agro_wholesaler', 'organic_wholesaler', 'spices', 'food', 'nature', 'agriculture', 'plantation', 'pollachi', 'coimbatore', 'tender', 'coir', 'nar', 'தேங்காய்', 'நார்'],
  coir: ['coconut', 'organic', 'agro', 'copra', 'theengai', 'nar', 'தேங்காய்', 'நார்', 'fibre', 'pith', 'curled', 'mats', 'exporter', 'pollachi', 'tamil nadu', 'agro_wholesaler'],
  தேங்காய்: ['coir', 'coconut', 'copra', 'nar', 'நார்', 'organic', 'agro', 'organic_wholesaler'],
  நார்: ['coir', 'coconut', 'nar', 'fibre', 'தேங்காய்', 'organic', 'agro'],
  apparel: ['textile', 'clothing', 'garment', 'dress', 'saree', 'sarees', 'kurti', 'kurtis', 'shirt', 'fabric', 'cotton', 'denim', 'wholesaler', 'fashion', 'tshirt', 'cloth', 'tirupur', 'surat', 'ludhiana', 'unstitched', 'salwar', 'lehenga'],
  clothing: ['textile', 'apparel', 'garment', 'saree', 'sarees', 'kurti', 'kurtis', 'shirt', 'fabric', 'cotton', 'denim', 'wholesaler', 'tshirt', 'cloth', 'tirupur', 'surat'],
  textile: ['apparel', 'clothing', 'fabric', 'cotton', 'yarn', 'silk', 'weaving', 'surat', 'tirupur', 'wholesaler', 'mill', 'grey cloth', 'saree', 'kurti'],
  cotton: ['textile', 'apparel', 'clothing', 'fabric', 'yarn', 'tshirt', 'garment', 'tirupur', 'bio-washed', 'hosiery', 'denim', 'fabric'],
  saree: ['sarees', 'textile', 'apparel', 'clothing', 'surat', 'silk', 'fabric', 'dress', 'ethnic', 'wholesaler', 'kanchipuram', 'banarasi', 'georgette'],
  sarees: ['saree', 'textile', 'apparel', 'clothing', 'surat', 'silk', 'fabric', 'dress', 'ethnic', 'wholesaler'],
  kurti: ['kurtis', 'textile', 'apparel', 'clothing', 'surat', 'cotton', 'dress', 'ethnic', 'wholesaler', 'jaipur'],
  kurtis: ['kurti', 'textile', 'apparel', 'clothing', 'surat', 'cotton', 'dress', 'ethnic', 'wholesaler'],
  export: ['exporter', 'iec', 'international', 'container', 'freight', 'global', 'shipping', 'customs', 'spice', 'cargo', 'fcl', 'lcl', 'commodities', 'rice', 'basmati', 'coir pith'],
  exporter: ['export', 'iec', 'international', 'container', 'freight', 'global', 'shipping', 'customs', 'spice', 'cargo', 'commodities', 'basmati'],
  organic: ['organic_wholesaler', 'agro', 'spice', 'ayurveda', 'coconut', 'herbal', 'natural', 'pure', 'farm', 'honey', 'turmeric', 'cardamom', 'pepper', 'ginger', 'coir', 'copra'],
  influencer: ['creator', 'social', 'reels', 'promotion', 'collab', 'shoutout', 'ugc', 'model', 'video', 'youtube', 'instagram', 'cosmetics', 'beauty', 'apparel', 'lifestyle'],
  creator: ['influencer', 'social', 'reels', 'promotion', 'ugc', 'model', 'collab', 'video', 'instagram', 'youtube'],
  promotion: ['influencer', 'creator', 'social', 'reels', 'shoutout', 'ugc', 'campaign', 'collab', 'cosmetics', 'apparel', 'marketing'],
  printing: ['packaging', 'box', 'boxes', 'label', 'carton', 'cartons', 'corrugated', 'pouch', 'pouches', 'polybag', 'tag', 'print', 'duplex', 'offset', 'mailer', 'tape', 'mono carton'],
  packaging: ['printing', 'box', 'boxes', 'label', 'carton', 'cartons', 'corrugated', 'tape', 'pouch', 'pouches', 'bag', 'mailer box', 'plastic', 'packing', 'mono carton', 'poly mailer'],
  box: ['packaging', 'printing', 'boxes', 'carton', 'corrugated', 'mailer', 'duplex', 'label', '3 ply', '5 ply'],
  boxes: ['packaging', 'printing', 'box', 'carton', 'corrugated', 'mailer', 'duplex', 'label'],
  marketing: ['agency', 'ads', 'meta', 'facebook', 'google', 'performance', 'roas', 'scale', 'growth', 'leads', 'shopify', 'digital', 'funnel', 'media buyer'],
  agency: ['marketing', 'ads', 'meta', 'facebook', 'google', 'performance', 'roas', 'scale', 'growth', 'leads', 'shopify'],
  electronics: ['gadget', 'earbuds', 'mobile', 'charger', 'bluetooth', 'accessories', 'nova', 'speaker', 'powerbank', 'cable', 'smart watch', 'tws', 'anc'],
  reseller: ['dropshipper', 'reselling', 'margin', 'b2b', 'bulk', 'dropship', 'supply'],
};

const POPULAR_B2B_SEARCHES = [
  { label: '👕 Cotton T-Shirts', query: 'Cotton T-Shirts' },
  { label: '🧵 Surat Sarees & Kurtis', query: 'Surat Saree Kurti' },
  { label: '🥥 Organic Coconut & Copra', query: 'Organic Coconut' },
  { label: '📦 Corrugated Boxes', query: 'Packaging Boxes' },
  { label: '📢 Meta & Google Ads Agency', query: 'Marketing Agency' },
  { label: '🌐 IEC Verified Exporters', query: 'Exporter IEC' },
  { label: '🏢 Apex Apparel Wholesale', query: 'Apex Apparel' },
  { label: '🎧 ANC Wireless Earbuds', query: 'Earbuds Electronics' },
];

export const FeedTab: React.FC<FeedTabProps> = ({
  posts,
  currentUser,
  searchQuery = '',
  onSearchChange,
  onOpenVendorChat,
  onToggleLike,
  onToggleSave,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTab, setSearchTab] = useState<'all' | 'products' | 'suppliers'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{ locationName: string; authorName?: string } | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Fetch all Supabase profiles for dual search and subscribe to realtime profile updates
  useEffect(() => {
    const loadProfiles = () => {
      fetchAllUserProfilesFromSupabase().then((profilesList) => {
        if (profilesList && profilesList.length > 0) {
          setAllProfiles(profilesList);
        }
      });
    };

    loadProfiles();

    // Realtime Supabase listener on profiles table
    const unsubscribe = subscribeToSupabaseProfiles(() => {
      console.log('⚡ [Realtime Profiles Sync] Reloading all profiles from Supabase...');
      loadProfiles();
    });

    const handleLocalProfileUpdate = () => {
      loadProfiles();
    };
    window.addEventListener('dropthan_profiles_updated', handleLocalProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('dropthan_profiles_updated', handleLocalProfileUpdate);
    };
  }, []);

  // Execute direct Supabase search query on search query update
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    searchProfilesFromSupabase(trimmed).then((directMatches) => {
      if (directMatches && directMatches.length > 0) {
        setAllProfiles((prev) => {
          const map = new Map<string, UserProfile>();
          prev.forEach((p) => {
            const key = p.phone || p.id || p.displayName;
            if (key) map.set(key, p);
          });
          directMatches.forEach((p) => {
            const key = p.phone || p.id || p.displayName;
            if (key) map.set(key, p);
          });
          return Array.from(map.values());
        });
      }
    });
  }, [searchQuery]);

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
    { id: 'all', label: 'All' },
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
  }, [activeCategory, searchQuery, searchTab]);

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

  // Compile full list of suppliers/businesses from live Supabase profiles
  const combinedSuppliers = useMemo<UserProfile[]>(() => {
    const map = new Map<string, UserProfile>();

    // 1. Add all registered profiles from live Supabase database
    allProfiles.forEach((prof) => {
      const key = (prof.phone || prof.id || prof.displayName || prof.companyName).toLowerCase().trim();
      if (key) map.set(key, prof);
    });

    return Array.from(map.values());
  }, [allProfiles]);

  // Profile lookup map for dynamic enrichment of post author details & avatars
  const profileLookupMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    allProfiles.forEach((p) => {
      if (p.phone) map.set(p.phone.replace(/\D/g, ''), p);
      if (p.id) map.set(p.id.toLowerCase(), p);
      if (p.displayName) map.set(p.displayName.toLowerCase().trim(), p);
      if (p.companyName) map.set(p.companyName.toLowerCase().trim(), p);
      if (p.fullName) map.set(p.fullName.toLowerCase().trim(), p);
    });
    return map;
  }, [allProfiles]);

  // Dynamically enrich posts with latest author avatar and company details
  const enrichedPosts = useMemo<PostItem[]>(() => {
    return posts.map((post) => {
      const cleanPhone = (post.phone || '').replace(/\D/g, '');
      const authorKey = (post.author || '').toLowerCase().trim();
      const matchedProfile = (cleanPhone ? profileLookupMap.get(cleanPhone) : null) || profileLookupMap.get(authorKey);

      if (matchedProfile) {
        return {
          ...post,
          authorAvatar: matchedProfile.avatarUrl || post.authorAvatar,
          location: matchedProfile.location || post.location,
          country: matchedProfile.country || post.country,
          gstin: matchedProfile.gstin || post.gstin,
          iecCode: matchedProfile.iecCode || post.iecCode,
          website: matchedProfile.website || matchedProfile.websiteUrl || post.website,
          instagram: matchedProfile.instagram || matchedProfile.instagramHandle || post.instagram,
        };
      }
      return post;
    });
  }, [posts, profileLookupMap]);

  // SMART DUAL SEARCH ALGORITHM (Names & Products)
  const { matchingPosts, matchingProfiles } = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    const categoryFilteredPosts = enrichedPosts.filter((p) => matchCategory(p, activeCategory));

    if (!rawQuery) {
      return {
        matchingPosts: categoryFilteredPosts,
        matchingProfiles: combinedSuppliers,
      };
    }

    // Tokenize query words
    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    // Expand search tokens with Indian B2B synonym taxonomy
    const expandedTokens: string[] = [];
    queryTokens.forEach((tok) => {
      expandedTokens.push(tok);
      Object.keys(CATEGORY_SYNONYMS).forEach((catKey) => {
        if (tok.includes(catKey) || catKey.includes(tok)) {
          expandedTokens.push(...CATEGORY_SYNONYMS[catKey]);
        }
      });
    });

    const uniqueExpandedTokens = Array.from(new Set(expandedTokens));

    // 1. MATCH PROFILES / BUSINESSES / SUPPLIERS (Global User Search Across All Database Users)
    const rawQueryDigits = rawQuery.replace(/\D/g, '');
    const matchedProfiles = combinedSuppliers.filter((prof) => {
      const nameClean = (prof.displayName || '').toLowerCase();
      const companyClean = (prof.companyName || '').toLowerCase();
      const fullNameClean = (prof.fullName || '').toLowerCase();
      const roleClean = (prof.role || '').toLowerCase().replace(/_/g, ' ');
      const locationClean = (prof.location || '').toLowerCase();
      const bioClean = (prof.bio || prof.description || '').toLowerCase();
      const gstinClean = (prof.gstin || '').toLowerCase();
      const phoneClean = (prof.phone || '').toLowerCase();
      const phoneDigits = (prof.phone || '').replace(/\D/g, '');
      const productDetailsClean = (prof.productName || prof.materialDetails || '').toLowerCase();
      const promotionClean = (prof.promotionDetails || '').toLowerCase();
      const exportClean = (prof.exportProducts || '').toLowerCase();
      const packagingClean = (prof.packagingMaterials || '').toLowerCase();
      const serviceClean = (prof.serviceDetails || '').toLowerCase();

      const profileCorpus = `${nameClean} ${companyClean} ${fullNameClean} ${roleClean} ${locationClean} ${bioClean} ${gstinClean} ${phoneClean} ${productDetailsClean} ${promotionClean} ${exportClean} ${packagingClean} ${serviceClean}`;

      // A. Direct full query match against names, phone, or company
      if (
        nameClean.includes(rawQuery) ||
        companyClean.includes(rawQuery) ||
        fullNameClean.includes(rawQuery) ||
        phoneClean.includes(rawQuery) ||
        (rawQueryDigits.length >= 3 && phoneDigits.includes(rawQueryDigits))
      ) {
        return true;
      }

      // B. Tokenized matching across names or product details
      const directTokenMatch = queryTokens.some(
        (tok) =>
          nameClean.includes(tok) ||
          companyClean.includes(tok) ||
          fullNameClean.includes(tok) ||
          productDetailsClean.includes(tok) ||
          promotionClean.includes(tok) ||
          exportClean.includes(tok) ||
          packagingClean.includes(tok) ||
          serviceClean.includes(tok)
      );
      if (directTokenMatch) return true;

      // C. Match all tokens across full corpus
      const matchesCorpus = queryTokens.every((tok) => profileCorpus.includes(tok));
      if (matchesCorpus) return true;

      // D. Match expanded synonyms
      const matchesExpanded = uniqueExpandedTokens.some((tok) => profileCorpus.includes(tok));
      return matchesExpanded;
    });

    // Extract names of matching profiles for post boosting
    const matchedProfileNames = new Set(
      matchedProfiles.map((p) => (p.companyName || p.displayName).toLowerCase().trim())
    );

    // 2. MATCH POSTS / PRODUCTS / OFFERS (Product & Keyword Search)
    const matchedPosts = categoryFilteredPosts.filter((p) => {
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
      const productClean = (p.productName || p.materialDetails || '').toLowerCase();
      const promoClean = (p.promotionDetails || '').toLowerCase();
      const exportClean = (p.exportProducts || '').toLowerCase();
      const packClean = (p.packagingMaterials || '').toLowerCase();
      const serviceClean = (p.serviceDetails || '').toLowerCase();

      // Combined searchable text block indexing all category-specific details
      const searchableCorpus = `${authorClean} ${captionClean} ${categoryClean} ${roleClean} ${locationClean} ${countryClean} ${priceClean} ${moqClean} ${phoneClean} ${gstinClean} ${productClean} ${promoClean} ${exportClean} ${packClean} ${serviceClean}`;

      // A. If post author matches a matched supplier profile
      if (matchedProfileNames.has(authorClean.trim())) return true;

      // B. Check direct query token match (strict AND across raw words)
      const matchesDirectWords = queryTokens.every((word) => searchableCorpus.includes(word));
      if (matchesDirectWords) return true;

      // C. Check business name / author exact or partial match
      const matchesBusinessName = queryTokens.some((tok) => authorClean.includes(tok));
      if (matchesBusinessName) return true;

      // D. Check expanded category / keyword semantic match
      const matchesCategoryKeywords = uniqueExpandedTokens.some((tok) =>
        searchableCorpus.includes(tok)
      );
      return matchesCategoryKeywords;
    });

    // Sort posts: prioritize posts by matched supplier profiles
    const sortedPosts = [...matchedPosts].sort((a, b) => {
      const aIsProfileMatch = matchedProfileNames.has((a.author || '').toLowerCase().trim());
      const bIsProfileMatch = matchedProfileNames.has((b.author || '').toLowerCase().trim());
      if (aIsProfileMatch && !bIsProfileMatch) return -1;
      if (!aIsProfileMatch && bIsProfileMatch) return 1;
      return 0;
    });

    return {
      matchingPosts: sortedPosts,
      matchingProfiles: matchedProfiles,
    };
  }, [enrichedPosts, combinedSuppliers, activeCategory, searchQuery]);

  // Slice visible items for virtualization / DOM optimization
  const visiblePosts = useMemo(() => {
    return matchingPosts.slice(0, visibleCount);
  }, [matchingPosts, visibleCount]);

  const hasMore = visibleCount < matchingPosts.length;

  // IntersectionObserver for auto infinite scroll loading
  useEffect(() => {
    if (!hasMore || !observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, matchingPosts.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, matchingPosts.length]);

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
      vendorPost: {
        ...post,
        user_id: (post as any).user_id || (post as any).userId,
        userId: (post as any).user_id || (post as any).userId,
      },
    });
  };

  const openSupplierProfile = (profile: UserProfile) => {
    const pseudoPost: PostItem = {
      id: `vendor-${profile.phone || profile.id}`,
      user_id: profile.id,
      userId: profile.id,
      vendor_id: profile.id,
      author: profile.companyName || profile.displayName,
      role: profile.role,
      price: 'Direct Wholesale Rate',
      moq: 'Wholesale MOQ',
      caption: profile.bio || profile.description || `${profile.companyName || profile.displayName} - Verified Supplier`,
      img: profile.avatarUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
      phone: profile.phone,
      location: profile.storeAddress || profile.location || 'India',
      country: profile.country || 'India',
      gstin: profile.gstin,
      iecCode: profile.iecCode,
      category: profile.role === 'printing' ? 'Packaging & Printing' : profile.role === 'marketing' ? 'Digital Marketing' : 'Textiles & Apparel',
      website: profile.website || profile.websiteUrl,
      instagram: profile.instagram || profile.instagramHandle,
      authorAvatar: profile.avatarUrl,
    };

    setPublicProfileState({
      isOpen: true,
      vendorName: profile.companyName || profile.displayName,
      vendorRole: profile.role,
      vendorPost: pseudoPost,
    });
  };

  const handleSupplierChat = (profile: UserProfile) => {
    const pseudoPost: PostItem = {
      id: `vendor-${profile.phone || profile.id}`,
      user_id: profile.id,
      userId: profile.id,
      vendor_id: profile.id,
      author: profile.companyName || profile.displayName,
      role: profile.role,
      price: 'Direct Wholesale Rate',
      moq: 'Wholesale MOQ',
      caption: profile.bio || profile.description || `${profile.companyName || profile.displayName} - Verified Supplier`,
      img: profile.avatarUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
      phone: profile.phone,
      location: profile.storeAddress || profile.location || 'India',
      country: profile.country || 'India',
      gstin: profile.gstin,
      iecCode: profile.iecCode,
      category: profile.role === 'printing' ? 'Packaging & Printing' : profile.role === 'marketing' ? 'Digital Marketing' : 'Textiles & Apparel',
      website: profile.website || profile.websiteUrl,
      instagram: profile.instagram || profile.instagramHandle,
      authorAvatar: profile.avatarUrl,
    };
    onOpenVendorChat(pseudoPost);
  };

  const totalResults = matchingPosts.length + matchingProfiles.length;

  return (
    <div className="space-y-3.5">
      {/* Category filter buttons (rendered when not searching or in normal browse mode) */}
      {!searchQuery && (
        <div className="space-y-2.5">
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

          {/* DISCOVERY VIEW TABS (ALL FEED | SUPPLIERS | PRODUCTS) */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSearchTab('all')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                searchTab === 'all'
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span>🔥</span>
              <span>All Feed</span>
            </button>
            <button
              onClick={() => setSearchTab('suppliers')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                searchTab === 'suppliers'
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span>🏢</span>
              <span>Verified Suppliers ({matchingProfiles.length})</span>
            </button>
            <button
              onClick={() => setSearchTab('products')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                searchTab === 'products'
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span>📦</span>
              <span>Products &amp; Offers ({matchingPosts.length})</span>
            </button>
          </div>

          {/* FEATURED VERIFIED SUPPLIERS & CREATORS STORY CAROUSEL */}
          {searchTab === 'all' && matchingProfiles.length > 0 && (
            <div className="bg-white border border-blue-100 rounded-2xl p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-900 flex items-center gap-1">
                  <span>✨</span>
                  <span>Verified Suppliers &amp; Creators</span>
                </span>
                <button
                  onClick={() => setSearchTab('suppliers')}
                  className="text-[10px] font-bold text-[#0d47a1] hover:underline cursor-pointer"
                >
                  View All ({matchingProfiles.length}) ↗
                </button>
              </div>

              <div className="flex items-center space-x-3 overflow-x-auto pb-1 scrollbar-none pt-1">
                {matchingProfiles.slice(0, 15).map((supplier, sIdx) => {
                  const avatar = getAvatarUrl(supplier.avatarUrl, supplier.role);
                  const cleanName = supplier.companyName || supplier.displayName || 'Vendor';
                  return (
                    <div
                      key={`story-${supplier.id || supplier.phone || sIdx}`}
                      onClick={() => openSupplierProfile(supplier)}
                      className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 group w-16 text-center"
                    >
                      <div className="w-13 h-13 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-[#0d47a1] group-hover:scale-105 transition shadow-2xs">
                        <img
                          src={avatar}
                          alt={cleanName}
                          className="w-full h-full rounded-full border-2 border-white object-cover bg-white"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 truncate w-full group-hover:text-[#0d47a1] transition">
                        {cleanName}
                      </span>
                      <span className="text-[8px] font-extrabold uppercase text-blue-600 bg-blue-50 px-1 rounded truncate max-w-full">
                        {supplier.role.slice(0, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INDIAN B2B DUAL SEARCH ACTIVE SUMMARY BAR & TABS */}
      {searchQuery && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 text-[#0d47a1] rounded-2xl p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-xs text-slate-800">
              <span className="text-base">🔍</span>
              <span>
                Found <strong>{matchingPosts.length}</strong> products &amp; <strong>{matchingProfiles.length}</strong> verified suppliers for "<strong>{searchQuery}</strong>"
              </span>
            </span>
            {onSearchChange && (
              <button
                onClick={() => onSearchChange('')}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* DUAL SEARCH SWITCHER TABS: ALL | PRODUCTS | SUPPLIERS */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSearchTab('all')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                searchTab === 'all'
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-100/60'
              }`}
            >
              <span>🔥</span>
              <span>All Results ({totalResults})</span>
            </button>
            <button
              onClick={() => setSearchTab('products')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                searchTab === 'products'
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-100/60'
              }`}
            >
              <span>📦</span>
              <span>Products &amp; Offers ({matchingPosts.length})</span>
            </button>
            <button
              onClick={() => setSearchTab('suppliers')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                searchTab === 'suppliers'
                  ? 'bg-[#0d47a1] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-100/60'
              }`}
            >
              <span>🏢</span>
              <span>Verified Suppliers ({matchingProfiles.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: MATCHING VERIFIED SUPPLIERS & BUSINESSES */}
      {(searchTab === 'suppliers' || (searchQuery && searchTab === 'all')) && matchingProfiles.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>🏢</span>
              <span>Verified Indian B2B Suppliers ({matchingProfiles.length})</span>
            </h3>
            <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Direct Contact &amp; Catalog
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {matchingProfiles.map((supplier, idx) => {
              const avatar = getAvatarUrl(supplier.avatarUrl, supplier.role);
              const cleanName = supplier.companyName || supplier.displayName || 'Verified Supplier';
              const cleanPhone = (supplier.phone || '').replace(/\D/g, '');
              const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
              const waMessage = encodeURIComponent(`Hi ${cleanName}, I found your profile on Dropthan and would like to connect.`);

              return (
                <div
                  key={`supplier-${supplier.id || supplier.phone || idx}`}
                  className="bg-white border border-blue-100 hover:border-blue-300 rounded-2xl p-3.5 space-y-2.5 shadow-2xs hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div
                      onClick={() => openSupplierProfile(supplier)}
                      className="flex items-center space-x-2.5 cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatar}
                          alt={cleanName}
                          className="w-10 h-10 rounded-full border border-blue-200 object-cover bg-slate-50 group-hover:scale-105 transition"
                        />
                        {supplier.status === 'Active' && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 bg-[#0d47a1] text-white text-[7px] font-black px-1 rounded-full border border-white"
                            title="Verified B2B Supplier"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0d47a1] transition truncate">
                            {cleanName}
                          </h4>
                          <span className="text-[9px] bg-blue-50 text-[#0d47a1] border border-blue-200 font-bold px-1.5 py-0.2 rounded-md uppercase">
                            {supplier.role}
                          </span>
                          {supplier.status === 'Active' && supplier.gstin && (
                            <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-1.5 py-0.2 rounded">
                              ✓ GST Approved
                            </span>
                          )}
                          {supplier.iecCode && (
                            <span className="text-[8px] bg-blue-50 text-blue-700 border border-blue-200 font-extrabold px-1.5 py-0.2 rounded">
                              🌐 Verified Exporter
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 font-semibold truncate pt-0.5 flex items-center gap-1">
                          <span>📍 {supplier.location || 'India'}</span>
                          {supplier.fullName && supplier.fullName !== cleanName && (
                            <span>• Contact: {supplier.fullName}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* BIO / SPECIALTY */}
                  {(supplier.bio || supplier.description) && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {supplier.bio || supplier.description}
                    </p>
                  )}

                  {/* CATEGORY SPECIFIC PRODUCT & SERVICE BADGES */}
                  {(supplier.productName || supplier.materialDetails || supplier.promotionDetails || supplier.exportProducts || supplier.packagingMaterials || supplier.serviceDetails) && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(supplier.productName || supplier.materialDetails) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          <span>🏷️ Products/Materials:</span>
                          <span className="text-blue-700">{supplier.productName || supplier.materialDetails}</span>
                        </span>
                      )}
                      {supplier.promotionDetails && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                          <span>⭐ Influencing Niches:</span>
                          <span className="text-purple-700">{supplier.promotionDetails}</span>
                        </span>
                      )}
                      {supplier.exportProducts && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                          <span>🌐 Export Commodities:</span>
                          <span className="text-sky-700">{supplier.exportProducts}</span>
                        </span>
                      )}
                      {supplier.packagingMaterials && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          <span>🖨️ Packaging:</span>
                          <span className="text-amber-700">{supplier.packagingMaterials}</span>
                        </span>
                      )}
                      {supplier.serviceDetails && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <span>📢 Marketing:</span>
                          <span className="text-emerald-700">{supplier.serviceDetails}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* SUPPLIER ACTION BUTTONS */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs flex-wrap gap-2">
                    <button
                      onClick={() => openSupplierProfile(supplier)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      📄 Profile &amp; Catalog
                    </button>

                    <div className="flex items-center space-x-1.5 flex-wrap">
                      {supplier.phone && (
                        <>
                          <a
                            href={`tel:${supplier.phone}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
                            title="Direct Phone Call"
                          >
                            <span>📞</span>
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${intlPhone}?text=${waMessage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs"
                            title="Chat on WhatsApp"
                          >
                            <span>💬</span>
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => handleSupplierChat(supplier)}
                        className="bg-[#0d47a1] hover:bg-blue-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <span>✉️</span>
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: MATCHING PRODUCT & OFFER LISTINGS */}
      {(searchTab === 'all' || searchTab === 'products') && (
        <div className="space-y-3.5">
          {searchQuery && matchingPosts.length > 0 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>📦</span>
                <span>Matching Products &amp; Offers ({matchingPosts.length})</span>
              </h3>
            </div>
          )}

          {matchingPosts.length === 0 && (!searchQuery || searchTab === 'products') ? (
            <div className="bg-white border border-blue-100 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-sm space-y-3">
              <span className="text-3xl block">🔍</span>
              <p className="font-bold text-slate-800 text-sm">
                {searchQuery ? `No product listings found for "${searchQuery}"` : 'No offers currently available'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `Try searching with different terms like 'Apparel', 'Cotton', 'Coconut', 'Packaging', or browse matching suppliers above.`
                  : `Click "➕ Post Offer" to list your products or services!`}
              </p>

              {/* INDIAN B2B POPULAR SEARCH CHIPS */}
              {searchQuery && onSearchChange && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700">💡 Popular Indian B2B Wholesale Searches:</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                    {POPULAR_B2B_SEARCHES.map((item) => (
                      <button
                        key={item.query}
                        onClick={() => onSearchChange(item.query)}
                        className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full transition cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                          ) : post.role === 'exporter' ? (
                            <span className="text-blue-700 bg-blue-50 border border-blue-200 text-[8px] font-extrabold px-1.5 py-0.2 rounded">
                              🌐 Exporter
                            </span>
                          ) : post.gstin ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[8px] font-extrabold px-1.5 py-0.2 rounded">
                              ✓ GST Approved
                            </span>
                          ) : (
                            <span className="text-[#0d47a1] bg-blue-50 border border-blue-200 text-[8px] font-bold px-1.5 py-0.2 rounded">
                              ✓ Verified B2B
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
                  {(() => {
                    const postImages = getPostImagesList(post);
                    const primaryImg = getPostImageUrl(post);
                    const displayImages = postImages.length > 0 ? postImages : [primaryImg];

                    return (
                      <ImageCarousel
                        images={displayImages}
                        fallbackImg={primaryImg}
                        alt={post.caption || 'Product offer'}
                        onDoubleTap={() => onToggleLike(post.id)}
                      />
                    );
                  })()}

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

                  {/* CAPTION & CATEGORY SPECIFIC PRODUCT BADGES */}
                  <div className="space-y-1 pt-0.5">
                    {(post.productName || post.materialDetails || post.promotionDetails || post.exportProducts || post.packagingMaterials || post.serviceDetails) && (
                      <div className="flex flex-wrap gap-1.5 pb-0.5">
                        {(post.productName || post.materialDetails) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            <span>🏷️ Product/Material:</span>
                            <span className="text-blue-700">{post.productName || post.materialDetails}</span>
                          </span>
                        )}
                        {post.promotionDetails && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                            <span>⭐ Niches:</span>
                            <span className="text-purple-700">{post.promotionDetails}</span>
                          </span>
                        )}
                        {post.exportProducts && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                            <span>🌐 Export Goods:</span>
                            <span className="text-sky-700">{post.exportProducts}</span>
                          </span>
                        )}
                        {post.packagingMaterials && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <span>🖨️ Materials:</span>
                            <span className="text-amber-700">{post.packagingMaterials}</span>
                          </span>
                        )}
                        {post.serviceDetails && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <span>📢 Services:</span>
                            <span className="text-emerald-700">{post.serviceDetails}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.caption}</p>
                  </div>

                  {/* WEBSITE & SOCIAL LINK BADGES IF AVAILABLE */}
                  <div className="pt-0.5 flex flex-wrap gap-1.5">
                    {post.instagram && (
                      <a
                        href={post.instagram.startsWith('http') ? post.instagram : `https://www.instagram.com/${post.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}`}
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
                  <div className="flex items-center justify-between pt-2 border-t border-blue-100 flex-wrap gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-extrabold text-[#0d47a1]">{post.price}</span>
                      <span className="text-[10px] font-semibold text-slate-500">{post.moq}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-wrap">
                      {post.phone && (
                        <>
                          <a
                            href={`tel:${post.phone}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                            title="Call Vendor Directly"
                          >
                            <span>📞</span>
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${post.phone.replace(/\D/g, '').length === 10 ? `91${post.phone.replace(/\D/g, '')}` : post.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${post.author}, I found your post on Dropthan and would like to inquire.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 shadow-2xs"
                            title="Chat on WhatsApp"
                          >
                            <span>💬</span>
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => openPublicProfile(post)}
                        className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        title="View Public Profile & Catalog"
                      >
                        <span>👤</span>
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => onOpenVendorChat(post)}
                        className="bg-[#0d47a1] hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition cursor-pointer flex items-center gap-1"
                      >
                        <span>✉️</span>
                        <span>Chat</span>
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
                onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, matchingPosts.length))}
                className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                Load More Offers ({matchingPosts.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* OVERALL EMPTY STATE WHEN 0 TOTAL RESULTS IN DUAL SEARCH */}
      {searchQuery && totalResults === 0 && (
        <div className="bg-white border border-blue-100 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-sm space-y-3">
          <span className="text-4xl block">🔍</span>
          <h3 className="font-bold text-slate-900 text-sm">
            No matching suppliers or products found for "{searchQuery}"
          </h3>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Check the spelling or try searching by popular Indian B2B wholesale product keywords and supplier hubs below.
          </p>

          {onSearchChange && (
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-700">💡 Popular Indian B2B Wholesale Searches:</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                {POPULAR_B2B_SEARCHES.map((item) => (
                  <button
                    key={item.query}
                    onClick={() => onSearchChange(item.query)}
                    className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full transition cursor-pointer active:scale-95"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onSearchChange('')}
                  className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
                >
                  View All Offers
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSTAGRAM-STYLE PUBLIC PROFILE MODAL */}
      {publicProfileState.isOpen && (
        <PublicProfileModal
          key={`modal-${publicProfileState.vendorPost?.user_id || publicProfileState.vendorPost?.userId || publicProfileState.vendorPost?.phone || publicProfileState.vendorName || 'profile'}`}
          isOpen={publicProfileState.isOpen}
          onClose={() => setPublicProfileState({ isOpen: false, vendorName: '', vendorPost: null })}
          vendorName={publicProfileState.vendorName}
          vendorRole={publicProfileState.vendorRole}
          vendorPost={publicProfileState.vendorPost}
          allPosts={posts}
          currentUser={currentUser}
          onOpenVendorChat={onOpenVendorChat}
          onToggleLike={onToggleLike}
          onToggleSave={onToggleSave}
        />
      )}

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
