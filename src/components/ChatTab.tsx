import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PostItem, UserProfile } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { LocationMapModal } from './LocationMapModal';
import {
  ChatConversation,
  PersistentMessage,
  fetchSupabaseMessages,
  saveSupabaseMessage,
} from '../lib/supabase';

interface ChatTabProps {
  activeVendor: PostItem | null;
  currentUser: UserProfile | null;
}

const DEFAULT_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'chat-apex-apparel',
    partnerId: 'supplier-apex',
    partnerName: 'Apex Apparel Wholesale',
    partnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    partnerPhone: '+919876543210',
    partnerGstin: '33AAAAA0000A1Z5',
    lastMessage: 'Ready stock available in 12 colors! What quantity do you need?',
    lastTimestamp: '10:15 AM',
    unreadCount: 1,
    isFavourite: true,
    isArchived: false,
    isBlocked: false,
    category: 'all',
  },
  {
    id: 'chat-creative-ads',
    partnerId: 'supplier-creative',
    partnerName: 'Creative Ads Agency',
    partnerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    partnerPhone: '+919812345678',
    partnerGstin: '27BBBCA1111B1Z2',
    lastMessage: 'Meta ads ROAS optimization campaign package breakdown sent!',
    lastTimestamp: 'Yesterday',
    unreadCount: 0,
    isFavourite: false,
    isArchived: false,
    isBlocked: false,
    category: 'all',
  },
  {
    id: 'chat-nova-electronics',
    partnerId: 'supplier-nova',
    partnerName: 'Nova Electronics India',
    partnerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    partnerPhone: '+919700011122',
    partnerGstin: '07DDDEE3333D1Z4',
    lastMessage: 'Wireless ANC Earbuds sample batch dispatched via Air express.',
    lastTimestamp: '06 Aug',
    unreadCount: 0,
    isFavourite: true,
    isArchived: false,
    isBlocked: false,
    category: 'all',
  },
];

