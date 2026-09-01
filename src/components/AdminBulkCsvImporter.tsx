import React, { useState, useRef } from 'react';
import { generate50WholesalersCsvText } from '../data/wholesalers50Data';
import {
  parseBulkSupplierData,
  ParsedWholesalerRow,
  generateDropAtRandomPassword,
  generateSecureRandomPassword,
  generatePatternPassword,
} from '../utils/bulkDataParser';
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
  Eye,
  EyeOff,
  FileType,
  Database,
  Layers,
} from 'lucide-react';

interface AdminBulkCsvImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const AdminBulkCsvImporter: React.FC<AdminBulkCsvImporterProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [csvText, setCsvText] = useState<string>('');
  const [passwordStrategy, setPasswordStrategy] = useState<'drop_random' | 'random' | 'pattern' | 'custom_prefix'>('drop_random');
  const [customPrefix, setCustomPrefix] = useState<string>('Dropthan');
  const [parsedRows, setParsedRows] = useState<ParsedWholesalerRow[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string>('');
  const [detectedMappings, setDetectedMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [importedCredentials, setImportedCredentials] = useState<{ phone: string; password: string; companyName: string }[] | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [showPasswords, setShowPasswords] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Generate Auto-Password based on strategy
  const generatePassword = (phone: string, index: number): string => {
    if (passwordStrategy === 'drop_random') {
      return generateDropAtRandomPassword();
    } else if (passwordStrategy === 'random') {
      return generateSecureRandomPassword(10);
    } else if (passwordStrategy === 'custom_prefix') {
      const pfx = customPrefix.trim() || 'Dropthan';
      return generatePatternPassword(phone, pfx);
    } else {
      return generatePatternPassword(phone, 'Dropthan');
    }
  };

  // Robust parsing using PapaParse + fallback multi-format engine
  const handleParseContent = (rawContent: string, fileName?: string) => {
    setError('');
    setSuccessMessage('');
    if (fileName) setUploadedFileName(fileName);

    if (!rawContent.trim()) {
      setParsedRows([]);
      setDetectedFormat('');
      setDetectedMappings({});
      return;
    }

    try {
      const result = parseBulkSupplierData(rawContent, (phone, idx) => generatePassword(phone, idx));

      if (result.error) {
        setError(result.error);
        setParsedRows([]);
        setDetectedMappings({});
        return;
      }

      setParsedRows(result.rows);
      setDetectedFormat(result.formatDetected);
      setDetectedMappings(result.detectedMappings || {});

      if (result.rows.length === 0) {
        setError('No valid supplier rows with phone numbers could be extracted from the file.');
      }
    } catch (e: any) {
      console.error('Data parse error:', e);
      setError(`Failed to parse file: ${e?.message || 'Invalid format'}`);
    }
  };

  // Read file from input or drag-drop
  const handleReadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setCsvText(content);
        handleParseContent(content, file.name);
      }
    };
    reader.onerror = () => {
      setError(`Failed to read file "${file.name}". Please ensure it is a valid text, CSV, or TSV document.`);
    };
    reader.readAsText(file);
  };

  // Load the 50 Indian Wholesalers Dataset
  const handleLoad50Wholesalers = () => {
    const formattedCsv = generate50WholesalersCsvText(`${customPrefix.trim() || 'Dropthan'}@2026`);
    setCsvText(formattedCsv);
    setUploadedFileName('50_Indian_Wholesalers_Dataset.csv');
    handleParseContent(formattedCsv, '50_Indian_Wholesalers_Dataset.csv');
    setSuccessMessage(`✓ Loaded 50 verified wholesaler profiles across Indian manufacturing hubs!`);
  };

  // Run Bulk Import to Supabase
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      setError('Please provide or load data before importing.');
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log(`🚀 [Admin Bulk Import] Submitting ${parsedRows.length} pre-registered wholesaler records...`);

      const payload = {
        profiles: parsedRows.map((r, i) => ({
          phone: r.phone,
          password: r.password || generatePassword(r.phone, i),
          companyName: r.companyName,
          company_name: r.companyName,
          fullName: r.fullName,
          full_name: r.fullName,
          displayName: r.displayName || r.companyName,
          display_name: r.displayName || r.companyName,
          location: r.location,
          storeAddress: r.storeAddress,
          store_address: r.storeAddress,
          gstin: r.gstin,
          bio: r.bio || r.description,
          description: r.description || r.bio,
          website: r.website,
          websiteUrl: r.website,
          website_url: r.website,
          instagram: r.instagram,
          instagramHandle: r.instagram,
          instagram_handle: r.instagram,
          role: 'wholesaler',
          status: 'Active',
          is_gst_approved: true,
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
      const savedCount = json.registeredCount || json.importedCount || parsedRows.length;
      setSuccessMessage(`🎉 Successfully imported and pre-registered ${savedCount} wholesaler accounts in Supabase database! (Zero schema alterations executed)`);

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
    link.setAttribute('download', `dropthan_wholesalers_credentials_${Date.now()}.csv`);
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
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-[#0d47a1] flex items-center justify-center text-2xl font-black shadow-2xs">
              📁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Bulk CSV / TSV / TXT Importer & Auto-Password Pipeline
                </h3>
                <span className="bg-blue-50 text-[#0d47a1] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                  Zero Schema Alteration
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Automated data-mapping for company names, Instagram handles, and descriptions with cryptographic default password generation.
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

        {/* AUTO-PASSWORD GENERATOR SETTINGS & FILE ACTION BAR */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0d47a1]" />
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                Auto-Password Strategy:
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setPasswordStrategy('drop_random');
                  if (csvText) handleParseContent(csvText);
                }}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  passwordStrategy === 'drop_random'
                    ? 'bg-[#0d47a1] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>⚡ Drop@ (Drop@XXXXXX)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordStrategy('random');
                  if (csvText) handleParseContent(csvText);
                }}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  passwordStrategy === 'random'
                    ? 'bg-[#0d47a1] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>Alphanumeric 10-char</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordStrategy('pattern');
                  if (csvText) handleParseContent(csvText);
                }}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer ${
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
                  setPasswordStrategy('custom_prefix');
                  if (csvText) handleParseContent(csvText);
                }}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer ${
                  passwordStrategy === 'custom_prefix'
                    ? 'bg-[#0d47a1] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Custom Prefix
              </button>
            </div>
          </div>

          {passwordStrategy === 'custom_prefix' && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-medium text-slate-600">Prefix:</span>
              <input
                type="text"
                value={customPrefix}
                onChange={(e) => {
                  setCustomPrefix(e.target.value);
                  if (csvText) handleParseContent(csvText);
                }}
                placeholder="Dropthan"
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 w-32 focus:outline-none focus:border-[#0d47a1]"
              />
              <span className="text-xs text-slate-400 font-mono">Example: {customPrefix || 'Dropthan'}@9825</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 flex-wrap">
            <button
              type="button"
              onClick={handleLoad50Wholesalers}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 50 Pre-Configured Wholesalers Dataset</span>
            </button>

            <div className="text-slate-400 text-xs">or upload file:</div>

            {/* RELAXED MULTI-FORMAT FILE INPUT */}
            <label className="bg-white hover:bg-blue-50 text-[#0d47a1] border border-blue-200 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
              <Upload className="w-3.5 h-3.5" />
              <span>Choose File (.csv, .txt, .tsv, .json)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, text/csv, application/vnd.ms-excel, text/plain, .tsv, application/json, .json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleReadFile(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* DRAG & DROP ZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                handleReadFile(file);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-3 text-center transition ${
              isDragging
                ? 'border-[#0d47a1] bg-blue-50'
                : 'border-slate-300 bg-white/60 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
              <FileType className="w-4 h-4 text-[#0d47a1]" />
              <span>
                Drag and drop <strong>.CSV, .TSV, .TXT, or Excel Export</strong> here, or paste raw text below.
              </span>
              {uploadedFileName && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0d47a1]">
                  📄 {uploadedFileName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* DYNAMIC FIELD MAPPING STATUS */}
        {Object.keys(detectedMappings).length > 0 && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-2.5 sm:p-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#0d47a1] mb-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Dynamic Field Mapping Applied ({Object.keys(detectedMappings).length} fields mapped to Supabase):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(detectedMappings).map(([orig, target]) => (
                <span
                  key={orig}
                  className="bg-white border border-blue-200 text-slate-700 font-mono text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1"
                >
                  <span className="text-slate-500 font-semibold">{orig}</span>
                  <span className="text-blue-500">→</span>
                  <span className="text-blue-900 font-bold">{target}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* DATA INPUT & FORMAT NOTICE */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Raw File / Pasted Content:</span>
            <div className="flex items-center gap-2">
              {detectedFormat && (
                <span className="text-slate-500 font-mono text-[11px]">
                  Format: <span className="text-[#0d47a1] font-semibold">{detectedFormat}</span>
                </span>
              )}
              {parsedRows.length > 0 && (
                <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {parsedRows.length} supplier accounts parsed
                </span>
              )}
            </div>
          </div>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              handleParseContent(e.target.value);
            }}
            placeholder={`Phone, CompanyName, ContactPerson, City, StoreAddress, GSTIN, Description, Website, Instagram\n+91 9825101001, Surat Silk Hub, Sanjay Patel, Surat, Ring Road Market, 24AAACS1234A1Z5, Pure silk sarees manufacturer, https://suratsilkhub.com, suratsilkhub_official`}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0d47a1] custom-scrollbar"
          />
        </div>

        {/* LIVE PREVIEW TABLE */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#0d47a1]" />
                <span>Parsed Profiles Preview ({parsedRows.length} Accounts Ready for Safe Batch Insert):</span>
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

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[28vh] overflow-y-auto custom-scrollbar">
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
                    <th className="p-2.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {parsedRows.map((r, i) => (
                    <tr key={`bulk-row-${i}`} className="hover:bg-blue-50/40">
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
                      <td className="p-2.5 text-[11px] text-slate-500 max-w-[180px] truncate">
                        {r.description || r.bio || '—'}
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
                <span>Batch Inserting into Supabase...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>🚀 Execute Safe Batch Insert ({parsedRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
