import React from 'react';
import { ShieldCheck, Award, Users, Globe, MessageSquare, Sparkles, X, ExternalLink, CheckCircle } from 'lucide-react';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-blue-100 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-blue-900 via-[#0d47a1] to-indigo-900 text-white p-4 sm:p-5 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md flex items-center justify-center shrink-0 select-none">
              <img
                src="/dropthan-logo.png"
                alt="dptn B2B BUSINESS"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">About Dropthan</h2>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Official Entity
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium">
                Dropshippers, Wholesalers &amp; Exporters Ecosystem
              </p>
            </div>
          </div>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-700 text-xs sm:text-sm">
          {/* PLATFORM MISSION & VISION CARD */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center space-x-2 text-[#0d47a1] font-black text-xs uppercase tracking-wider">
              <Award className="w-4 h-4 text-[#0d47a1]" />
              <span>Platform Mission &amp; Governance</span>
            </div>

            <p className="text-[12px] text-slate-700 leading-relaxed font-normal">
              Dropthan is India&apos;s premier dedicated B2B ecosystem designed to eliminate middlemen and enable direct, transparent business connectivity between verified manufacturers, bulk wholesalers, exporters, and dropshippers globally.
            </p>
          </div>

          {/* ECOSYSTEM PILLARS */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0d47a1]" />
              <span>Core Ecosystem Pillars</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Pillar 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="flex items-center space-x-1.5 text-[#0d47a1] font-bold text-xs">
                  <span>📦</span>
                  <span>Dropshippers</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Zero inventory risk, direct factory catalogs, and automated supplier connections.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="flex items-center space-x-1.5 text-blue-800 font-bold text-xs">
                  <span>🛡️</span>
                  <span>Wholesalers</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  GST-verified manufacturers and bulk distributors offering genuine tier pricing.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="flex items-center space-x-1.5 text-indigo-800 font-bold text-xs">
                  <span>🌍</span>
                  <span>Exporters</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  IEC-verified global traders, container sourcing, and cross-border trade logistics.
                </p>
              </div>
            </div>
          </div>

          {/* KEY COMMITMENTS */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 space-y-2">
            <h4 className="text-xs font-black uppercase text-[#0d47a1] tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0d47a1]" />
              <span>Zero Middleman Guarantee</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Direct Supplier Contact:</strong> Buyers chat directly on WhatsApp or call verified phone numbers without commission cuts.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Government Verified Credentials:</strong> Real-time GSTIN and IEC validation protects trade integrity.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Dropthan Digital Services:</strong> Access high-ROI Meta Ads, Website/App Creation, Leads Generation, Video Production, and GST Cloud Billing software natively.</span>
              </li>
            </ul>
          </div>

          {/* OFFICIAL CONTACT & DOMAIN DETAILS */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Official Portal:</span>
              <a
                href="https://dropthan.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0d47a1] font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>https://dropthan.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">WhatsApp Support:</span>
              <a
                href="https://wa.me/918838533014"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline"
              >
                +91 8838533014
              </a>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTION */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
