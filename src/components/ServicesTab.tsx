import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  Sparkles,
  TrendingUp,
  Globe,
  Smartphone,
  Video,
  Receipt,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Phone,
  Zap,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  Headphones,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Building2,
  Layers,
  Award,
  Check,
  Sliders,
  RefreshCw
} from 'lucide-react';

interface ServicesTabProps {
  user: UserProfile | null;
}

export interface DigitalServiceItem {
  id: 'meta_ads' | 'website_creation' | 'app_creation' | 'video_production';
  title: string;
  badge: string;
  badgeColor: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  highlights: string[];
  deliverables: string[];
  popularFor: string;
  startingPrice: string;
  deliveryTime: string;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ user }) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('meta_ads');
  const [selectedBillingPlan, setSelectedBillingPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Lead Capture Modal & State
  const [isLeadModalOpen, setIsLeadModalOpen] = useState<boolean>(false);
  const [activeLeadService, setActiveLeadService] = useState<{ title: string; badge?: string; tagline?: string } | null>(null);
  const [leadName, setLeadName] = useState<string>(user?.displayName || '');
  const [leadBusiness, setLeadBusiness] = useState<string>(user?.companyName || user?.displayName || '');
  const [leadPhone, setLeadPhone] = useState<string>(user?.phone || '');
  const [leadRole, setLeadRole] = useState<string>(user?.role ? user.role.toUpperCase() : 'Wholesaler');
  const [leadLocation, setLeadLocation] = useState<string>(
    user?.location || user?.storeAddress || 'India'
  );
  const [geoCoordinates, setGeoCoordinates] = useState<{ lat: number; lng: number } | null>(
    user?.lat && user?.lng ? { lat: user.lat, lng: user.lng } : null
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [leadNotes, setLeadNotes] = useState<string>('');
  const [selectedScope, setSelectedScope] = useState<'Standard' | 'Growth' | 'Enterprise'>('Growth');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const adminPhone = '918838533014';
  const adminDisplayPhone = '+91 88385 33014';

  // Digital Services List (Leads Generation removed as requested; Meta Ads is #1)
  const digitalServices: DigitalServiceItem[] = [
    {
      id: 'meta_ads',
      title: 'Meta Ads & Marketing',
      badge: 'High ROAS',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      tagline: 'Facebook & Instagram Ads for Dropshippers, D2C & B2B Wholesalers',
      description:
        'Architect high-converting Meta advertising campaigns that deliver qualified wholesale inquiries and profitable e-commerce sales with B2B audience targeting.',
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      iconBg: 'from-blue-600 to-indigo-600 shadow-blue-500/25',
      highlights: [
        'B2B & D2C Targeted Custom Audiences',
        'High-Converting Static & Video Ad Creatives',
        'Meta Pixel & CAPI Event Integration',
        '3x–6x Target ROAS Optimization'
      ],
      deliverables: [
        'Ad Account & Pixel Audit',
        'Multi-Funnel Campaign Setup',
        'Retargeting Audiences',
        'Weekly Reports'
      ],
      popularFor: 'E-commerce Brands & Garment Mills',
      startingPrice: 'Custom Quote / Retainer',
      deliveryTime: 'Live in 48 Hours'
    },
    {
      id: 'website_creation',
      title: 'Website Creation',
      badge: 'High Speed',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      tagline: 'Modern Wholesale Portals, Shopify & Custom E-Commerce Stores',
      description:
        'Launch ultra-fast, mobile-first websites designed for Indian wholesale and retail with 1-click WhatsApp checkout and UPI payment gateways.',
      icon: <Globe className="w-5 h-5 text-white" />,
      iconBg: 'from-emerald-600 to-teal-600 shadow-emerald-500/25',
      highlights: [
        '1-Click WhatsApp Ordering & Quick Checkout',
        'Razorpay, Cashfree & UPI Payment Sync',
        'Fast 90+ Google Mobile PageSpeed',
        'SEO-Optimized Product Catalogs'
      ],
      deliverables: [
        'Responsive Web Design',
        'Catalog Management',
        'Payment & Shipping Setup',
        'Domain & SSL Setup'
      ],
      popularFor: 'Wholesalers & D2C Stores',
      startingPrice: 'Starting ₹4,999',
      deliveryTime: '3 to 5 Days'
    },
    {
      id: 'app_creation',
      title: 'App Creation',
      badge: 'Android & iOS',
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
      tagline: 'Native B2B Wholesale Ordering & Customer Apps',
      description:
        'Transform your wholesale catalog into a dedicated Android and iOS mobile app with live push notifications, tiered wholesale pricing, and offline browsing.',
      icon: <Smartphone className="w-5 h-5 text-white" />,
      iconBg: 'from-purple-600 to-indigo-700 shadow-purple-500/25',
      highlights: [
        'Google Play & App Store Ready',
        'Broadcast Push Notification Console',
        'Wholesale MOQ & Tiered Pricing Rules',
        'Offline Catalog Browsing'
      ],
      deliverables: [
        'Android (.APK / Play Store) & iOS App',
        'Admin Management Dashboard',
        'Push Notification Console',
        'Technical Maintenance'
      ],
      popularFor: 'Manufacturers & Distributors',
      startingPrice: 'Starting ₹9,999',
      deliveryTime: '7 to 10 Days'
    },
    {
      id: 'video_production',
      title: 'Video Production & Editing',
      badge: 'Viral Formats',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      tagline: 'High-Converting Product Videos, Reels, Ads & Factory Tours',
      description:
        'Stand out with attention-grabbing video creatives tailored for Meta ads, Instagram Reels, and YouTube Shorts with motion graphics and sales hooks.',
      icon: <Video className="w-5 h-5 text-white" />,
      iconBg: 'from-rose-600 to-pink-600 shadow-rose-500/25',
      highlights: [
        'High-Retention First 3-Second Hooks',
        'Hindi & English Voiceovers with Subtitles',
        'Warehouse & Product Showcase Color Grading',
        'Aspect Ratios for Reels (9:16) & Ads (1:1)'
      ],
      deliverables: [
        'High-Resolution Ad Creatives',
        '3 Iterations for A/B Testing',
        'Captions & Royalty-Free Audio',
        'Fast Turnaround'
      ],
      popularFor: 'Fashion Brands & Manufacturers',
      startingPrice: 'Starting ₹1,499 / Video',
      deliveryTime: '24 to 48 Hours'
    }
  ];

  // Auto detect coordinates on mount or on request
  const detectLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setGeoCoordinates({ lat, lng });
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation access declined or unavailable:', err.message);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  // Update form if user prop changes
  useEffect(() => {
    if (user) {
      if (user.displayName && !leadName) setLeadName(user.displayName);
      if (user.companyName && !leadBusiness) setLeadBusiness(user.companyName);
      if (user.phone && !leadPhone) setLeadPhone(user.phone);
      if (user.role) setLeadRole(user.role.toUpperCase());
      const loc = user.location || user.storeAddress;
      if (loc && !leadLocation) setLeadLocation(loc);
      if (user.lat && user.lng && !geoCoordinates) {
        setGeoCoordinates({ lat: user.lat, lng: user.lng });
      }
    }
  }, [user]);

  // Open Lead Modal for a specific service
  const handleOpenLeadModal = (service: { title: string; badge?: string; tagline?: string }) => {
    setActiveLeadService(service);
    setIsLeadModalOpen(true);
  };

  // Generate formatted WhatsApp message with full customer details & location
  const buildLeadMessage = (serviceTitle: string, customScope?: string) => {
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const coordinatesText = geoCoordinates
      ? `https://maps.google.com/?q=${geoCoordinates.lat.toFixed(5)},${geoCoordinates.lng.toFixed(5)}`
      : 'Auto-detected from network';

    const cleanContactPhone = leadPhone || user?.phone || 'Not provided';
    const cleanCustomerName = leadName || user?.displayName || 'Dropthan Trader';
    const cleanBusiness = leadBusiness || cleanCustomerName;
    const cleanLocation = leadLocation || user?.location || user?.storeAddress || 'India';
    const scopeUsed = customScope || selectedScope;

    return (
      `*🚀 NEW DROPTHAN DIGITAL SERVICE INQUIRY* 🚀\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Service Requested:* ${serviceTitle}\n` +
      `📊 *Scope / Package:* ${scopeUsed}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Customer Name:* ${cleanCustomerName}\n` +
      `🏢 *Business / Firm:* ${cleanBusiness}\n` +
      `📞 *Contact Number:* ${cleanContactPhone}\n` +
      `🏷️ *Member Role:* ${leadRole}\n` +
      `📍 *Location / City:* ${cleanLocation}\n` +
      `🗺️ *Map Link:* ${coordinatesText}\n` +
      (leadNotes ? `💬 *Project Notes:* ${leadNotes}\n` : '') +
      `🕒 *Timestamp:* ${timestamp}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Sent directly via Dropthan B2B Ecosystem_`
    );
  };

  // Dispatch Lead to WhatsApp
  const handleSendLeadWhatsApp = (serviceTitle: string, customScope?: string) => {
    const message = buildLeadMessage(serviceTitle, customScope);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${adminPhone}?text=${encoded}`, '_blank');
  };

  // Direct Call Action
  const handleDirectCall = () => {
    window.location.href = `tel:+${adminPhone}`;
  };

  // Copy Lead summary
  const handleCopyLead = (serviceTitle: string) => {
    const message = buildLeadMessage(serviceTitle);
    navigator.clipboard.writeText(message);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const faqs = [
    {
      q: 'What is included in Dropthan Digital Services?',
      a: 'Dropthan Digital Services is our full-stack growth agency suite tailored for Indian manufacturers, wholesalers, dropshippers, and B2B brands. We provide Meta Ads management, Cloud Billing Software, custom website development, mobile app creation, and high-converting video production.'
    },
    {
      q: 'How quickly can my Meta Ads or Website go live?',
      a: 'Meta advertising campaigns are live within 24–48 hours after onboarding. Custom wholesale websites take 3–5 days, and mobile apps take 7–10 days with full testing and store publishing.'
    },
    {
      q: 'Can the Cloud Billing App print on portable Bluetooth thermal printers?',
      a: 'Yes! The Billing App supports all 2-inch and 3-inch Bluetooth thermal printers, desktop A4/A5 laser printers, and generates instant GST invoices with WhatsApp shareable PDF links.'
    },
    {
      q: 'How are customer details and location captured when I inquire?',
      a: 'When you tap any service, your registered business profile, contact number, and city/coordinates are automatically packaged into a high-priority business lead sent directly to our team on WhatsApp for zero-wait communication.'
    }
  ];

  return (
    <div className="space-y-4 w-full pb-10">
      {/* TOP HERO BANNER - COMPACT & HIGH IMPACT */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d47a1] via-[#1565c0] to-[#0a2f6c] text-white p-5 sm:p-6 shadow-md border border-blue-400/20">
        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 bg-blue-400/20 border border-blue-300/30 text-blue-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            <span>Dropthan Digital Ecosystem</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Dropthan Digital Services &amp; Software
          </h2>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
            Scale your manufacturing, wholesale, and dropshipping business with our dedicated growth stack: Meta Ads, Cloud Billing Software, Custom Websites, Mobile Apps &amp; Video Production.
          </p>

          {/* QUICK PERKS */}
          <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-blue-100">
            <span className="flex items-center gap-1 bg-blue-900/60 px-2.5 py-1 rounded-lg border border-blue-400/20">
              <Zap className="w-3 h-3 text-amber-300" /> Fast Setup
            </span>
            <span className="flex items-center gap-1 bg-blue-900/60 px-2.5 py-1 rounded-lg border border-blue-400/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified B2B ROI
            </span>
            <span className="flex items-center gap-1 bg-blue-900/60 px-2.5 py-1 rounded-lg border border-blue-400/20">
              <MessageCircle className="w-3 h-3 text-emerald-300" /> WhatsApp Direct Support
            </span>
          </div>
        </div>

        {/* BACKGROUND GLOW */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* TOP PRIORITY SERVICES SECTION:
          #1: META ADS & MARKETING (FLAGSHIP GROWTH)
          #2: CLOUD BILLING & INVOICING APP (PRIORITY #2 AT TOP AS REQUESTED) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Featured Business Growth Services</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            1-Click WhatsApp Booking
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* SERVICE #1: META ADS & MARKETING (COMPACT STREAMLINED TILE) */}
          <div
            id="service-card-meta-ads"
            className="flex flex-col justify-between bg-white rounded-2xl p-4 sm:p-5 border border-blue-500/80 ring-1 ring-blue-500/20 shadow-xs hover:shadow-md transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 leading-tight">
                        Meta Ads &amp; Marketing
                      </h4>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                        High ROAS
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      Facebook &amp; Instagram B2B Wholesaler &amp; D2C Ads
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                Architect high-converting Meta advertising campaigns targeting verified bulk buyers, retailers, and high-volume consumers with 3x–6x target ROAS.
              </p>

              {/* HIGHLIGHTS */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">B2B Buyer Targeting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">High-Converting Creatives</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Meta Pixel &amp; CAPI Setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Target 3x–6x ROAS</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Live in 48 Hours</span>
                </span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  Custom Retainer
                </span>
              </div>
            </div>

            {/* COMPACT ACTIONS */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => handleSendLeadWhatsApp('Meta Ads & Marketing')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>Inquire on WhatsApp</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => handleOpenLeadModal(digitalServices[0])}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 px-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Quote
              </button>

              <button
                onClick={handleDirectCall}
                className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] py-2 px-2.5 rounded-xl font-bold text-xs transition cursor-pointer border border-blue-200/60"
                title="Call Direct"
              >
                <Phone className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SERVICE #2: CLOUD BILLING & INVOICING APP (PRIORITY #2 AT TOP AS REQUESTED) */}
          <div
            id="service-card-billing-app"
            className="flex flex-col justify-between bg-white rounded-2xl p-4 sm:p-5 border border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-xs hover:shadow-md transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 leading-tight">
                        Cloud Billing &amp; Invoicing App
                      </h4>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
                        GST Ready
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      For Wholesale Suppliers, Distributors &amp; Online Shops
                    </p>
                  </div>
                </div>

                {/* DURATION PILL */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl shrink-0 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedBillingPlan('monthly')}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                      selectedBillingPlan === 'monthly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    ₹299/mo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingPlan('yearly')}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                      selectedBillingPlan === 'yearly'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Yearly (Save 40%)
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                Generate GST compliant invoices, manage catalog inventory, print on 2"/3" thermal printers, and send automated PDF bills with payment links to WhatsApp.
              </p>

              {/* HIGHLIGHTS */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 font-medium">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Mobile &amp; PC Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Printer className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">2" &amp; 3" Thermal Print</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Inventory &amp; Barcode</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">WhatsApp PDF Share</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Instant Activation</span>
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {selectedBillingPlan === 'yearly' ? '₹1,999 / Year' : '₹299 / Month'}
                </span>
              </div>
            </div>

            {/* COMPACT ACTIONS */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                id="btn-billing-app-whatsapp"
                onClick={() =>
                  handleSendLeadWhatsApp(
                    'Cloud Billing & Invoicing App',
                    `Plan: ${selectedBillingPlan.toUpperCase()} (Live Demo Request)`
                  )
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>Request Live Demo</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                onClick={() =>
                  handleOpenLeadModal({
                    title: 'Cloud Billing & Invoicing App',
                    badge: 'GST Ready',
                    tagline: 'GST Billing & Inventory System for Wholesalers'
                  })
                }
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 px-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Quote
              </button>

              <button
                onClick={handleDirectCall}
                className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] py-2 px-2.5 rounded-xl font-bold text-xs transition cursor-pointer border border-blue-200/60"
                title="Call Direct"
              >
                <Phone className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADDITIONAL DIGITAL SERVICES: WEBSITE CREATION, APP CREATION, VIDEO PRODUCTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Digital Development &amp; Media Services</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Tailored for Indian Trade
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {digitalServices.slice(1).map((service) => (
            <div
              key={service.id}
              id={`digital-service-card-${service.id}`}
              className="flex flex-col justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition"
            >
              <div className="space-y-2.5">
                {/* CARD HEADER */}
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${service.iconBg} flex items-center justify-center text-white shadow-xs shrink-0`}
                  >
                    {service.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {service.title}
                      </h4>
                    </div>
                    <span
                      className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border mt-0.5 ${service.badgeColor}`}
                    >
                      {service.badge}
                    </span>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <p className="text-[11px] text-slate-600 leading-snug bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {service.description}
                </p>

                {/* KEY HIGHLIGHTS */}
                <div className="space-y-1 text-[11px] text-slate-700 font-medium pt-0.5">
                  {service.highlights.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate leading-tight">{item}</span>
                    </div>
                  ))}
                </div>

                {/* PRICE & TIME */}
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    <span>{service.deliveryTime}</span>
                  </span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {service.startingPrice}
                  </span>
                </div>
              </div>

              {/* COMPACT ACTIONS */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-1.5">
                <button
                  onClick={() => handleSendLeadWhatsApp(service.title)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span>Inquire on WhatsApp</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleOpenLeadModal(service)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 px-2 rounded-lg font-bold text-[10px] transition cursor-pointer text-center"
                  >
                    Custom Quote
                  </button>

                  <button
                    onClick={handleDirectCall}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-[#0d47a1] py-1.5 px-2 rounded-lg font-bold text-[10px] transition cursor-pointer border border-blue-200/60 text-center"
                  >
                    Call Direct
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DIRECT CONSULTATION BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-extrabold text-white">
              Direct Technical &amp; Growth Consultation
            </h4>
            <p className="text-[11px] text-slate-400">
              Speak directly with our agency team at <strong className="text-blue-300">{adminDisplayPhone}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            id="btn-direct-consultation-whatsapp"
            onClick={() => handleSendLeadWhatsApp('Direct Digital Consultation', 'General Inquiry')}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white" />
            <span>Chat on WhatsApp</span>
          </button>

          <button
            onClick={handleDirectCall}
            className="flex-1 sm:flex-initial bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-[#0d47a1]" />
            <span>Call Now</span>
          </button>
        </div>
      </div>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>❓</span>
          <span>Frequently Asked Questions</span>
        </h4>

        <div className="divide-y divide-slate-100 space-y-1">
          {faqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div key={idx} className="pt-2">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between text-left py-1.5 text-xs font-bold text-slate-800 hover:text-[#0d47a1] transition cursor-pointer gap-2"
                >
                  <span>{faq.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <p className="text-[11px] text-slate-600 pb-1.5 leading-relaxed animate-in fade-in duration-150">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* LEAD CAPTURE & PROPOSAL MODAL */}
      {isLeadModalOpen && activeLeadService && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="bg-[#0d47a1] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Request {activeLeadService.title}
                  </h3>
                  <p className="text-[10px] text-blue-100">
                    Instant lead submission &amp; WhatsApp dispatch
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsLeadModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* SERVICE SUMMARY TILE */}
              <div className="bg-blue-50/80 border border-blue-200/80 p-3 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0d47a1]">
                    {activeLeadService.title}
                  </span>
                  {activeLeadService.badge && (
                    <span className="text-[9px] font-black bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                      {activeLeadService.badge}
                    </span>
                  )}
                </div>
                {activeLeadService.tagline && (
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {activeLeadService.tagline}
                  </p>
                )}
              </div>

              {/* SCOPE SELECTION */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                  Project Scale / Scope:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Standard', 'Growth', 'Enterprise'] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setSelectedScope(scope)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        selectedScope === scope
                          ? 'bg-[#0d47a1] text-white border-[#0d47a1] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>

              {/* CONTACT DETAILS INPUTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700">
                    Your Name / Contact:
                  </label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700">
                    Business / Firm Name:
                  </label>
                  <input
                    type="text"
                    value={leadBusiness}
                    onChange={(e) => setLeadBusiness(e.target.value)}
                    placeholder="e.g. Apex Tex Wholesale"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700">
                    Phone / WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="Enter 10-digit phone"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700">
                    Account Category:
                  </label>
                  <select
                    value={leadRole}
                    onChange={(e) => setLeadRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d47a1]"
                  >
                    <option value="WHOLESALER">Wholesaler</option>
                    <option value="DROPSHIPPER">Dropshipper</option>
                    <option value="MANUFACTURER">Manufacturer</option>
                    <option value="EXPORTER">Exporter</option>
                    <option value="RESELLER">Reseller</option>
                    <option value="OTHER">Other Business</option>
                  </select>
                </div>
              </div>

              {/* LOCATION & GEOLOCATION CAPTURE */}
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>Captured Location:</span>
                  </label>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    className="text-[9px] font-bold text-[#0d47a1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detecting...' : 'Refresh GPS'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={leadLocation}
                  onChange={(e) => setLeadLocation(e.target.value)}
                  placeholder="City, State, Pincode"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d47a1]"
                />

                {geoCoordinates && (
                  <p className="text-[9px] text-emerald-700 font-medium">
                    📍 GPS: {geoCoordinates.lat.toFixed(4)}° N, {geoCoordinates.lng.toFixed(4)}° E
                  </p>
                )}
              </div>

              {/* PROJECT NOTES */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700">
                  Specific Requirements:
                </label>
                <textarea
                  rows={2}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Describe your requirements, timeline, or products..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d47a1] resize-none"
                />
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSendLeadWhatsApp(activeLeadService.title, selectedScope);
                    setIsLeadModalOpen(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Send Lead &amp; Open WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleCopyLead(activeLeadService.title)}
                    className="flex-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 text-[11px]"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <span>Copy Summary</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectCall}
                    className="flex-1 py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-[#0d47a1] rounded-lg text-center transition cursor-pointer border border-blue-200 flex items-center justify-center gap-1 text-[11px]"
                  >
                    <Phone className="w-3 h-3 text-[#0d47a1]" />
                    <span>Call Admin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
