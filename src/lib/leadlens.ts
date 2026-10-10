/**
 * LeadLens Real-Time Tracking & Abandonment Intelligence Engine
 * Brand ID: bnd_dropthan_593
 * API Key: ll_live_bnddropt_03cea5d4b42aa3efa9
 * Endpoint: https://ais-dev-mfgmnvhaaoroq4mpo7zfxn-134638396931.asia-east1.run.app
 */

export const LEADLENS_BRAND_ID = 'bnd_dropthan_593';
export const LEADLENS_API_KEY = 'll_live_bnddropt_03cea5d4b42aa3efa9';
export const LEADLENS_BRAND_KEY = 'll_live_bnddropt_03cea5d4b42aa3efa9';
export const LEADLENS_BACKEND_URL = 'https://ais-dev-mfgmnvhaaoroq4mpo7zfxn-134638396931.asia-east1.run.app';

import { insertLeadToSupabase } from './leadlensSupabase';

export interface LeadLensSessionData {
  sessionId: string;
  visitorName: string;
  phone: string;
  email: string;
  clickedItemName: string;
  lastViewedCategory?: string;
  lastViewedPrice?: string;
  cartItems: string[];
  purchaseCompleted: boolean;
  abandonmentSent: boolean;
  createdAt: number;
  lastActiveAt: number;
}

const STORAGE_KEY = 'leadlens_tracker_session';

// Helper to get or generate persistent session ID
export const getLeadLensSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem('leadlens_session_id') || sessionStorage.getItem('leadlens_session_id');
    if (existing) return existing;
    const newId = `ll_sid_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('leadlens_session_id', newId);
    sessionStorage.setItem('leadlens_session_id', newId);
    return newId;
  } catch {
    return `ll_sid_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
};

// Retrieve current session data
export const getLeadLensSession = (): LeadLensSessionData => {
  const sessionId = getLeadLensSessionId();
  const defaultData: LeadLensSessionData = {
    sessionId,
    visitorName: '',
    phone: '',
    email: '',
    clickedItemName: '',
    cartItems: [],
    purchaseCompleted: false,
    abandonmentSent: false,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  if (typeof window === 'undefined') return defaultData;

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return {
      ...defaultData,
      ...parsed,
      sessionId,
      lastActiveAt: Date.now(),
    };
  } catch {
    return defaultData;
  }
};

// Save session data
export const saveLeadLensSession = (data: Partial<LeadLensSessionData>): LeadLensSessionData => {
  const current = getLeadLensSession();
  const updated: LeadLensSessionData = {
    ...current,
    ...data,
    lastActiveAt: Date.now(),
  };
  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota
  }
  return updated;
};

