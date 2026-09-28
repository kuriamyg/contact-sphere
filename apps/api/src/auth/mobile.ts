import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Kenyan mobile numbers (Safaricom, Airtel, Telkom): +2547… and +2541…. */
const KENYAN_MOBILE = /^\+254[17]\d{8}$/;

/**
 * "0712 345 678", "+254 712 345678", "254712345678" → "+254712345678";
 * anything that is not a Kenyan mobile number → null. Sign-up codes go only
 * to Kenyan mobiles (B6): cost and abuse stay bounded.
 */
export function kenyanMobile(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length > 32) return null;
  const withPlus = /^254\d{9}$/.test(trimmed.replace(/\s/g, ''))
    ? `+${trimmed.replace(/\s/g, '')}`
    : trimmed;
  const parsed = parsePhoneNumberFromString(withPlus, 'KE');
  if (!parsed?.isValid()) return null;
  return KENYAN_MOBILE.test(parsed.number) ? parsed.number : null;
}
