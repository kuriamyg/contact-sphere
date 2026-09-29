import { describe, expect, it } from 'vitest';

import {
  BackupFileError,
  backupFileName,
  decryptBackup,
  encryptBackup,
  readHeader,
} from '@/lib/backup-crypto';

// Fewer rounds keep the test fast; the format records the number used.
const FAST = 100_000;
const PLAIN = JSON.stringify({ contacts: [{ displayName: 'Wanjiru Kamau' }] });
const PASS = 'orange piano window cloud';

const problem = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'opened';
  } catch (e) {
    return e instanceof BackupFileError ? e.problem : String(e);
  }
};

describe('encrypted backup files (ADR 0009)', () => {
  it('round-trips with the right passphrase, and hides the contents', async () => {
    const file = await encryptBackup(PLAIN, PASS, new Date(), FAST);
    expect(file).not.toContain('Wanjiru');
    const h = readHeader(file);
    expect(h).toMatchObject({
      format: 'contact-sphere-backup',
      version: 1,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: FAST },
      cipher: { name: 'AES-GCM' },
    });
    expect((await decryptBackup(file, PASS)).plain).toBe(PLAIN);
  });

  it('uses a fresh salt and IV every time', async () => {
    const a = readHeader(await encryptBackup(PLAIN, PASS, new Date(), FAST));
    const b = readHeader(await encryptBackup(PLAIN, PASS, new Date(), FAST));
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.iv).not.toBe(b.cipher.iv);
    expect(a.data).not.toBe(b.data);
  });

  it('refuses a wrong passphrase, a changed byte, or an edited header', async () => {
    const file = await encryptBackup(PLAIN, PASS, new Date(), FAST);
    expect(await problem(decryptBackup(file, 'wrong passphrase!!'))).toBe(
      'wrong-passphrase',
    );
    const f = JSON.parse(file) as Record<string, unknown>;
    const data = f.data as string;
    const flipped = {
      ...f,
      data: (data[5] === 'A' ? 'B' : 'A') + data.slice(1),
    };
    expect(await problem(decryptBackup(JSON.stringify(flipped), PASS))).toBe(
      'wrong-passphrase',
    );
    const edited = { ...f, createdAt: '2000-01-01T00:00:00.000Z' };
    expect(await problem(decryptBackup(JSON.stringify(edited), PASS))).toBe(
      'wrong-passphrase',
    );
  });

  it('knows a file that is not a backup, or a newer one', async () => {
    expect(await problem(decryptBackup('BEGIN:VCARD', PASS))).toBe(
      'not-backup',
    );
    expect(
      await problem(
        decryptBackup(
          JSON.stringify({ format: 'contact-sphere-backup', version: 9 }),
          PASS,
        ),
      ),
    ).toBe('newer');
    const file = JSON.parse(
      await encryptBackup(PLAIN, PASS, new Date(), FAST),
    ) as { kdf: Record<string, unknown> };
    file.kdf.iterations = 1;
    expect(await problem(decryptBackup(JSON.stringify(file), PASS))).toBe(
      'not-backup',
    );
  });

  it('names the file by the Nairobi day', () => {
    expect(backupFileName(new Date('2026-09-29T22:30:00Z'))).toBe(
      'contact-sphere-backup-2026-09-30.json',
    );
  });
});
