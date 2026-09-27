'use server';

import { apiText, getMessages } from '@/i18n/server';
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

async function failure(
  status: number,
  message?: string,
): Promise<{ error: string }> {
  const t = (await getMessages()).errors;
  if (status === 0 || status >= 500) return { error: t.unavailable };
  if (status === 401) return { error: t.sessionEnded };
  if (status === 429) return { error: t.tooManyImports };
  return { error: (await apiText(message)) ?? t.fileUnreadable };
}

async function send(
  path: string,
  vcf: string,
  ok: number,
): Promise<ImportResult> {
  if (typeof vcf !== 'string' || vcf.length === 0) {
    return { error: (await getMessages()).errors.chooseFile };
  }
  if (vcf.length > MAX_VCF_CHARS) {
    return { error: (await getMessages()).client.importWizard.tooLarge };
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
