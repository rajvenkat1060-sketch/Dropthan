import { UserRole } from '../types';

export const DEFAULT_AVATARS_BY_ROLE: Record<UserRole, string> = {
  wholesaler: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  organic_wholesaler: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb231fc?w=200&auto=format&fit=crop&q=80',
  exporter: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
  printing: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  reseller: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  dropshipper: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  admin: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
};

export function getAvatarUrl(avatarUrl?: string, role?: UserRole): string {
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return avatarUrl;
  }
  if (role && DEFAULT_AVATARS_BY_ROLE[role]) {
    return DEFAULT_AVATARS_BY_ROLE[role];
  }
  return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
}
