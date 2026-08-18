import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, PostItem } from './types';
import { INITIAL_POSTS } from './data/initialData';
import { OnboardingModal } from './components/OnboardingModal';
import { Header } from './components/Header';
import { FeedTab } from './components/FeedTab';
import { ChatTab } from './components/ChatTab';
import { AIAgentTab } from './components/AIAgentTab';
import { ProfileTab } from './components/ProfileTab';
import { CreatePostModal } from './components/CreatePostModal';
import { BottomNav } from './components/BottomNav';
import { PendingVerificationView } from './components/PendingVerificationView';
import { AdminVerificationModal } from './components/AdminVerificationModal';
import {
  fetchSupabasePosts,
  saveSupabasePost,
  fetchUserLikesFromSupabase,
  fetchAllLikesCountsFromSupabase,
  toggleSupabaseLike,
  fetchUserProfileStatus,
  subscribeToSupabasePosts,
} from './lib/supabase';

import { GoogleMapsWrapper } from './components/GoogleMapsWrapper';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [posts, setPosts] = useState<PostItem[]>(INITIAL_POSTS);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [likeCountsMap, setLikeCountsMap] = useState<Record<string, number>>({});
  const [activeVendor, setActiveVendor] = useState<PostItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((current) => (current === msg ? null : current)), 3500);
  };

  // Helper to resolve user identifier
  const getUserId = (user: UserProfile | null): string => {
    if (!user) return '';
    if (user.id) return user.id;
    if (user.phone) return `usr_${user.phone.replace(/\D/g, '')}`;
    return `usr_${user.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  };

  // Load user profile, saved posts, liked posts, and sync with Supabase permanent posts
  useEffect(() => {
    let resolvedUser: UserProfile | null = null;
    const savedUserStr = localStorage.getItem('dropthan_user');
    if (savedUserStr) {
      try {
        const parsedUser: UserProfile = JSON.parse(savedUserStr);
        if (!parsedUser.id) {
          parsedUser.id = parsedUser.phone
            ? `usr_${parsedUser.phone.replace(/\D/g, '')}`
            : `usr_${parsedUser.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
        resolvedUser = parsedUser;
        setCurrentUser(parsedUser);

        // Verify latest status from Supabase/storage
        if (parsedUser.phone) {
          fetchUserProfileStatus(parsedUser.phone).then((latest) => {
            if (latest && latest.status !== parsedUser.status) {
              const updated = { ...parsedUser, status: latest.status, rejectionReason: latest.rejectionReason };
              localStorage.setItem('dropthan_user', JSON.stringify(updated));
              setCurrentUser(updated);
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse saved user:', err);
      }
    }

    const savedPostsStr = localStorage.getItem('dropthan_custom_posts');
    let localCustomPosts: PostItem[] = [];
    if (savedPostsStr) {
      try {
        const parsedCustomPosts: PostItem[] = JSON.parse(savedPostsStr);
        if (Array.isArray(parsedCustomPosts)) {
          localCustomPosts = parsedCustomPosts;
        }
      } catch (err) {
        console.error('Failed to parse saved custom posts:', err);
      }
    }

    // Combine local & initial posts
    const initialCombined = [...localCustomPosts, ...INITIAL_POSTS];
    setPosts(initialCombined);

    // Fetch real likes counts map from Supabase
    fetchAllLikesCountsFromSupabase().then((countsMap) => {
      if (countsMap && Object.keys(countsMap).length > 0) {
        setLikeCountsMap(countsMap);
      }
    });

    // Load local liked IDs as initial state
    const likedIdsStr = localStorage.getItem('dropthan_liked_ids');
    if (likedIdsStr) {
      try {
        setLikedPostIds(JSON.parse(likedIdsStr));
      } catch (e) {}
    }

    // Fetch authentic user likes from Supabase if user is logged in
    if (resolvedUser) {
      const uid = getUserId(resolvedUser);
      fetchUserLikesFromSupabase(uid).then((supabaseLikes) => {
        if (supabaseLikes && supabaseLikes.length > 0) {
          setLikedPostIds((prev) => Array.from(new Set([...prev, ...supabaseLikes])));
        }
      });
    }

    const savedIdsStr = localStorage.getItem('dropthan_saved_ids');
    if (savedIdsStr) {
      try {
        setSavedPostIds(JSON.parse(savedIdsStr));
      } catch (e) {}
    }
  }, []);

  // Real-time post sync helper across devices
  const syncPostsFromSupabase = useCallback(async () => {
    try {
      const remotePosts = await fetchSupabasePosts();
      if (remotePosts && remotePosts.length > 0) {
        setPosts((prev) => {
          const remoteMap = new Map<string, PostItem>();
          remotePosts.forEach((p) => remoteMap.set(String(p.id), p));
          const localOnly = prev.filter((p) => !remoteMap.has(String(p.id)));
          return [...remotePosts, ...localOnly];
        });
      }
    } catch (err) {
      console.warn('Realtime sync fetch notice:', err);
    }
  }, []);

  // Subscribe to real-time database updates and periodic cross-device polling
  useEffect(() => {
    // Initial fetch from Supabase
    syncPostsFromSupabase();

    // Listen for real-time insert/update/delete events on the 'posts' table
    const unsubscribe = subscribeToSupabasePosts(() => {
      console.log('⚡ [Realtime Post Change Event] Re-syncing posts from Supabase...');
      syncPostsFromSupabase();
    });

    // 7-second background polling fallback for multi-device sync
    const pollInterval = setInterval(() => {
      syncPostsFromSupabase();
    }, 7000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [syncPostsFromSupabase]);

  const handleToggleLike = useCallback(async (postId: string) => {
    if (!currentUser) {
      alert('Please log in or complete onboarding to like posts!');
      return;
    }

    const uid = getUserId(currentUser);
    const isAlreadyLiked = likedPostIds.includes(postId);
    const newIsLiked = !isAlreadyLiked;

    // Real-time optimistic update of liked status
    setLikedPostIds((prev) => {
      const nextLiked = isAlreadyLiked
        ? prev.filter((id) => id !== postId)
        : [...prev, postId];
      localStorage.setItem('dropthan_liked_ids', JSON.stringify(nextLiked));
      return nextLiked;
    });

    // Real-time optimistic update of count
    setLikeCountsMap((prevCounts) => {
      const currentCount = prevCounts[postId] ?? 0;
      const newCount = newIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
      const updatedMap = { ...prevCounts, [postId]: newCount };
      localStorage.setItem('dropthan_like_counts_map', JSON.stringify(updatedMap));
      return updatedMap;
    });

    // Sync permanently with Supabase likes table
    await toggleSupabaseLike(postId, uid, newIsLiked);
  }, [currentUser, likedPostIds]);

  const handleToggleSave = useCallback((postId: string) => {
    setSavedPostIds((prev) => {
      const isAlreadySaved = prev.includes(postId);
      const nextSaved = isAlreadySaved
        ? prev.filter((id) => id !== postId)
        : [...prev, postId];
      localStorage.setItem('dropthan_saved_ids', JSON.stringify(nextSaved));
      return nextSaved;
    });
  }, []);

  const handleOnboardingComplete = async (userProfile: UserProfile) => {
    const userWithId = {
      ...userProfile,
      id: userProfile.id || `usr_${userProfile.phone ? userProfile.phone.replace(/\D/g, '') : Date.now()}`,
    };
    setCurrentUser(userWithId);
    localStorage.setItem('dropthan_user', JSON.stringify(userWithId));

    // Global Auth Guard: Verify status directly against Supabase database on login/signup completion
    if (userWithId.phone) {
      const latest = await fetchUserProfileStatus(userWithId.phone);
      if (latest) {
        const updated = { ...userWithId, status: latest.status, rejectionReason: latest.rejectionReason };
        localStorage.setItem('dropthan_user', JSON.stringify(updated));
        setCurrentUser(updated);
      }
    }

    // Fetch user's existing likes from Supabase
    fetchUserLikesFromSupabase(userWithId.id).then((supabaseLikes) => {
      if (supabaseLikes && supabaseLikes.length > 0) {
        setLikedPostIds((prev) => Array.from(new Set([...prev, ...supabaseLikes])));
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('dropthan_user');
    setCurrentUser(null);
  };

  const handleUpdateAvatar = (newAvatarUrl: string) => {
    if (!currentUser) return;
    const updatedUser: UserProfile = { ...currentUser, avatarUrl: newAvatarUrl };
    setCurrentUser(updatedUser);
    localStorage.setItem('dropthan_user', JSON.stringify(updatedUser));
  };

  const handleOpenVendorChat = useCallback((vendorPost: PostItem) => {
    setActiveVendor(vendorPost);
    setActiveTab('chat');
  }, []);

  const handleAddPost = async (newPost: PostItem) => {
    setPosts((prev) => [newPost, ...prev]);

    // Save in LocalStorage
    const existingCustomStr = localStorage.getItem('dropthan_custom_posts');
    let customPosts: PostItem[] = [];
    if (existingCustomStr) {
      try {
        customPosts = JSON.parse(existingCustomStr);
      } catch (e) {}
    }
    customPosts = [newPost, ...customPosts];
    localStorage.setItem('dropthan_custom_posts', JSON.stringify(customPosts));

    // Save permanently in Supabase database
    await saveSupabasePost(newPost);
    syncPostsFromSupabase();
    showToast('🚀 Offer posted & synced successfully!');
  };

  const cleanPhoneNum = currentUser?.phone ? currentUser.phone.replace(/\D/g, '') : '';
  const isAdminUserAuthorized = cleanPhoneNum.endsWith('8838533014') || cleanPhoneNum === '8838533014';

  const handleOpenAdmin = () => {
    if (!isAdminUserAuthorized) {
      showToast('🔒 Access Denied: Admin Panel is strictly restricted to phone number 8838533014.');
      return;
    }
    setIsAdminModalOpen(true);
  };

  // Compute posts with dynamic authentic like and saved status using useMemo
  const postsWithInteraction = useMemo<PostItem[]>(() => {
    return posts.map((post) => {
      const authenticCount =
        likeCountsMap[post.id] !== undefined
          ? likeCountsMap[post.id]
          : (post.likesCount ?? 0);
      return {
        ...post,
        likesCount: authenticCount,
        isLiked: likedPostIds.includes(post.id),
        isSaved: savedPostIds.includes(post.id),
      };
    });
  }, [posts, likeCountsMap, likedPostIds, savedPostIds]);

  const savedPosts = useMemo(() => {
    return postsWithInteraction.filter((p) => p.isSaved);
  }, [postsWithInteraction]);

  const userPosts = useMemo(() => {
    if (!currentUser) return [];
    return postsWithInteraction.filter((p) => {
      const authorMatch = p.author === currentUser.displayName || (currentUser.companyName && p.author === currentUser.companyName);
      const phoneMatch = p.phone && currentUser.phone && p.phone === currentUser.phone;
      return authorMatch || phoneMatch;
    });
  }, [postsWithInteraction, currentUser]);

  if (!currentUser) {
    return (
      <GoogleMapsWrapper>
        <OnboardingModal onComplete={handleOnboardingComplete} />
      </GoogleMapsWrapper>
    );
  }

  // STRICT LOGIN BLOCKING: RESTRICT ACCESS IF ACCOUNT STATUS IS NOT ACTIVE
  const isUserActive = currentUser.status && currentUser.status.toLowerCase() === 'active';
  if (!isUserActive) {
    return (
      <PendingVerificationView
        user={currentUser}
        onStatusApproved={(updated) => setCurrentUser(updated)}
        onEditDetails={() => setCurrentUser(null)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <GoogleMapsWrapper>
      <div className="min-h-screen flex flex-col pb-20 bg-slate-50 text-slate-900 select-none">
      {/* HEADER WITH REAL-TIME SEARCH */}
      <Header
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAdmin={isAdminUserAuthorized ? handleOpenAdmin : undefined}
      />

      {/* MAIN CONTENT AREA */}
      <main
        className={`flex-1 p-3.5 space-y-4 w-full mx-auto transition-all ${
          activeTab === 'chat' || activeTab === 'messages'
            ? 'max-w-6xl xl:max-w-7xl md:p-5'
            : 'max-w-lg md:max-w-2xl'
        }`}
      >
        {activeTab === 'feed' && (
          <FeedTab
            posts={postsWithInteraction}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onOpenVendorChat={handleOpenVendorChat}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
          />
        )}

        {(activeTab === 'chat' || activeTab === 'messages') && (
          <ChatTab activeVendor={activeVendor} currentUser={currentUser} />
        )}

        {activeTab === 'explore' && (
          <div className="space-y-4">
            <div className="bg-[#0d47a1] text-white p-4 rounded-2xl shadow-md space-y-2">
              <h2 className="text-sm font-extrabold flex items-center gap-1.5">
                <span>🔍</span> B2B Network Search & Categories
              </h2>
              <p className="text-xs text-blue-100">
                Search verified wholesalers, manufacturers, influencers, dropshippers, and service agencies across India.
              </p>
            </div>

            <FeedTab
              posts={postsWithInteraction}
              currentUser={currentUser}
              searchQuery={searchQuery}
              onOpenVendorChat={handleOpenVendorChat}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
            />
          </div>
        )}

        {activeTab === 'ai' && <AIAgentTab currentUser={currentUser} />}

        {activeTab === 'profile' && (
          <ProfileTab
            user={currentUser}
            userPosts={userPosts}
            savedPosts={savedPosts}
            onLogout={handleLogout}
            onOpenCreatePost={() => setIsCreateModalOpen(true)}
            onOpenVendorChat={handleOpenVendorChat}
            onToggleSave={handleToggleSave}
            onToggleLike={handleToggleLike}
            onUpdateAvatar={handleUpdateAvatar}
            onSelectTab={setActiveTab}
            onOpenAdmin={isAdminUserAuthorized ? handleOpenAdmin : undefined}
            onEditDetails={() => setCurrentUser(null)}
            onUpdateProfile={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem('dropthan_user', JSON.stringify(updatedUser));
            }}
          />
        )}
      </main>

      {/* CREATE OFFER / POST MODAL */}
      {isCreateModalOpen && (
        <CreatePostModal
          currentUser={currentUser}
          onClose={() => setIsCreateModalOpen(false)}
          onAddPost={handleAddPost}
        />
      )}

      {/* ADMIN GST VERIFICATION & MONITORING DASHBOARD MODAL */}
      <AdminVerificationModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={currentUser}
        posts={posts}
        onStatusChanged={() => {
          if (currentUser?.phone) {
            fetchUserProfileStatus(currentUser.phone).then((latest) => {
              if (latest && latest.status !== currentUser.status) {
                const updated = { ...currentUser, status: latest.status, rejectionReason: latest.rejectionReason };
                localStorage.setItem('dropthan_user', JSON.stringify(updated));
                setCurrentUser(updated);
              }
            });
          }
        }}
      />

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[250] bg-slate-900/95 text-white border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold backdrop-blur-md flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCreatePost={() => setIsCreateModalOpen(true)}
      />
    </div>
    </GoogleMapsWrapper>
  );
}

