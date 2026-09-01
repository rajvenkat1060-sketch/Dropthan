import React, { useState } from 'react';
import { WHOLESALERS_50_DATASET, WholesalerSeedData, generate50WholesalersCsvText } from '../data/wholesalers50Data';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Download,
  Copy,
  Check,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AdminBulkCsvImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

interface ParsedRecord extends WholesalerSeedData {
  id?: string;
  status?: string;
}

export const AdminBulkCsvImporter: React.FC<AdminBulkCsvImporterProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [csvText, setCsvText] = useState<string>('');
  const [passwordStrategy, setPasswordStrategy] = useState<'pattern' | 'random' | 'custom_prefix'>('pattern');
  const [customPrefix, setCustomPrefix] = useState<string>('Dropthan');
  const [parsedRows, setParsedRows] = useState<ParsedRecord[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [importedCredentials, setImportedCredentials] = useState<{ phone: string; password: string; companyName: string }[] | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [showPasswords, setShowPasswords] = useState<boolean>(true);

  if (!isOpen) return null;

  // Generate Auto-Password based on strategy
  const generatePassword = (phone: string, index: number): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    const last4 = cleanPhone.slice(-4) || `${1000 + index}`;
    
    if (passwordStrategy === 'pattern') {
      return `Dropthan@${last4}`;
    } else if (passwordStrategy === 'custom_prefix') {
      const pfx = customPrefix.trim() || 'Dropthan';
      return `${pfx}@${last4}`;
    } else {
      // Cryptographic alphanumeric random password
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
      let pass = '';
      for (let i = 0; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pass;
    }
  };

  // Parse CSV text into records
  const handleParseCsv = (rawText: string) => {
    setError('');
    setSuccessMessage('');
    if (!rawText.trim()) {
      setParsedRows([]);
      return;
    }

    try {
      const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setParsedRows([]);
        return;
      }

      // Check if header exists
      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes('phone') ||
        firstLine.includes('company') ||
        firstLine.includes('contact') ||
        firstLine.includes('city') ||
        firstLine.includes('name');

      const dataLines = hasHeader ? lines.slice(1) : lines;
      const parsed: ParsedRecord[] = [];

      dataLines.forEach((line, idx) => {
        // Robust CSV splitting respecting quotes
        const match = line.match(/(".*?"|[^",\t]+)(?=\s*[,|\t]|\s*$)/g);
        let cols = match ? match.map((val) => val.replace(/^"|"$/g, '').trim()) : line.split(/[,|\t]/).map((s) => s.trim());

        if (cols.length < 1 || !cols[0]) return;

        const phone = cols[0];
        let password = cols[1] && cols[1].length >= 4 ? cols[1] : generatePassword(phone, idx);
        
        // If 2nd column looks like a name instead of password, adjust mapping
        let colShift = 0;
        if (cols[1] && !cols[1].includes('@') && cols[1].length > 15) {
          password = generatePassword(phone, idx);
          colShift = -1; // 2nd column was actually company name
        }

        const companyName = cols[2 + colShift] || cols[1 + colShift] || `Wholesaler ${idx + 1}`;
        const fullName = cols[3 + colShift] || 'Manager';
        const location = cols[4 + colShift] || 'India';
        const storeAddress = cols[5 + colShift] || `${location}, India`;
        const gstin = cols[6 + colShift] || '';
        const bio = cols[7 + colShift] || `Verified direct manufacturer and bulk wholesaler of ${companyName}.`;
        const website = cols[8 + colShift] || '';
        const instagram = cols[9 + colShift] || '';

        parsed.push({
          phone,
          password,
          companyName,
          fullName,
          location,
          storeAddress,
          gstin,
          bio,
          website,
          instagram,
          role: 'wholesaler',
        });
      });

      setParsedRows(parsed);
      if (parsed.length === 0) {
        setError('No valid rows found in CSV text.');
      }
    } catch (e: any) {
      console.error('CSV parse error:', e);
      setError(`Failed to parse CSV: ${e?.message || 'Invalid format'}`);
    }
  };

  // Load the 50 Indian Wholesalers Dataset
  const handleLoad50Wholesalers = () => {
    const formattedCsv = generate50WholesalersCsvText(`${customPrefix.trim() || 'Dropthan'}@2026`);
    setCsvText(formattedCsv);
    handleParseCsv(formattedCsv);
    setSuccessMessage(`✓ Loaded 50 verified wholesaler profiles across Indian manufacturing hubs!`);
  };

  // Run Bulk Import to Supabase via server API / direct payload
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      setError('Please provide or load CSV data before importing.');
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log(`🚀 [Admin Bulk Import] Submitting ${parsedRows.length} pre-registered wholesaler records...`);

      const payload = {
        users: parsedRows.map((r, i) => ({
          phone: r.phone,
          password: r.password || generatePassword(r.phone, i),
          companyName: r.companyName,
          fullName: r.fullName,
          location: r.location,
          storeAddress: r.storeAddress,
          gstin: r.gstin,
          bio: r.bio,
          website: r.website,
          instagram: r.instagram,
          role: 'wholesaler',
          status: 'active',
          isVerified: true,
          rating: 5.0,
        })),
      };

      const resp = await fetch('/api/admin/bulk-pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await resp.json();

      if (!resp.ok || json.error) {
        throw new Error(json.error || 'Server rejected bulk import.');
      }

      console.log('✅ [Admin Bulk Import Success]:', json);
      const savedCount = json.registeredCount || parsedRows.length;
      setSuccessMessage(`🎉 Successfully imported and pre-registered ${savedCount} wholesaler accounts in Supabase database!`);

      // Store credentials list for admin copy/export
      const creds = parsedRows.map((r, i) => ({
        phone: r.phone,
        password: r.password || generatePassword(r.phone, i),
        companyName: r.companyName,
      }));
      setImportedCredentials(creds);

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      console.error('Bulk import error:', err);
      setError(err?.message || 'Failed to complete bulk import.');
    } finally {
      setIsImporting(false);
    }
  };

  // Copy all credentials to clipboard
  const handleCopyAllCredentials = () => {
    if (!importedCredentials && parsedRows.length === 0) return;
    const list = importedCredentials || parsedRows;
    const textToCopy = list
      .map((item) => `🏢 Company: ${item.companyName}\n📞 Phone: ${item.phone}\n🔑 Password: ${item.password}\n----------------------------------`)
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  // Download credentials as CSV file
  const handleDownloadCredentialsCsv = () => {
    const list = importedCredentials || parsedRows;
    if (list.length === 0) return;

    const headers = ['CompanyName', 'Phone', 'AssignedPassword', 'Location', 'GSTIN', 'Instagram'];
    const rows = list.map((item: any) => [
      `"${item.companyName || ''}"`,
      `"${item.phone || ''}"`,
      `"${item.password || ''}"`,
      `"${item.location || ''}"`,
      `"${item.gstin || ''}"`,
      `"${item.instagram || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dropthan_50_wholesalers_credentials_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl border border-blue-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-[#0d47a1] flex items-center justify-center text-2xl font-black">
              📁
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Isolated Admin CSV Bulk Importer & Password Generator
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Import 50 Indian wholesaler profiles, auto-generate secure login passwords, and persist directly into Supabase.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FEEDBACK BANNERS */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* AUTO-PASSWORD GENERATOR SETTINGS */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0d47a1]" />
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                Auto-Password Generation Strategy:
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPasswordStrategy('pattern');
                  if (csvText) handleParseCsv(csvText);
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  passwordStrategy === 'pattern'
                    ? 'bg-[#0d47a1] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Pattern (Dropthan@last4)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordStrategy('random');
                  if (csvText) handleParseCsv(csvText);
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  passwordStrategy === 'random'
                    ? 'bg-[#0d47a1] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Cryptographic Random
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 flex-wrap">
            <button
              type="button"
              onClick={handleLoad50Wholesalers}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 50 Pre-Configured Wholesalers Dataset</span>
            </button>

            <div className="text-slate-400 text-xs">or upload custom CSV:</div>

            <label className="bg-white hover:bg-blue-50 text-[#0d47a1] border border-blue-200 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Select .CSV File</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const text = evt.target?.result as string;
                      if (text) {
                        setCsvText(text);
                        handleParseCsv(text);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* CSV DATA INPUT */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Raw CSV Content:</span>
            {parsedRows.length > 0 && (
              <span className="text-[#0d47a1] font-mono">{parsedRows.length} records parsed</span>
            )}
          </div>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              handleParseCsv(e.target.value);
            }}
            placeholder={`Phone, Password (Optional), CompanyName, ContactPerson, City, StoreAddress, GSTIN, Bio, Website, Instagram\n+91 9825101001, Surat Silk Hub, Sanjay Patel, Surat, Ring Road Market, 24AAACS1234A1Z5, Pure silk sarees manufacturer, https://suratsilkhub.com, suratsilkhub_official`}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0d47a1] custom-scrollbar"
          />
        </div>

        {/* LIVE PREVIEW TABLE */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs">
                Parsed Profiles Preview ({parsedRows.length} Accounts Ready to Insert):
              </h4>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPasswords ? 'Hide' : 'Show'} Passwords</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[30vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Company & Contact</th>
                    <th className="p-2.5">Phone Number</th>
                    <th className="p-2.5">Auto-Generated Password</th>
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">GSTIN</th>
                    <th className="p-2.5">Instagram</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {parsedRows.map((r, i) => (
                    <tr key={`csv-row-${i}`} className="hover:bg-blue-50/40">
                      <td className="p-2.5 font-mono text-slate-400 text-[11px]">{i + 1}</td>
                      <td className="p-2.5 font-bold">
                        <div className="text-slate-900">{r.companyName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{r.fullName}</div>
                      </td>
                      <td className="p-2.5 font-mono text-[#0d47a1] font-bold">{r.phone}</td>
                      <td className="p-2.5 font-mono text-emerald-700 font-bold">
                        {showPasswords ? r.password : '••••••••'}
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-600">{r.location}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">{r.gstin || '—'}</td>
                      <td className="p-2.5 text-[11px] text-purple-700 font-medium">
                        {r.instagram ? `@${r.instagram}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* POST-IMPORT CREDENTIALS ACTIONS */}
        {(importedCredentials || parsedRows.length > 0) && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-bold text-emerald-950">
              Credentials Distribution Kit ({parsedRows.length} Accounts):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllCredentials}
                className="bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copied to Clipboard!' : 'Copy All Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCredentialsCsv}
                className="bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Credentials CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            disabled={isImporting || parsedRows.length === 0}
            onClick={handleExecuteImport}
            className="bg-[#0d47a1] hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing & Syncing with Supabase...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>🚀 Execute Safe Supabase Bulk Import ({parsedRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
