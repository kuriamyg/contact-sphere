import {
  type CountryCode,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

/**
 * Numbers written without a country code are read as Kenyan, so
 * "0712 345 678" becomes +254712345678 (ADR 0010).
 */
export const DEFAULT_REGION: CountryCode = 'KE';

export interface NormalisedPhone {
  /** Exactly what was entered, trimmed. Never rewritten. */
  raw: string;
  /** E.164, or null when the text is not a valid number. */
  e164: string | null;
  /** The digits of `raw`, for partial search. */
  digits: string;
}

/**
 * Parses a phone number without ever rejecting it: text that is not a valid
 * number is kept as entered, with `e164: null` (ADR 0010).
 */
export function normalisePhone(
  input: string,
  region: CountryCode = DEFAULT_REGION,
): NormalisedPhone {
  const raw = input.trim();
  const parsed = parsePhoneNumberFromString(raw, region);
  return {
    raw,
    e164: parsed?.isValid() ? parsed.number : null,
    digits: raw.replace(/\D/g, ''),
  };
}

/**
 * The digit strings a search should look for in stored numbers, or [] when
 * the query does not look like part of a phone number.
 *
 * "0712", "712" and "+254712" must all find +254712345678, whether it was
 * saved as "0712 345 678" or "+254 712 345 678": national-format queries
 * (leading 0) are also tried with the default region's country code.
 */
export function phoneSearchDigits(
  query: string,
  region: CountryCode = DEFAULT_REGION,
): string[] {
  if (!/^[\d\s+().-]+$/.test(query)) return [];
  const digits = query.replace(/\D/g, '');
  if (digits.length < 3) return [];
  const variants = new Set([digits]);
  if (digits.startsWith('0') && digits.length > 1) {
    variants.add(getCountryCallingCode(region) + digits.slice(1));
  }
  return [...variants];
}
