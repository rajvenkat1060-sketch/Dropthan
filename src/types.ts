export type UserRole = 'wholesaler' | 'organic_wholesaler' | 'exporter' | 'printing' | 'reseller' | 'influencer' | 'dropshipper' | 'admin';

export type UserStatus = 'Active' | 'Pending' | 'Rejected';

export interface UserProfile {
  id?: string;
  role: UserRole;
  phone: string;
  password?: string;
  country: string;
  location: string;
  storeAddress?: string;
  lat?: number;
  lng?: number;
  companyName?: string;
  fullName?: string;
  displayName: string;
  bio?: string;
  description?: string;
  gstin?: string;
  iecCode?: string;
  businessRegNumber?: string;
  productName?: string;
  materialDetails?: string;
  promotionDetails?: string;
  exportProducts?: string;
  packagingMaterials?: string;
  serviceDetails?: string;
  website?: string;
  websiteUrl?: string;
  instagram?: string;
  instagramHandle?: string;
  createdAt: string;
  avatarUrl?: string;
  status?: UserStatus;
  is_gst_approved?: boolean;
  isGstApproved?: boolean;
  rejectionReason?: string;
  admin_rating?: number;
  adminRating?: number;
  rating?: number;
}

export interface PostItem {
  id: string;
  user_id?: string;
  userId?: string;
  vendor_id?: string;
  author: string;
  title?: string;
  product_name?: string;
  role: UserRole;
  price: string;
  moq: string;
  moqPrice?: string;
  caption: string;
  productName?: string;
  materialDetails?: string;
  promotionDetails?: string;
  exportProducts?: string;
  packagingMaterials?: string;
  serviceDetails?: string;
  bio?: string;
  description?: string;
  img: string;
  images?: string[];
  media_url?: string;
  is_active?: boolean;
  phone: string;
  country?: string;
  location?: string;
  storeAddress?: string;
  lat?: number;
  lng?: number;
  gstin?: string;
  iecCode?: string;
  website?: string;
  instagram?: string;
  category: string;
  likesCount?: number;
  likeCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  authorAvatar?: string;
  createdAt?: string;
  created_at?: string;
}

export interface ReviewItem {
  id?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewer_name?: string;
  ratingScore?: number;
  rating_score?: number;
  reviewText?: string;
  review_text?: string;
  createdAt?: string;
  created_at?: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  userRating?: number;
  userReview?: string;
  reviews: ReviewItem[];
}

export interface LikeRecord {
  id?: string;
  post_id: string;
  post_title?: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  created_at?: string;
}
