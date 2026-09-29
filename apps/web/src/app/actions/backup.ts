'use server';

import { revalidatePath } from 'next/cache';

import { apiError } from '@/i18n/server';
import { api } from '@/lib/api';

/** What a restore will do, or did (counts only). */
export interface RestorePlan {
  contacts: {
    inBackup: number;
    toAdd: number;
    alreadySaved: number;
    repeated: number;
  };
  groups: {
    inBackup: number;
    toAdd: number;
    toUpdate: number;
    overLimit: number;
  };
  memberships: number;
  followUps: number;
  /** Absent from an API older than P6. */
  relationships?: number;
  unreadable: number;
}

type Result<T> = { data: T; error?: never } | { data?: never; error: string };

/**
 * The owner's data as JSON, for the browser to encrypt (ADR 0009). It goes
 * only to the owner's own signed-in page, like every other page of theirs.
 */
export async function fetchBackupArchive(): Promise<Result<string>> {
  const res = await api<unknown>('/backup');
  if (res.status !== 200 || !res.data) {
    return { error: await apiError(res.status, res.message) };
  }
  revalidatePath('/account');
  return { data: JSON.stringify(res.data) };
}

async function send(
  path: '/backup/restore/preview' | '/backup/restore',
  archiveJson: string,
): Promise<Result<RestorePlan>> {
  let archive: unknown;
  try {
    archive = JSON.parse(archiveJson);
  } catch {
    return {
      error: await apiError(400, 'This is not a Contact Sphere backup.'),
    };
  }
  const res = await api<RestorePlan>(path, {
    method: 'POST',
    body: { archive },
  });
  if (res.status !== 200 || !res.data) {
    return { error: await apiError(res.status, res.message) };
  }
  return { data: res.data };
}

/** What restoring this (decrypted) backup would add. Writes nothing. */
export async function previewRestore(
  archiveJson: string,
): Promise<Result<RestorePlan>> {
  return send('/backup/restore/preview', archiveJson);
}

/** Adds what is missing from the backup; never changes or deletes. */
export async function runRestore(
  archiveJson: string,
): Promise<Result<RestorePlan>> {
  const r = await send('/backup/restore', archiveJson);
  if (r.data) revalidatePath('/', 'layout');
  return r;
}
