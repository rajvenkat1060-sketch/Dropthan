import React from 'react';

export function isPhoneValid(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

interface InternationalPhoneInputProps {
  value: string;
  onChange: (phone: string, isValid: boolean) => void;
  defaultCountry?: string;
  placeholder?: string;
  className?: string;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  placeholder = '+91 9876543210',
  className = '',
}) => {
  const isValid = isPhoneValid(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;
    if (inputVal && !inputVal.startsWith('+') && /^\d/.test(inputVal)) {
      inputVal = `+${inputVal}`;
    }
    const valid = isPhoneValid(inputVal);
    onChange(inputVal, valid);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-slate-400 text-xs font-mono">📱</span>
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full bg-white border border-blue-200 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
        />
      </div>
      {value && value.length > 4 && (
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className={isValid ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'text-amber-600 font-medium flex items-center gap-1'}>
            {isValid ? '✓ Valid phone number' : '⚠️ Please enter a complete phone number with country code'}
          </span>
          <span className="text-slate-400 font-mono text-[10px]">{value}</span>
        </div>
      )}
    </div>
  );
};
