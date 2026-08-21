export type UserRole = 'wholesaler' | 'organic_wholesaler' | 'exporter' | 'marketing' | 'printing' | 'reseller' | 'influencer' | 'dropshipper' | 'admin';

export type UserStatus = 'Active' | 'Pending' | 'Rejected';

export interface UserProfile {
  id?: string;
  role: UserRole;
  phone: string;
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
  rejectionReason?: string;
}

export interface PostItem {
  id: string;
  user_id?: string;
  userId?: string;
  vendor_id?: string;
  author: string;
  title?: string;
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

export interface ChatMessage {
  id: string;
  text: string;
  isMe: boolean;
  timestamp: string;
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
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
