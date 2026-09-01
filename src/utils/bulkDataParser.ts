import Papa from 'papaparse';

export interface ParsedWholesalerRow {
  phone: string;
  password?: string;
  companyName: string;
  fullName?: string;
  displayName?: string;
  location: string;
  storeAddress?: string;
  gstin?: string;
  iecCode?: string;
  bio?: string;
  description?: string;
  website?: string;
  instagram?: string;
  role: 'wholesaler';
  status?: string;
  [key: string]: any;
}

export interface ParseBulkResult {
  rows: ParsedWholesalerRow[];
  error?: string;
  formatDetected: string;
  detectedMappings?: Record<string, string>;
  totalFound: number;
}

/**
 * Generates a cryptographically strong, randomized alphanumeric password with 'Drop@' prefix.
 * Format: 'Drop@' + 6 random alphanumeric characters (total 11 chars).
 */
export function generateDropAtRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
  let password = 'Drop@';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Generates a cryptographically strong, randomized alphanumeric password.
 * Format: 10-12 characters with uppercase, lowercase, numbers, and allowed safe special symbols.
 */
export function generateSecureRandomPassword(length: number = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';

  // Ensure at least one of each class
  let pass = '';
  pass += upper.charAt(Math.floor(Math.random() * upper.length));
  pass += lower.charAt(Math.floor(Math.random() * lower.length));
  pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pass += symbols.charAt(Math.floor(Math.random() * symbols.length));

  const allChars = upper + lower + numbers + symbols;
  for (let i = pass.length; i < length; i++) {
    pass += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the password characters
  return pass
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Generates a standard readable pattern password based on phone number or prefix.
 */
export function generatePatternPassword(phone: string, prefix: string = 'Dropthan'): string {
  const cleanDigits = phone.replace(/\D/g, '');
  const last4 = cleanDigits.slice(-4) || '2026';
  return `${prefix}@${last4}`;
}

/**
 * Normalizes phone numbers for Indian & International formats.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  let hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return '';

  if (hasPlus) {
    return `+${digits}`;
  }

  // Standard 10 digit Indian mobile
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // 12 digit format starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return `+${digits}`;
}

/**
 * Cleans and formats Instagram handles (strips URLs, @ symbols, query parameters).
 */
export function cleanInstagramHandle(raw: string): string {
  if (!raw) return '';
  let clean = String(raw).trim();
  clean = clean.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  clean = clean.replace(/^@/, '');
  clean = clean.split(/[?#/]/)[0].trim();
  return clean;
}

/**
 * Cleans GSTIN (15 characters alphanumeric uppercase).
 */
export function cleanGstin(raw: string): string {
  if (!raw) return '';
  const clean = String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length >= 8 ? clean : '';
}

/**
 * Cleans Website URLs (prepends https:// if missing).
 */
export function cleanWebsiteUrl(raw: string): string {
  if (!raw) return '';
  let clean = String(raw).trim();
  if (clean && !/^https?:\/\//i.test(clean) && clean.includes('.')) {
    clean = `https://${clean}`;
  }
  return clean;
}

/**
 * Dynamic Column Alias Dictionary for automated CSV/TSV/JSON field mapping.
 */
const FIELD_ALIASES: Record<string, RegExp[]> = {
  phone: [
    /^(phone|phone_number|phonenumber|mobile|mobile_number|mobilenumber|contact|contact_number|contact_no|tel|telephone|whatsapp|whatsapp_number|cell)$/i,
    /phone/i,
    /mobile/i,
    /contact/i,
  ],
  password: [
    /^(password|pass|pwd|assigned_password|default_password|user_password)$/i,
    /password/i,
  ],
  companyName: [
    /^(company|company_name|companyname|business|business_name|businessname|wholesaler|wholesaler_name|wholesalername|supplier|supplier_name|suppliername|firm|firm_name|firmname|store_name|storename|shop_name|shopname|enterprise)$/i,
    /company/i,
    /business/i,
    /wholesaler/i,
    /supplier/i,
    /firm/i,
  ],
  fullName: [
    /^(name|full_name|fullname|contact_person|contactperson|owner|owner_name|proprietor|manager|representative)$/i,
    /full_?name/i,
    /contact_?person/i,
  ],
  location: [
    /^(location|city|state|hub|market|region|town|district|area)$/i,
    /city/i,
    /location/i,
    /state/i,
  ],
  storeAddress: [
    /^(store_address|storeaddress|address|shop_address|shopaddress|street|office_address|warehouse_address)$/i,
    /address/i,
  ],
  gstin: [
    /^(gstin|gst|gst_number|gst_no|gstno|tax_id|taxid|tin|iec|iec_code)$/i,
    /gst/i,
  ],
  description: [
    /^(description|desc|bio|about|about_us|aboutus|details|company_details|notes|summary|overview|products_description|catalog_details|category)$/i,
    /description/i,
    /desc/i,
    /bio/i,
    /about/i,
  ],
  website: [
    /^(website|website_url|websiteurl|web|url|link|site|domain|portal)$/i,
    /website/i,
    /web_?url/i,
  ],
  instagram: [
    /^(instagram|insta|instagram_id|instagramid|instagram_handle|instagramhandle|insta_id|instaid|ig|ig_handle|social|social_media)$/i,
    /instagram/i,
    /insta/i,
    /ig/i,
  ],
};

/**
 * Matches a header string against defined field aliases dynamically.
 */
function matchColumnHeader(header: string): string | null {
  const cleanHeader = header.trim().toLowerCase().replace(/[\s-_]+/g, '_');
  for (const [fieldKey, patterns] of Object.entries(FIELD_ALIASES)) {
    for (const pattern of patterns) {
      if (pattern.test(cleanHeader)) {
        return fieldKey;
      }
    }
  }
  return null;
}

/**
 * Robust Bulk Data Parser for .csv, .tsv, .txt, Excel exports, JSON arrays, and key-value blocks.
 */
export function parseBulkSupplierData(
  rawData: string,
  defaultPasswordGenerator?: (phone: string, index: number) => string
): ParseBulkResult {
  if (!rawData || !rawData.trim()) {
    return { rows: [], formatDetected: 'empty', totalFound: 0 };
  }

  const trimmed = rawData.trim();
  const pwdGen = defaultPasswordGenerator || ((phone, idx) => generateSecureRandomPassword(10));

  // 1. Check for JSON Array format
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        const rows: ParsedWholesalerRow[] = [];
        const detectedMappings: Record<string, string> = {};

        parsedJson.forEach((item: any, idx: number) => {
          if (typeof item !== 'object' || item === null) return;

          // Dynamically resolve properties from object keys
          const mappedItem: Record<string, string> = {};
          for (const [key, val] of Object.entries(item)) {
            const matchedField = matchColumnHeader(key);
            if (matchedField && val !== undefined && val !== null) {
              mappedItem[matchedField] = String(val).trim();
              detectedMappings[key] = matchedField;
            }
          }

          const rawPhone = mappedItem.phone || item.phone || item.mobile || item.contact || '';
          const phoneDigits = rawPhone.replace(/\D/g, '');
          if (!rawPhone || phoneDigits.length < 7) return;

          const companyName = mappedItem.companyName || item.companyName || item.company_name || item.name || `Wholesaler ${phoneDigits.slice(-4)}`;
          const fullName = mappedItem.fullName || item.fullName || item.full_name || companyName;
          const location = mappedItem.location || item.location || item.city || 'India';
          const storeAddress = mappedItem.storeAddress || item.storeAddress || item.store_address || location;
          const bio = mappedItem.description || item.bio || item.description || item.about || `Verified wholesale manufacturer of ${companyName}.`;
          const website = mappedItem.website || item.website || item.website_url || '';
          const instagram = mappedItem.instagram || item.instagram || item.instagram_handle || item.insta || '';
          const gstin = mappedItem.gstin || item.gstin || item.gst || '';
          const password = mappedItem.password || item.password || pwdGen(rawPhone, idx);

          rows.push({
            phone: normalizePhoneNumber(rawPhone),
            password,
            companyName,
            fullName,
            displayName: companyName,
            location,
            storeAddress,
            gstin: cleanGstin(gstin),
            bio,
            description: bio,
            website: cleanWebsiteUrl(website),
            instagram: cleanInstagramHandle(instagram),
            role: 'wholesaler',
            status: 'Active',
          });
        });

        if (rows.length > 0) {
          return {
            rows,
            formatDetected: 'JSON Array',
            detectedMappings,
            totalFound: rows.length,
          };
        }
      }
    } catch (e) {
      // Continue to next parsers if not valid JSON
    }
  }

  // 2. Try Key-Value Block Format (Plain text notes / records separated by dividers or blank lines)
  if (
    /^(company|wholesaler|supplier|phone|mobile|contact|name|business)\s*[:=]/im.test(trimmed) &&
    trimmed.includes('\n')
  ) {
    const blocks = trimmed.split(/\n\s*[-=_]{3,}\s*\n|\n\s*\n\s*\n/);
    if (blocks.length > 0) {
      const parsedBlockRows: ParsedWholesalerRow[] = [];
      const detectedMappings: Record<string, string> = {};

      blocks.forEach((block, idx) => {
        const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const record: Record<string, string> = {};

        lines.forEach((line) => {
          const colonIdx = line.indexOf(':') > -1 ? line.indexOf(':') : line.indexOf('=');
          if (colonIdx > 0) {
            const rawKey = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim();
            const matchedField = matchColumnHeader(rawKey) || rawKey.toLowerCase();
            record[matchedField] = val;
            detectedMappings[rawKey] = matchedField;
          }
        });

        const rawPhone = record['phone'] || '';
        const phoneDigits = rawPhone.replace(/\D/g, '');
        if (phoneDigits.length >= 7) {
          const compName = record['companyName'] || record['fullName'] || `Wholesaler ${phoneDigits.slice(-4)}`;
          const fullName = record['fullName'] || compName;
          const loc = record['location'] || 'India';
          const bio = record['description'] || `Direct wholesale supplier of ${compName}.`;
          const insta = cleanInstagramHandle(record['instagram'] || '');
          const web = cleanWebsiteUrl(record['website'] || '');
          const gstin = cleanGstin(record['gstin'] || '');
          const pass = record['password'] || pwdGen(rawPhone, idx);

          parsedBlockRows.push({
            phone: normalizePhoneNumber(rawPhone),
            password: pass,
            companyName: compName,
            fullName,
            displayName: compName,
            location: loc,
            storeAddress: record['storeAddress'] || loc,
            gstin,
            bio,
            description: bio,
            website: web,
            instagram: insta,
            role: 'wholesaler',
            status: 'Active',
          });
        }
      });

      if (parsedBlockRows.length > 0) {
        return {
          rows: parsedBlockRows,
          formatDetected: 'Plain Text Key-Value',
          detectedMappings,
          totalFound: parsedBlockRows.length,
        };
      }
    }
  }

  // 3. Delimited Table Parser (CSV, TSV, Semicolon, Pipe delimited)
  try {
    const parseResult = Papa.parse(trimmed, {
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      delimitersToGuess: [',', '\t', '|', ';'],
    });

    const data: string[][] = (parseResult.data as string[][]).filter((row) =>
      Array.isArray(row) && row.some((cell) => cell && String(cell).trim().length > 0)
    );

    if (data.length === 0) {
      return { rows: [], error: 'No data rows found in uploaded file.', formatDetected: 'none', totalFound: 0 };
    }

    // Inspect first row to see if it contains header names
    const firstRow = data[0].map((c) => String(c || '').trim());
    const headerColumnMap: Record<number, string> = {};
    const detectedMappings: Record<string, string> = {};

    firstRow.forEach((rawCol, colIdx) => {
      const matchedField = matchColumnHeader(rawCol);
      if (matchedField) {
        headerColumnMap[colIdx] = matchedField;
        detectedMappings[rawCol] = matchedField;
      }
    });

    const hasRecognizedHeader = Object.keys(headerColumnMap).length > 0;
    const dataRows = hasRecognizedHeader ? data.slice(1) : data;
    const finalRows: ParsedWholesalerRow[] = [];

    dataRows.forEach((cols, idx) => {
      const cleanCols = cols.map((c) => String(c ?? '').trim());
      if (cleanCols.length === 0 || !cleanCols.some((c) => c.length > 0)) return;

      const rowData: Record<string, string> = {};

      if (hasRecognizedHeader) {
        cleanCols.forEach((val, colIdx) => {
          const fieldKey = headerColumnMap[colIdx];
          if (fieldKey) {
            rowData[fieldKey] = val;
          }
        });
      } else {
        // Positional fallback: 0: phone, 1: pass/company, 2: company, 3: name, 4: city, 5: address, 6: gstin, 7: bio, 8: web, 9: insta
        rowData.phone = cleanCols[0] || '';

        const col1 = cleanCols[1] || '';
        let colOffset = 0;
        if (col1.includes('@') || (col1.length <= 15 && !col1.includes(' '))) {
          rowData.password = col1;
        } else {
          rowData.companyName = col1;
          colOffset = -1;
        }

        if (!rowData.companyName) {
          rowData.companyName = cleanCols[2 + colOffset] || cleanCols[1] || `Wholesaler ${idx + 1}`;
        }
        rowData.fullName = cleanCols[3 + colOffset] || rowData.companyName;
        rowData.location = cleanCols[4 + colOffset] || 'India';
        rowData.storeAddress = cleanCols[5 + colOffset] || rowData.location;
        rowData.gstin = cleanCols[6 + colOffset] || '';
        rowData.description = cleanCols[7 + colOffset] || '';
        rowData.website = cleanCols[8 + colOffset] || '';
        rowData.instagram = cleanCols[9 + colOffset] || '';
      }

      let rawPhone = rowData.phone || '';
      // If phone wasn't detected in phone column, check all cells for a phone pattern
      if (!rawPhone || rawPhone.replace(/\D/g, '').length < 7) {
        const foundPhone = cleanCols.find((c) => {
          const d = c.replace(/\D/g, '');
          return d.length >= 10 && d.length <= 15;
        });
        if (foundPhone) rawPhone = foundPhone;
      }

      const phoneDigits = rawPhone.replace(/\D/g, '');
      if (!rawPhone || phoneDigits.length < 7) {
        return; // Skip rows without a valid phone identifier
      }

      const companyName = rowData.companyName || rowData.fullName || `Wholesaler ${phoneDigits.slice(-4)}`;
      const fullName = rowData.fullName || companyName;
      const location = rowData.location || 'India';
      const storeAddress = rowData.storeAddress || location;
      const gstin = cleanGstin(rowData.gstin || '');
      const bio = rowData.description || `Verified wholesale manufacturer and bulk supplier of ${companyName}.`;
      const website = cleanWebsiteUrl(rowData.website || '');
      const instagram = cleanInstagramHandle(rowData.instagram || '');
      const password = rowData.password && rowData.password.length >= 4 ? rowData.password : pwdGen(rawPhone, idx);

      finalRows.push({
        phone: normalizePhoneNumber(rawPhone),
        password,
        companyName,
        fullName,
        displayName: companyName,
        location,
        storeAddress,
        gstin,
        bio,
        description: bio,
        website,
        instagram,
        role: 'wholesaler',
        status: 'Active',
      });
    });

    const delim = parseResult.meta?.delimiter;
    const formatName = delim === '\t' ? 'TSV (Tab-Delimited)' : delim === ';' ? 'Semicolon-Delimited' : delim === '|' ? 'Pipe-Delimited' : 'CSV (Comma-Separated)';

    return {
      rows: finalRows,
      formatDetected: formatName,
      detectedMappings,
      totalFound: finalRows.length,
    };
  } catch (err: any) {
    console.error('PapaParse parsing error:', err);
    return {
      rows: [],
      error: `Failed to parse file: ${err?.message || 'Invalid format'}`,
      formatDetected: 'Error',
      totalFound: 0,
    };
  }
}
