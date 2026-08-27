import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  TrendingUp,
  Receipt,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Zap,
  ShieldCheck,
  Smartphone,
  BarChart3,
  Layers,
  ArrowRight,
  Headphones,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ServicesTabProps {
  user: UserProfile | null;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ user }) => {
  const [selectedMetaPlan, setSelectedMetaPlan] = useState<'starter' | 'growth' | 'scale'>('growth');
  const [selectedBillingPlan, setSelectedBillingPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const adminPhone = '918838533014';
  const userName = user?.displayName || 'Dropthan Trader';
  const userRole = user?.role ? user.role.toUpperCase() : 'B2B Member';

  const handleOpenWhatsApp = (serviceName: string, details?: string) => {
    const textMessage = encodeURIComponent(
      `Hello Dropthan Services Team! 👋\n\n` +
      `I am interested in *${serviceName}* for my business.\n` +
      `• *Name / Business:* ${userName}\n` +
      `• *Account Role:* ${userRole}\n` +
      (details ? `• *Selected Plan / Details:* ${details}\n` : '') +
      `\nPlease share pricing, demo, and onboarding steps. Thank you!`
    );

    window.open(`https://wa.me/${adminPhone}?text=${textMessage}`, '_blank');
  };

  const faqs = [
    {
      q: 'How do I get started with Meta Ads or Billing App?',
      a: 'Simply tap the "Chat on WhatsApp" button on any service card. Our dedicated onboarding specialist will connect with you within 15 minutes to configure your account.'
    },
    {
      q: 'Can the Billing App print on portable Bluetooth thermal printers?',
      a: 'Yes! The Billing App supports all 2-inch and 3-inch Bluetooth thermal printers, standard desktop A4/A5 laser printers, and exports instant PDF invoices for WhatsApp sharing.'
    },
    {
      q: 'What is included in the Meta Ads management service?',
      a: 'We handle complete ad campaign architecture: high-converting image/video creatives, copywriting, pixel & CAPI integration, custom B2B/D2C audience targeting, and daily ROAS optimization.'
    },
    {
      q: 'Is there a free demo or trial available?',
      a: 'Yes! We offer a full live demo of the Billing App and a free Meta Ads audit for your e-commerce store or wholesale catalog.'
    }
  ];

  return (
    <div className="space-y-4 max-w-lg md:max-w-2xl mx-auto pb-10">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d47a1] via-[#1565c0] to-[#0a2f6c] text-white p-5 sm:p-6 shadow-md border border-blue-400/20">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-blue-400/20 border border-blue-300/30 text-blue-100 text-[11px] font-extrabold px-3 py-1 rounded-full backdrop-blur-sm shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Dropthan Growth Ecosystem</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
            Scale Your Wholesale & E-Commerce Business
          </h2>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-md">
            Supercharge your B2B operations with high-converting Meta advertising campaigns and automated GST billing software.
          </p>

          {/* QUICK PERKS */}
          <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-bold text-blue-100">
            <span className="flex items-center gap-1 bg-blue-900/50 px-2.5 py-1 rounded-xl border border-blue-400/20">
              <Zap className="w-3 h-3 text-amber-300" /> Fast 15-Min Setup
            </span>
            <span className="flex items-center gap-1 bg-blue-900/50 px-2.5 py-1 rounded-xl border border-blue-400/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> 100% Verified Solutions
            </span>
            <span className="flex items-center gap-1 bg-blue-900/50 px-2.5 py-1 rounded-xl border border-blue-400/20">
              <MessageCircle className="w-3 h-3 text-emerald-300" /> 24/7 WhatsApp Support
            </span>
          </div>
        </div>

        {/* BACKGROUND GLOW */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* SERVICE 1: META ADS MANAGEMENT */}
      <div id="service-card-meta-ads" className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4 hover:border-blue-300 transition">
        {/* CARD TOP */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900">Meta Ads Management</h3>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  High ROAS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Facebook & Instagram Ads for Dropshippers, D2C & B2B Wholesalers
              </p>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
          Get profitable customer acquisitions with expert campaign architecture. We design video creatives, write persuasive copy, configure Meta Pixel / Conversion API, and scale budgets with target 3x–6x ROAS.
        </p>

        {/* BULLET FEATURES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Custom B2B & D2C Audience Research</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>High-Converting Video & Banner Creatives</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pixel, CAPI & Catalog Feed Setup</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Daily ROAS Scaling & Weekly Reports</span>
          </div>
        </div>

        {/* PLAN SELECTION PILLS */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            Select Campaign Scope:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedMetaPlan('starter')}
              className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                selectedMetaPlan === 'starter'
                  ? 'border-[#0d47a1] bg-blue-50/80 text-[#0d47a1] font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-black">Starter</div>
              <div className="text-[10px] text-slate-500">1-2 Campaigns</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMetaPlan('growth')}
              className={`p-2.5 rounded-2xl border text-center transition cursor-pointer relative ${
                selectedMetaPlan === 'growth'
                  ? 'border-[#0d47a1] bg-blue-50/80 text-[#0d47a1] font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">
                Popular
              </span>
              <div className="text-xs font-black">Growth</div>
              <div className="text-[10px] text-slate-500">Full Funnel + CAPI</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMetaPlan('scale')}
              className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                selectedMetaPlan === 'scale'
                  ? 'border-[#0d47a1] bg-blue-50/80 text-[#0d47a1] font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-black">Enterprise</div>
              <div className="text-[10px] text-slate-500">Multi-Channel Scale</div>
            </button>
          </div>
        </div>

        {/* CTA BUTTON */}
        <button
          id="btn-meta-ads-whatsapp"
          onClick={() => handleOpenWhatsApp('Meta Ads Management Service', `Plan: ${selectedMetaPlan.toUpperCase()}`)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition shadow-md cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span>Inquire & Start Meta Ads on WhatsApp</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* SERVICE 2: BILLING & INVOICING APP */}
      <div id="service-card-billing-app" className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4 hover:border-blue-300 transition">
        {/* CARD TOP */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900">Cloud Billing & Invoicing App</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  GST Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                For Wholesale Suppliers, Distributors, Shops & Online Sellers
              </p>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
          Create GST compliant invoices, manage catalog inventory, generate thermal barcodes, and send automated PDF bills with payment links directly to customer WhatsApp in seconds.
        </p>

        {/* BULLET FEATURES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Mobile & Desktop Real-Time Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>2" & 3" Bluetooth Thermal Printing</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Live Stock & Low Inventory Alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>1-Click WhatsApp Invoice & Reminders</span>
          </div>
        </div>

        {/* DURATION PILLS */}
        <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedBillingPlan('monthly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              selectedBillingPlan === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Monthly Plan (₹299/mo)
          </button>
          <button
            type="button"
            onClick={() => setSelectedBillingPlan('yearly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              selectedBillingPlan === 'yearly'
                ? 'bg-[#0d47a1] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Annual Plan (Save 40%)</span>
            <span className="bg-amber-400 text-slate-900 text-[9px] px-1 py-0.2 rounded-full font-black">
              Best
            </span>
          </button>
        </div>

        {/* CTA BUTTON */}
        <button
          id="btn-billing-app-whatsapp"
          onClick={() => handleOpenWhatsApp('Billing & Invoicing App', `Plan Duration: ${selectedBillingPlan.toUpperCase()} (Demo Request)`)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition shadow-md cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span>Get Billing App Demo on WhatsApp</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* DIRECT CONSULTATION & SUPPORT BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">Need Custom B2B Assistance?</h4>
            <p className="text-xs text-slate-400">
              Speak directly with our Indian wholesale & tech consulting team.
            </p>
          </div>
        </div>

        <button
          id="btn-direct-consultation-whatsapp"
          onClick={() => handleOpenWhatsApp('Direct B2B Business Consultation', 'General Inquiry & Custom Solutions')}
          className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span>Chat with Admin</span>
        </button>
      </div>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Frequently Asked Questions
        </h4>

        <div className="divide-y divide-slate-100 space-y-1">
          {faqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div key={idx} className="pt-2">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="w-full flex items-center justify-between text-left py-2 text-xs font-bold text-slate-800 hover:text-[#0d47a1] transition cursor-pointer gap-2"
                >
                  <span>{faq.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <p className="text-xs text-slate-600 pb-2 leading-relaxed animate-in fade-in duration-150">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
