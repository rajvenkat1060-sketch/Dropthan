import React, { useState, useEffect, useMemo } from 'react';

export interface CountryItem {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  samplePlaceholder?: string;
}

export const COUNTRIES: CountryItem[] = [
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', samplePlaceholder: '98765 43210' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', samplePlaceholder: '(555) 123-4567' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', samplePlaceholder: '7911 123456' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', samplePlaceholder: '50 123 4567' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', samplePlaceholder: '8123 4567' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾', samplePlaceholder: '12-345 6789' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳', samplePlaceholder: '138 0013 8000' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', samplePlaceholder: '90 1234 5678' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', samplePlaceholder: '151 23456789' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', samplePlaceholder: '6 12 34 56 78' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', samplePlaceholder: '(416) 555-0199' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', samplePlaceholder: '412 345 678' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', samplePlaceholder: '50 123 4567' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷', samplePlaceholder: '10-1234-5678' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦', samplePlaceholder: '3312 3456' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲', samplePlaceholder: '9123 4567' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼', samplePlaceholder: '9123 4567' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭', samplePlaceholder: '3912 3456' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩', samplePlaceholder: '1712-345678' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰', samplePlaceholder: '71 234 5678' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵', samplePlaceholder: '984-1234567' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰', samplePlaceholder: '300 1234567' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩', samplePlaceholder: '812-3456-7890' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭', samplePlaceholder: '81 234 5678' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳', samplePlaceholder: '91 234 5678' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', samplePlaceholder: '917 123 4567' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', samplePlaceholder: '21 123 4567' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', samplePlaceholder: '82 123 4567' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', samplePlaceholder: '802 123 4567' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪', samplePlaceholder: '712 345678' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬', samplePlaceholder: '100 123 4567' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷', samplePlaceholder: '532 123 45 67' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', samplePlaceholder: '320 123 4567' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', samplePlaceholder: '612 34 56 78' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', samplePlaceholder: '6 12345678' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭', samplePlaceholder: '78 123 45 67' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪', samplePlaceholder: '70 123 45 67' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪', samplePlaceholder: '470 12 34 56' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹', samplePlaceholder: '664 1234567' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱', samplePlaceholder: '512 345 678' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪', samplePlaceholder: '85 123 4567' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', samplePlaceholder: '11 91234-5678' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', samplePlaceholder: '55 1234 5678' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷', samplePlaceholder: '9 11 1234-5678' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱', samplePlaceholder: '9 1234 5678' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴', samplePlaceholder: '300 1234567' },
  { name: 'Russia', code: 'RU', dialCode: '+7', flag: '🇷🇺', samplePlaceholder: '912 345-67-89' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰', samplePlaceholder: '9123 4567' },
  { name: 'Taiwan', code: 'TW', dialCode: '+886', flag: '🇹🇼', samplePlaceholder: '912 345 678' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱', samplePlaceholder: '50-123-4567' },
  { name: 'Mauritius', code: 'MU', dialCode: '+230', flag: '🇲🇺', samplePlaceholder: '5123 4567' },
  { name: 'Maldives', code: 'MV', dialCode: '+960', flag: '🇲🇻', samplePlaceholder: '712 3456' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴', samplePlaceholder: '412 34 567' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰', samplePlaceholder: '20 12 34 56' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮', samplePlaceholder: '41 2345678' },
];

export function isPhoneValid(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 8 && digits.length <= 16;
}

interface InternationalPhoneInputProps {
  value: string;
  onChange: (phone: string, isValid: boolean) => void;
  defaultCountry?: string; // e.g. 'IN', '+91', or 'India'
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  defaultCountry = 'IN',
  placeholder,
  className = '',
  disabled = false,
}) => {
  // Find initial country (default to India +91)
  const defaultSelectedCountry = useMemo(() => {
    return (
      COUNTRIES.find(
        (c) =>
          c.code.toUpperCase() === defaultCountry.toUpperCase() ||
          c.dialCode === defaultCountry ||
          c.name.toLowerCase() === defaultCountry.toLowerCase()
      ) || COUNTRIES[0]
    );
  }, [defaultCountry]);

  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(defaultSelectedCountry);
  const [localNumber, setLocalNumber] = useState<string>('');

  // Synchronize incoming 'value' prop
  useEffect(() => {
    if (!value) {
      setLocalNumber('');
      return;
    }

    const trimmed = value.trim();

    // Check if the value starts with any known country dial code
    const matchingCountry = COUNTRIES.find((c) => trimmed.startsWith(c.dialCode));
    if (matchingCountry) {
      setSelectedCountry(matchingCountry);
      const remainder = trimmed.slice(matchingCountry.dialCode.length).trim();
      setLocalNumber(remainder);
    } else if (trimmed.startsWith('+')) {
      // Unknown dial code or raw plus format
      setLocalNumber(trimmed);
    } else {
      // Just local digits
      setLocalNumber(trimmed);
    }
  }, [value]);

  // Handle country dropdown selection change
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    const found = COUNTRIES.find((c) => c.code === newCode);
    if (found) {
      setSelectedCountry(found);
      const cleanLocal = localNumber.trim();
      const fullPhone = cleanLocal ? `${found.dialCode}${cleanLocal.replace(/^0+/, '')}` : found.dialCode;
      onChange(fullPhone, isPhoneValid(fullPhone));
    }
  };

  // Handle typing inside local number input
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // If user pastes full international number starting with '+'
    if (rawVal.startsWith('+')) {
      const match = COUNTRIES.find((c) => rawVal.startsWith(c.dialCode));
      if (match) {
        setSelectedCountry(match);
        const rem = rawVal.slice(match.dialCode.length).trim();
        setLocalNumber(rem);
        const fullPhone = `${match.dialCode}${rem.replace(/\s+/g, '')}`;
        onChange(fullPhone, isPhoneValid(fullPhone));
        return;
      }
    }

    // Filter to allow numbers, spaces, hyphens
    const sanitized = rawVal.replace(/[^0-9\s\-()]/g, '');
    setLocalNumber(sanitized);

    const cleanDigits = sanitized.replace(/\D/g, '');
    const fullPhone = cleanDigits ? `${selectedCountry.dialCode}${cleanDigits}` : '';
    onChange(fullPhone, isPhoneValid(fullPhone));
  };

  const currentFullValue = localNumber.trim()
    ? `${selectedCountry.dialCode} ${localNumber.trim()}`
    : selectedCountry.dialCode;

  const valid = isPhoneValid(value || currentFullValue);
  const displayPlaceholder = placeholder || selectedCountry.samplePlaceholder || 'Enter mobile number';

  return (
    <div className={`w-full ${className}`}>
      {/* INPUT CONTAINER */}
      <div className="relative flex items-center rounded-2xl border border-blue-200 bg-white hover:border-[#0d47a1] focus-within:border-[#0d47a1] focus-within:ring-2 focus-within:ring-blue-100 transition shadow-2xs overflow-hidden">
        {/* COUNTRY SELECT DROPDOWN WRAPPER */}
        <div className="relative flex items-center bg-blue-50/70 border-r border-blue-200/80 shrink-0 px-2.5 py-2 hover:bg-blue-100/60 transition group">
          {/* Visual Display for Flag & Dial Code */}
          <div className="flex items-center space-x-1.5 pointer-events-none pr-3">
            <span className="text-base select-none leading-none">{selectedCountry.flag}</span>
            <span className="text-xs font-black text-[#0d47a1] font-mono tracking-tight">
              {selectedCountry.dialCode}
            </span>
            <span className="text-[9px] text-slate-400 group-hover:text-slate-600 transition">▼</span>
          </div>

          {/* Transparent Native Select overlay for full accessible interaction */}
          <select
            id="select-country-code"
            value={selectedCountry.code}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Select Country and Dial Code"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs disabled:cursor-not-allowed"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="text-slate-900 bg-white py-1">
                {c.flag} {c.name} ({c.dialCode})
              </option>
            ))}
          </select>
        </div>

        {/* LOCAL PHONE NUMBER INPUT */}
        <div className="relative flex-1 flex items-center">
          <input
            id="input-mobile-phone-number"
            type="tel"
            name="mobilePhone"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={disabled}
            value={localNumber}
            onChange={handleNumberChange}
            placeholder={displayPlaceholder}
            className="w-full bg-transparent px-3 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50"
          />

          {localNumber.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                setLocalNumber('');
                onChange('', false);
              }}
              className="mr-2 text-slate-400 hover:text-slate-600 p-1 text-[11px] rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Clear number"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* HELPER & VALIDATION STATUS HINT */}
      <div className="mt-1 px-1 flex items-center justify-between text-[11px] min-h-[16px]">
        {value && value.length > 5 ? (
          <span
            className={`flex items-center gap-1 font-semibold ${
              valid ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {valid ? (
              <>
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Valid {selectedCountry.name} Number</span>
              </>
            ) : (
              <>
                <span className="text-amber-600 font-bold">⚠️</span>
                <span>Enter complete {selectedCountry.name} phone number</span>
              </>
            )}
          </span>
        ) : (
          <span className="text-slate-400 font-medium text-[10px]">
            Default: {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
          </span>
        )}

        {value && value.length > 5 && (
          <span className="text-slate-400 font-mono text-[10px] hidden sm:inline">
            {value}
          </span>
        )}
      </div>
    </div>
  );
};