// Real-time dispatch to LeadLens
export const dispatchLeadLensEvent = async (
  eventType: 'session_start' | 'contact_captured' | 'product_view' | 'cart_abandonment' | 'purchase_completed',
  extraData: Record<string, any> = {}
) => {
  if (typeof window === 'undefined') return;

  const session = getLeadLensSession();
  const payload = {
    brand_key: LEADLENS_BRAND_KEY,
    event_type: eventType,
    session_id: session.sessionId,
    visitor_name: session.visitorName || extraData.visitor_name || extraData.visitorName || '',
    phone_number: session.phone || extraData.phone || extraData.phoneNumber || '',
    email_id: session.email || extraData.email || extraData.emailId || '',
    clicked_item_name: session.clickedItemName || extraData.clicked_item_name || extraData.itemName || '',
    cart_items: session.cartItems || [],
    url: window.location.href,
    pathname: window.location.pathname,
    referrer: document.referrer || '',
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    metadata: {
      ...extraData,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    },
  };

  // If window.LeadLens script exposed on page, invoke it directly
  if ((window as any).LeadLens && typeof (window as any).LeadLens.track === 'function') {
    try {
      (window as any).LeadLens.track(eventType, payload);
    } catch (e) {
      console.warn('LeadLens SDK track call:', e);
    }
  }

  // Also send real-time HTTP payload to LeadLens backend
  const targets = [
    `${LEADLENS_BACKEND_URL}/api/track`,
    `${LEADLENS_BACKEND_URL}/track`,
  ];

  for (const url of targets) {
    try {
      if (eventType === 'cart_abandonment' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore network errors in preview
    }
  }
};

/**
 * Track Product View / Click
 */
export const trackLeadLensProductView = (
  itemName: string,
  extra: { category?: string; price?: string; author?: string; postId?: string } = {}
) => {
  if (!itemName) return;
  const cleanName = itemName.trim();
  saveLeadLensSession({
    clickedItemName: cleanName,
    lastViewedCategory: extra.category,
    lastViewedPrice: extra.price,
    purchaseCompleted: false,
    abandonmentSent: false,
  });

  dispatchLeadLensEvent('product_view', {
    clicked_item_name: cleanName,
    ...extra,
  });
};

/**
 * Update captured contact details (phone, email, name)
 */
export const recordLeadLensContact = (contact: { phone?: string; email?: string; name?: string }) => {
  const current = getLeadLensSession();
  let changed = false;
  const updates: Partial<LeadLensSessionData> = {};

  if (contact.phone && contact.phone.trim() && contact.phone !== current.phone) {
    updates.phone = contact.phone.trim();
    changed = true;
  }
  if (contact.email && contact.email.trim() && contact.email !== current.email) {
    updates.email = contact.email.trim();
    changed = true;
  }
  if (contact.name && contact.name.trim() && contact.name !== current.visitorName) {
    updates.visitorName = contact.name.trim();
    changed = true;
  }

  if (changed) {
    saveLeadLensSession(updates);
    dispatchLeadLensEvent('contact_captured', updates);
  }
};

/**
 * Mark transaction completed so cart abandonment doesn't fire erroneously
 */
export const trackLeadLensConversion = (details?: Record<string, any>) => {
  saveLeadLensSession({
    purchaseCompleted: true,
    abandonmentSent: false,
  });
  dispatchLeadLensEvent('purchase_completed', details || {});
};

/**
 * Trigger Cart / Inquiry Abandonment
 */
export const triggerLeadLensAbandonment = () => {
  const session = getLeadLensSession();
  // An abandonment occurs when user has entered contact details AND has viewed an item, but leaves without purchase
  const hasContact = Boolean(session.phone || session.email);
  const hasItem = Boolean(session.clickedItemName);

  if (hasContact && hasItem && !session.purchaseCompleted && !session.abandonmentSent) {
    saveLeadLensSession({ abandonmentSent: true });

    // Store in Supabase public.leads for real-time recovery dashboard
    insertLeadToSupabase({
      brand_id: LEADLENS_BRAND_ID,
      visitor_name: session.visitorName || 'Storefront Visitor',
      phone_number: session.phone || '',
      email: session.email || '',
      clicked_item: session.clickedItemName || 'Catalog Product Offer',
      status: 'Abandoned',
    }).catch((err) => console.warn('Supabase lead write error:', err));

    dispatchLeadLensEvent('cart_abandonment', {
      abandonment_trigger: 'page_exit_or_hidden',
      clicked_item_name: session.clickedItemName,
      phone_number: session.phone,
      email_id: session.email,
      visitor_name: session.visitorName,
    });
  }
};

/**
 * Global Initializer to automatically monitor DOM inputs and window events
 */
let isInitialized = false;

export const initLeadLensTracking = () => {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // Initial session start event
  dispatchLeadLensEvent('session_start');

  // Global Input monitoring for Phone Number & Email ID
  const handleInputChange = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target || !target.value) return;

    const val = target.value.trim();
    const type = (target.getAttribute('type') || '').toLowerCase();
    const name = (target.getAttribute('name') || '').toLowerCase();
    const id = (target.getAttribute('id') || '').toLowerCase();
    const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();

    // 1. Detect Phone
    const isPhoneField =
      type === 'tel' ||
      name.includes('phone') ||
      name.includes('mobile') ||
      id.includes('phone') ||
      id.includes('mobile') ||
      placeholder.includes('phone') ||
      placeholder.includes('mobile') ||
      target.getAttribute('data-leadlens') === 'phone';

    if (isPhoneField) {
      const cleanDigits = val.replace(/\D/g, '');
      if (cleanDigits.length >= 7) {
        recordLeadLensContact({ phone: val });
      }
    } else {
      // Regex check for phone-like value with 8-15 digits
      const digitsOnly = val.replace(/\D/g, '');
      if (digitsOnly.length >= 10 && /^[+]?[0-9\s\-()]{10,20}$/.test(val)) {
        recordLeadLensContact({ phone: val });
      }
    }

    // 2. Detect Email
    const isEmailField =
      type === 'email' ||
      name.includes('email') ||
      id.includes('email') ||
      placeholder.includes('email') ||
      target.getAttribute('data-leadlens') === 'email';

    if (isEmailField || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        recordLeadLensContact({ email: val });
      }
    }

    // 3. Detect Visitor / Customer Name
    const isNameField =
      name.includes('name') ||
      id.includes('name') ||
      placeholder.includes('full name') ||
      target.getAttribute('data-leadlens') === 'name';

    if (isNameField && val.length >= 2 && !val.includes('@') && !/^\d+$/.test(val)) {
      recordLeadLensContact({ name: val });
    }
  };

  // Debounced input listener
  let inputDebounce: any = null;
  const debouncedInput = (e: Event) => {
    if (inputDebounce) clearTimeout(inputDebounce);
    inputDebounce = setTimeout(() => handleInputChange(e), 400);
  };

  document.addEventListener('input', debouncedInput, { passive: true, capture: true });
  document.addEventListener('change', handleInputChange, { passive: true, capture: true });
  document.addEventListener('blur', handleInputChange, { passive: true, capture: true });

  // Monitor DOM clicks on product cards or inquiry buttons
  document.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Detect click on elements with data-product-title or product cards
    const productEl = target.closest('[data-product-title], [data-item-name]');
    if (productEl) {
      const title =
        productEl.getAttribute('data-product-title') ||
        productEl.getAttribute('data-item-name');
      if (title) {
        trackLeadLensProductView(title);
      }
    }
  }, { passive: true });

  // Abandonment tracking triggers: page exit, tab hidden, or beforeunload
  window.addEventListener('beforeunload', () => {
    triggerLeadLensAbandonment();
  });

  window.addEventListener('pagehide', () => {
    triggerLeadLensAbandonment();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerLeadLensAbandonment();
    }
  });
};
