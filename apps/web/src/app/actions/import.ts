'use server';

import { api } from '@/lib/api';
import { MAX_VCF_CHARS } from '@/lib/vcf-file';

/** What the API reports for a .vcf file (apps/api contacts-import.service). */
export interface ImportPlan {
  cards: number;
  toImport: number;
  alreadySaved: number;
  repeatedInFile: number;
  empty: number;
  warnings: {
    invalidEmails: number;
    tooManyValues: number;
    truncatedFields: number;
    unusableBirthdays: number;
  };
  preview: { displayName: string; phone: string | null }[];
}

export type ImportResult = { plan: ImportPlan } | { error: string };

function failure(status: number, message?: string): { error: string } {
  if (status === 0 || status >= 500) {
    return { error: 'The service is unavailable. Try again shortly.' };
  }
  if (status === 401)
    return { error: 'Your session has ended. Sign in again.' };
  if (status === 429) {
    return { error: 'Too many imports in a row. Wait a minute and try again.' };
  }
  return { error: message ?? 'That file could not be read.' };
}

async function send(
  path: string,
  vcf: string,
  ok: number,
): Promise<ImportResult> {
  if (typeof vcf !== 'string' || vcf.length === 0) {
    return { error: 'Choose a .vcf file first.' };
  }
  if (vcf.length > MAX_VCF_CHARS) {
    return {
      error:
        'That file is too large to import at once (over 4 MB without photos).',
    };
  }
  const res = await api<ImportPlan>(path, { method: 'POST', body: { vcf } });
  if (res.status !== ok || !res.data) return failure(res.status, res.message);
  return { plan: res.data };
}

/** What importing would do. Saves nothing. */
export async function previewImport(vcf: string): Promise<ImportResult> {
  return send('/contacts/import/preview', vcf, 200);
}

/** Adds the new contacts. Exact repeats are skipped by the API. */
export async function runImport(vcf: string): Promise<ImportResult> {
  return send('/contacts/import', vcf, 201);
}
