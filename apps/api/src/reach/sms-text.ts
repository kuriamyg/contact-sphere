/**
 * How many SMS parts a message costs. Networks bill per part: 160 GSM-7
 * characters fit one SMS (153 per part once split); a single character
 * outside GSM-7 (most emoji, curly quotes) switches the whole message to
 * UCS-2: 70 per SMS, 67 per part.
 */
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
/** These cost two characters each (escape + char). */
const GSM_EXTENDED = '^{}\\[~]|€\f';

export const MAX_SMS_PARTS = 6;

export interface SmsSize {
  /** gsm = 160 per SMS; unicode = 70 per SMS. */
  encoding: 'gsm' | 'unicode';
  /** Billable characters (extended GSM characters count twice). */
  length: number;
  parts: number;
}

export function smsSize(text: string): SmsSize {
  let length = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) length += 1;
    else if (GSM_EXTENDED.includes(ch)) length += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (!gsm) {
    // UCS-2 counts UTF-16 code units: an emoji is two.
    length = text.length;
    return {
      encoding: 'unicode',
      length,
      parts: length <= 70 ? 1 : Math.ceil(length / 67),
    };
  }
  return {
    encoding: 'gsm',
    length,
    parts: length <= 160 ? 1 : Math.ceil(length / 153),
  };
}

/** Kenyan mobile numbers only: the aggregators bill and route these. */
export const isKenyanMobile = (e164: string | null | undefined) =>
  !!e164 && /^\+254[17]\d{8}$/.test(e164);
