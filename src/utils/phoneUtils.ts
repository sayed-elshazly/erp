/**
 * NZM JKR ERP - Phone Number Normalization & E.164 Standard Engine
 * -------------------------------------------------------------
 * Unifies all phone number formats into standardized E.164 format.
 * Primarily handles Egyptian mobile networks (Vodafone 010, Orange 012, Etisalat 011, WE 015)
 * as well as international phone numbers.
 *
 * Examples of identical inputs for Egyptian phone 01101006376:
 * - "01101006376"
 * - "+20 11 01006376"
 * - "+201101006376"
 * - "00201101006376"
 * - "201101006376"
 * - "011-0100-6376"
 * - "(011) 01006376"
 * - "٠١١٠١٠٠٦٣٧٦" (Eastern Arabic / Hindi numerals)
 *
 * All normalize strictly and reliably to: "+201101006376"
 */

/**
 * Cleans phone input text by removing WhatsApp and OS invisible directional characters,
 * non-breaking spaces, and converting Arabic numerals.
 */
export function cleanPhoneInput(val?: string | null): string {
  if (!val) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(val)
    .replace(/[٠-٩]/g, d => arabicDigits.indexOf(d).toString())
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/[\u00A0\u202F\u2000-\u200A]/g, ' ');
}

/**
 * Normalizes any phone number into standardized E.164 format (+[countryCode][number]).
 */
export function normalizePhoneNumber(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';

  // 1. Convert Eastern Arabic numerals (٠-٩) to standard Latin digits (0-9)
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let str = String(rawPhone).replace(/[٠-٩]/g, d => arabicDigits.indexOf(d).toString());

  // 2. Remove all invisible formatting, Unicode directional marks (LRM \u200E, RLM \u200F, isolates, overrides),
  // non-breaking spaces (\u00A0), zero-width spaces, BOM, tabs, and standard punctuation/separators.
  // This completely fixes numbers copied from WhatsApp (e.g. '\u200E+20\u00A011\u00A001006376')
  str = str.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00A0\u2000-\u200A\s\-\(\)\.\/\\]+/g, '');

  // 3. International prefix 00 to +
  if (str.startsWith('00')) {
    str = '+' + str.slice(2);
  }

  // 4. Strip any leading non-digits/non-plus, and keep only valid characters
  let cleaned = str.replace(/^[^\d+]+/, '');
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/\D/g, '');
  } else {
    cleaned = cleaned.replace(/\D/g, '');
  }

  if (!cleaned) return '';

  // 5. Case: Starts with '+20'
  if (cleaned.startsWith('+20')) {
    const afterCode = cleaned.slice(3);
    // User might have entered +20 011... remove redundant 0 after country code
    if (afterCode.startsWith('0') && afterCode.length === 11) {
      return '+20' + afterCode.slice(1);
    }
    return cleaned;
  }

  // 5. Case: Starts with '+2' (without '0') followed by Egyptian mobile 1[0125]... or 01[0125]...
  // Many users type '+2' then their 10 or 11 digit mobile number
  if (/^\+21[0125]\d{8}$/.test(cleaned)) {
    return '+20' + cleaned.slice(2);
  }
  if (/^\+20[2-9]\d{7,8}$/.test(cleaned)) {
    return cleaned;
  }

  // 6. Case: Starts with '20' without '+'
  if (cleaned.startsWith('20')) {
    const afterCode = cleaned.slice(2);
    if (afterCode.startsWith('0') && afterCode.length === 11) {
      return '+20' + afterCode.slice(1);
    }
    if (/^1[0125]\d{8}$/.test(afterCode)) {
      return '+20' + afterCode;
    }
    if (afterCode.length >= 8 && afterCode.length <= 11) {
      return '+20' + afterCode;
    }
  }

  // 7. Case: Standard Egyptian mobile (010, 011, 012, 015) or any 11 digits starting with 01
  if (/^01\d{9}$/.test(cleaned)) {
    return '+20' + cleaned.slice(1);
  }

  // 8. Case: Egyptian mobile without leading zero (10 digits starting with 1[0125])
  if (/^1[0125]\d{8}$/.test(cleaned)) {
    return '+20' + cleaned;
  }

  // 9. Case: Egyptian Landline (02, 03, etc.)
  if (/^0[2-9]\d{7,8}$/.test(cleaned)) {
    return '+20' + cleaned.slice(1);
  }

  // 10. Case: Already has international '+'
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // 11. Case: Known Arab / Middle East country codes without '+'
  // e.g. Saudi 966, UAE 971, Kuwait 965, Iraq 964, Oman 968, Bahrain 973, Jordan 962, Libya 218, Sudan 249, etc.
  if (/^(966|971|965|964|968|973|962|961|218|216|212|249|967|974|970)\d{7,12}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  // 12. Case: Any 11-digit number
  // If user entered 11 digits, save it; if starting with 0, treat as local Egyptian (+20)
  if (/^\d{11}$/.test(cleaned)) {
    if (cleaned.startsWith('0')) {
      return '+20' + cleaned.slice(1);
    }
    return '+' + cleaned;
  }

  // 13. Case: Standard 7 to 15 digits fallback
  if (/^\d{7,15}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  return cleaned;
}

/**
 * Checks if two phone number strings correspond to the exact same physical phone number.
 */
export function isSamePhoneNumber(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;
  const n1 = normalizePhoneNumber(phone1);
  const n2 = normalizePhoneNumber(phone2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}

/**
 * Validates whether a phone number is structurally valid.
 * Supports Egyptian mobile/landline numbers, international numbers (+xxx), and local/foreign numbers.
 */
export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false;
  const norm = normalizePhoneNumber(phone);
  if (!norm) return false;

  // 1. Egyptian mobile format check (+20 followed by 10 digits)
  if (/^\+201\d{9}$/.test(norm)) {
    return true;
  }

  // 2. Egyptian landline (+20 followed by 8-9 digits)
  if (/^\+20[2-9]\d{7,8}$/.test(norm)) {
    return true;
  }

  // 3. International E.164: + followed by 7 to 15 digits
  if (/^\+\d{7,15}$/.test(norm)) {
    return true;
  }

  // 4. Any clean digits between 7 and 15
  return /^\d{7,15}$/.test(norm.replace(/^\+/, ''));
}

/**
 * Formats a normalized phone for friendly, human-readable display.
 * Example: "+201101006376" -> "+20 11 0100 6376"
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '-';
  const norm = normalizePhoneNumber(phone);
  if (!norm) return phone;

  // Format Egyptian mobile
  if (norm.startsWith('+20') && norm.length === 13) {
    const country = norm.slice(0, 3); // +20
    const prefix = norm.slice(3, 5);  // 10, 11, 12, 15
    const part1 = norm.slice(5, 9);   // 0100
    const part2 = norm.slice(9);      // 6376
    return `${country} ${prefix} ${part1} ${part2}`;
  }

  return norm;
}

/**
 * Detects the Egyptian telecom carrier for a phone number.
 */
export function getEgyptianCarrier(phone?: string | null): 'vodafone' | 'orange' | 'etisalat' | 'we' | 'unknown' {
  const norm = normalizePhoneNumber(phone);
  if (!norm.startsWith('+20') || norm.length !== 13) return 'unknown';

  const prefix = norm.slice(3, 5); // after +20
  switch (prefix) {
    case '10':
      return 'vodafone';
    case '11':
      return 'etisalat';
    case '12':
      return 'orange';
    case '15':
      return 'we';
    default:
      return 'unknown';
  }
}