export const ChatTab: React.FC<ChatTabProps> = ({ activeVendor, currentUser }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    const saved = localStorage.getItem('dropthan_chats_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_CONVERSATIONS;
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PersistentMessage[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [inputText, setInputText] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [callNotification, setCallNotification] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive tracker
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync conversations to localStorage
  useEffect(() => {
    localStorage.setItem('dropthan_chats_list', JSON.stringify(conversations));
  }, [conversations]);

  // On desktop, auto-select first conversation if none selected
  useEffect(() => {
    if (isDesktop && !activeChatId && conversations.length > 0) {
      setActiveChatId(conversations[0].id);
    }
  }, [isDesktop, activeChatId, conversations]);

  // If activeVendor is passed from parent (e.g. Inquire button on feed), auto-open or create chat with vendor
  useEffect(() => {
    if (activeVendor) {
      const vendorChatId = `chat-${activeVendor.id || activeVendor.author.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === vendorChatId);
        if (exists) return prev;
        const newConv: ChatConversation = {
          id: vendorChatId,
          partnerId: activeVendor.id || 'vendor',
          partnerName: activeVendor.author,
          partnerAvatar: activeVendor.authorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
          partnerPhone: activeVendor.phone || '+919876543210',
          partnerGstin: activeVendor.gstin || '33AAAAA0000A1Z5',
          lastMessage: `Inquiring about ${activeVendor.caption.slice(0, 40)}...`,
          lastTimestamp: 'Just Now',
          unreadCount: 0,
          isFavourite: false,
          isArchived: false,
          isBlocked: false,
        };
        return [newConv, ...prev];
      });
      setActiveChatId(vendorChatId);
    }
  }, [activeVendor]);

  // Load persistent messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId) return;

    // First load from localStorage for instantaneous response
    const localKey = `dropthan_msg_${activeChatId}`;
    const localCached = localStorage.getItem(localKey);
    if (localCached) {
      try {
        const parsed = JSON.parse(localCached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {}
    }

    // Simultaneously fetch from Supabase messages table and sync with privacy checks
    const userId = currentUser?.id || currentUser?.phone;
    const userPhone = currentUser?.phone;
    fetchSupabaseMessages(activeChatId, userId, userPhone).then((fetchedMsgs) => {
      if (fetchedMsgs && fetchedMsgs.length > 0) {
        setMessages(fetchedMsgs);
      } else {
        // If brand new conversation without messages, create default welcome message
        setMessages((prev) => {
          if (prev.length > 0) return prev;
          const currentConv = conversations.find((c) => c.id === activeChatId);
          const welcomeMsg: PersistentMessage = {
            id: `msg-${Date.now()}`,
            chat_id: activeChatId,
            sender_id: currentConv?.partnerId || 'vendor',
            receiver_id: currentUser?.id || currentUser?.phone || 'user',
            sender_name: currentConv?.partnerName || 'Supplier',
            text: `Hello ${currentUser?.displayName || 'there'}! Welcome to Dropthan B2B Supplier Chat. How can we assist with your wholesale order?`,
            is_me: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            created_at: new Date().toISOString(),
          };
          saveSupabaseMessage(welcomeMsg);
          return [welcomeMsg];
        });
      }
    });

    // Clear unread count for this conversation
    setConversations((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
    );
  }, [activeChatId, currentUser]);

  // Scroll to bottom smoothly on messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeChatId);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeChatId) return;

    const currentSenderId = currentUser?.id || currentUser?.phone || 'user';
    const currentReceiverId = activeConv?.partnerId || 'vendor';

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: PersistentMessage = {
      id: `msg-${Date.now()}`,
      chat_id: activeChatId,
      sender_id: currentSenderId,
      receiver_id: currentReceiverId,
      sender_name: currentUser?.displayName || 'Me',
      text,
      is_me: true,
      timestamp: timeStr,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Save permanently to Supabase and localStorage
    await saveSupabaseMessage(userMsg);

    // Update conversation lastMessage
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, lastMessage: text, lastTimestamp: timeStr } : c
      )
    );

    // Auto-reply simulation for instant interactive feedback
    setTimeout(async () => {
      let replyText = 'Requirement noted! Our wholesale manager will verify inventory and revert with GST invoice rates.';
      const lower = text.toLowerCase();
      if (lower.includes('price') || lower.includes('quote') || lower.includes('cost')) {
        replyText = `Wholesale factory pricing is tier-based. Special 10% volume discount applied for orders > 100 units!`;
      } else if (lower.includes('moq') || lower.includes('quantity')) {
        replyText = `Standard MOQ is 25 pcs per color/variant. Ready stock is available for express freight dispatch.`;
      } else if (lower.includes('catalog') || lower.includes('pdf')) {
        replyText = `📄 PDF Catalog & Price Matrix updated for ${activeConv?.partnerName || 'Supplier'}!`;
      }

      const replyMsg: PersistentMessage = {
        id: `msg-${Date.now() + 1}`,
        chat_id: activeChatId,
        sender_id: currentReceiverId,
        receiver_id: currentSenderId,
        sender_name: activeConv?.partnerName || 'Supplier',
        text: replyText,
        is_me: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, replyMsg]);
      await saveSupabaseMessage(replyMsg);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChatId ? { ...c, lastMessage: replyText, lastTimestamp: replyMsg.timestamp } : c
        )
      );
    }, 700);
  };

  const handleVoiceCall = (phone?: string, name?: string) => {
    const targetPhone = phone || activeConv?.partnerPhone || '+919876543210';
    const targetName = name || activeConv?.partnerName || 'Supplier';
    window.location.href = `tel:${targetPhone.replace(/\s+/g, '')}`;
    setCallNotification(`📱 Calling ${targetName} (${targetPhone})...`);
    setTimeout(() => setCallNotification(null), 3500);
  };

  // Filter conversations list
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter === 'unread' && (!c.unreadCount || c.unreadCount === 0)) return false;

      if (chatSearch.trim()) {
        const q = chatSearch.toLowerCase();
        return (
          c.partnerName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q) ||
          (c.partnerPhone && c.partnerPhone.includes(q))
        );
      }
      return true;
    });
  }, [conversations, activeFilter, chatSearch]);

  // RENDER CONVERSATION LIST
  const renderConversationList = () => (
    <div className="flex flex-col h-full bg-white">
      {/* SEARCH AND FILTER BAR */}
      <div className="p-3 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
        <div className="relative">
          <input
            type="text"
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            placeholder="🔍 Search suppliers or messages..."
            className="w-full bg-white border border-slate-200 text-slate-900 text-xs pl-3.5 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d47a1] shadow-2xs"
          />
          {chatSearch && (
            <button
              type="button"
              onClick={() => setChatSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#0d47a1] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            All ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'unread'
                ? 'bg-[#0d47a1] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Unread ({conversations.filter((c) => (c.unreadCount || 0) > 0).length})
          </button>
        </div>
      </div>

      {/* CHAT ITEMS LIST */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <span className="text-3xl block">💬</span>
            <p className="text-xs font-bold text-slate-700">No chats found</p>
            <p className="text-[10px] text-slate-500">Tap "Inquire" on any feed listing to start a chat</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = isDesktop && activeChatId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveChatId(conv.id)}
                className={`p-3 flex items-center justify-between cursor-pointer transition group ${
                  isSelected
                    ? 'bg-blue-50 border-l-4 border-[#0d47a1]'
                    : 'hover:bg-slate-50/90 bg-white'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={getAvatarUrl(conv.partnerAvatar)}
                      alt={conv.partnerName}
                      loading="lazy"
                      className="w-11 h-11 rounded-full object-cover border border-blue-100 shadow-2xs"
                    />
                    {conv.partnerGstin && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 bg-[#0d47a1] text-white text-[8px] font-black px-1 rounded-full border border-white"
                        title="Verified GST Supplier"
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4
                        className={`text-xs font-bold truncate transition ${
                          isSelected ? 'text-[#0d47a1]' : 'text-slate-900 group-hover:text-[#0d47a1]'
                        }`}
                      >
                        {conv.partnerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium flex-shrink-0 ml-1">
                        {conv.lastTimestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate leading-snug">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {conv.unreadCount && conv.unreadCount > 0 ? (
                    <span className="bg-[#0d47a1] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-2xs">
                      {conv.unreadCount}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoiceCall(conv.partnerPhone, conv.partnerName);
                    }}
                    className="bg-blue-50 hover:bg-[#0d47a1] text-[#0d47a1] hover:text-white border border-blue-200 p-2 rounded-xl transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                    title={`Call ${conv.partnerName}`}
                  >
                    <span className="text-xs">📞</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // RENDER ACTIVE CHAT CONVERSATION VIEW
  const renderActiveChatThread = () => {
    if (!activeConv) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50/50 space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-[#0d47a1] flex items-center justify-center text-3xl shadow-inner">
            💬
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-slate-900">Dropthan B2B Supplier Chat</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select a conversation to communicate directly with verified suppliers, negotiate wholesale pricing, and request GST invoices.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-white">
        {/* TOP HEADER */}
        <div className="p-3 bg-[#0d47a1] text-white flex items-center justify-between border-b border-blue-900/30 shadow-xs flex-shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* BACK BUTTON ON MOBILE */}
            <button
              type="button"
              onClick={() => setActiveChatId(null)}
              className="md:hidden text-white hover:bg-blue-800 p-1.5 rounded-xl text-base font-bold transition flex-shrink-0 cursor-pointer active:scale-95"
              title="Back to Conversations"
            >
              ←
            </button>
            <div className="relative flex-shrink-0">
              <img
                src={getAvatarUrl(activeConv.partnerAvatar)}
                alt={activeConv.partnerName}
                className="w-9 h-9 rounded-full object-cover border border-white/80 shadow-2xs"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d47a1]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1">
                <span>{activeConv.partnerName}</span>
                <span className="text-blue-200 text-[11px]">✓</span>
              </h3>
              <p className="text-[10px] text-blue-100 font-medium truncate">
                {activeConv.partnerGstin ? `GST: ${activeConv.partnerGstin}` : 'Verified B2B Supplier • Active'}
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="bg-blue-800/80 hover:bg-blue-700 text-white border border-blue-300/30 text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
              title="View Supplier Location on Map"
            >
              <span>🗺️</span>
              <span className="hidden sm:inline">Map</span>
            </button>
            <a
              href={`https://wa.me/${(activeConv.partnerPhone || '+919876543210').replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(activeConv.partnerName || '')},%20I%20am%20inquiring%20via%20Dropthan%20B2B.`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1 active:scale-95"
              title="Chat on WhatsApp"
            >
              <span>💬</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => handleVoiceCall()}
              className="bg-white hover:bg-blue-50 text-[#0d47a1] text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
              title="Call Supplier"
            >
              <span>📞</span>
              <span className="hidden sm:inline">Call</span>
            </button>
          </div>
        </div>

        {/* QUICK ACTION CHIPS */}
        <div className="bg-blue-50/90 border-b border-blue-100 px-3 py-2 flex items-center space-x-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <button
            type="button"
            onClick={() => handleSendMessage('💰 Request Wholesale Tier Quote & Price Breakdown')}
            className="bg-white hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition shadow-2xs active:scale-95"
          >
            💰 Quote
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('📦 Request Minimum Order Quantity (MOQ) & Stock Status')}
            className="bg-white hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition shadow-2xs active:scale-95"
          >
            📦 MOQ
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('🚚 What are the dispatch timeline and freight options to my city?')}
            className="bg-white hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition shadow-2xs active:scale-95"
          >
            🚚 Delivery
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('📜 Please share your full PDF product catalog and price list')}
            className="bg-white hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition shadow-2xs active:scale-95"
          >
            📜 Catalog
          </button>
        </div>

        {/* MESSAGES SCROLL AREA */}
        <div className="flex-1 min-h-[260px] overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-slate-50/80">
          <div className="text-center my-1.5">
            <span className="text-[10px] font-bold bg-slate-200/80 text-slate-600 px-3 py-1 rounded-full">
              🔒 End-to-End Verified B2B Trade Chat
            </span>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_me ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl text-xs shadow-2xs ${
                  m.is_me
                    ? 'bg-[#0d47a1] text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <span className={`text-[9px] ${m.is_me ? 'text-blue-200' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </span>
                  {m.is_me && <span className="text-[10px] text-blue-200 font-bold">✓✓</span>}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* RESTORED TYPING INPUT BOX - ALWAYS VISIBLE AT BOTTOM */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 flex-shrink-0 shadow-xs"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type B2B inquiry, quantities, or pricing question..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d47a1] focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 flex-shrink-0 ${
              inputText.trim()
                ? 'bg-[#0d47a1] hover:bg-blue-800 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Send</span>
            <span>✈️</span>
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* DESKTOP SPLIT VIEW (>= 768px) */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:h-[650px] lg:h-[700px]">
        {/* LEFT: CONVERSATIONS */}
        <div className="md:col-span-5 lg:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col h-full">
          {renderConversationList()}
        </div>

        {/* RIGHT: CHAT THREAD */}
        <div className="md:col-span-7 lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col h-full">
          {renderActiveChatThread()}
        </div>
      </div>

      {/* MOBILE SINGLE VIEW (< 768px) */}
      <div className="md:hidden bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs h-[calc(100vh-210px)] min-h-[480px] flex flex-col">
        {!activeChatId ? renderConversationList() : renderActiveChatThread()}
      </div>

      {/* CALL NOTIFICATION BANNER */}
      {callNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {callNotification}
        </div>
      )}

      {/* GOOGLE MAPS LOCATION MODAL FOR ACTIVE CHAT SUPPLIER */}
      <LocationMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        locationName={activeVendor?.location || 'Surat, Gujarat'}
        authorName={activeConv?.partnerName || activeVendor?.author || 'Supplier'}
      />
    </div>
  );
};
