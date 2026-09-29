/**
 * Encrypted backup files (ADR 0009). Runs in the browser only — the server
 * never sees the passphrase or the file — and uses nothing but WebCrypto:
 *
 * - key: PBKDF2-SHA-256, 600,000 iterations (OWASP's current figure), a
 *   fresh 16-byte salt per file;
 * - cipher: AES-256-GCM with a fresh 12-byte IV. GCM also checks integrity:
 *   a wrong passphrase, a changed byte or an edited header fails to open
 *   instead of restoring rubbish (the header is authenticated data).
 *
 * The file is JSON: a readable header, then the ciphertext in base64. The
 * version lets later formats (for example Argon2id) open old files.
 */
export const BACKUP_FORMAT = 'contact-sphere-backup';
export const BACKUP_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 10;

export interface BackupHeader {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
}

export type BackupProblem = 'not-backup' | 'newer' | 'wrong-passphrase';

export class BackupFileError extends Error {
  constructor(readonly problem: BackupProblem) {
    super(problem);
  }
}

const enc = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** The header in one fixed key order: the bytes GCM authenticates. */
function headerBytes(h: BackupHeader): Uint8Array<ArrayBuffer> {
  return enc.encode(
    JSON.stringify({
      format: h.format,
      version: h.version,
      createdAt: h.createdAt,
      kdf: {
        name: h.kdf.name,
        hash: h.kdf.hash,
        iterations: h.kdf.iterations,
        salt: h.kdf.salt,
      },
      cipher: { name: h.cipher.name, iv: h.cipher.iv },
    }),
  );
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypts the archive JSON; returns the file's text. */
export async function encryptBackup(
  plain: string,
  passphrase: string,
  now: Date = new Date(),
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const header: BackupHeader = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toB64(salt) },
    cipher: { name: 'AES-GCM', iv: toB64(iv) },
  };
  const key = await deriveKey(passphrase, salt, iterations);
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: headerBytes(header) },
      key,
      enc.encode(plain),
    ),
  );
  return JSON.stringify({ ...header, data: toB64(data) });
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads a backup file's header, or says why it cannot be one. */
export function readHeader(fileText: string): BackupHeader & { data: string } {
  let v: unknown;
  try {
    v = JSON.parse(fileText);
  } catch {
    throw new BackupFileError('not-backup');
  }
  if (!isObj(v) || v.format !== BACKUP_FORMAT) {
    throw new BackupFileError('not-backup');
  }
  if (v.version !== BACKUP_VERSION) throw new BackupFileError('newer');
  const kdf = v.kdf;
  const cipher = v.cipher;
  if (
    !isObj(kdf) ||
    kdf.name !== 'PBKDF2' ||
    kdf.hash !== 'SHA-256' ||
    typeof kdf.iterations !== 'number' ||
    // Refuse absurd work factors a doctored file could ask for.
    kdf.iterations < 100_000 ||
    kdf.iterations > 10_000_000 ||
    typeof kdf.salt !== 'string' ||
    !isObj(cipher) ||
    cipher.name !== 'AES-GCM' ||
    typeof cipher.iv !== 'string' ||
    typeof v.createdAt !== 'string' ||
    typeof v.data !== 'string'
  ) {
    throw new BackupFileError('not-backup');
  }
  return v as unknown as BackupHeader & { data: string };
}

/** Opens a backup file; returns the archive JSON. */
export async function decryptBackup(
  fileText: string,
  passphrase: string,
): Promise<{ plain: string; createdAt: string }> {
  const file = readHeader(fileText);
  let salt: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  let data: Uint8Array<ArrayBuffer>;
  try {
    salt = fromB64(file.kdf.salt);
    iv = fromB64(file.cipher.iv);
    data = fromB64(file.data);
  } catch {
    throw new BackupFileError('not-backup');
  }
  const key = await deriveKey(passphrase, salt, file.kdf.iterations);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: headerBytes(file) },
      key,
      data,
    );
    return {
      plain: new TextDecoder().decode(plain),
      createdAt: file.createdAt,
    };
  } catch {
    // GCM cannot tell a wrong passphrase from a changed file.
    throw new BackupFileError('wrong-passphrase');
  }
}

/** "contact-sphere-backup-2026-09-29.json" */
export function backupFileName(now: Date = new Date()): string {
  const day = new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
  return `contact-sphere-backup-${day}.json`;
}
