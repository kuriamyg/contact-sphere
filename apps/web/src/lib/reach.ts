import 'server-only';

import QRCode from 'qrcode';

import { api } from './api';
import { type CardInput, cardVcf } from './vcard-card';

/** Shapes returned by the API's /reach routes (apps/api reach). */
export interface ReachStatus {
  push: { enabled: boolean; publicKey: string | null; devices: number };
  sms: {
    enabled: boolean;
    monthlyLimit: number;
    usedThisMonth: number;
    priceCents: number;
  };
  /** Absent only while an older API is still deploying. */
  email?: { enabled: boolean; on: boolean };
}

export interface CardView extends CardInput {
  contactId: string;
}

export interface SmsQuote {
  recipients: number;
  skipped: number;
  encoding: 'gsm' | 'unicode';
  length: number;
  parts: number;
  totalParts: number;
  costCents: number;
  remaining: number;
}

/** Best effort: null if the API is unavailable, so pages still show. */
export async function getReachStatus(): Promise<ReachStatus | null> {
  const res = await api<ReachStatus>('/reach/status');
  return res.status === 200 && res.data ? res.data : null;
}

export async function getCard(): Promise<CardView | null> {
  const res = await api<CardView | Record<string, never>>('/reach/card');
  return res.status === 200 && res.data && 'contactId' in res.data
    ? (res.data as CardView)
    : null;
}

/**
 * A QR code of a contact card, drawn on this server, as an image URL (the
 * page's CSP allows data: images, not inline SVG markup).
 */
export async function cardQr(card: CardInput): Promise<string> {
  const svg = await QRCode.toString(cardVcf(card), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export const kes = (cents: number) =>
  `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
