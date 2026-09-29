import { afterEach, describe, expect, it } from 'vitest';

import {
  canReadPhoneContacts,
  PhoneContactsDenied,
  readPhoneContacts,
  toVcf,
} from '@/lib/phone-contacts';
import { countCards } from '@/lib/vcf-file';

const g = globalThis as { Capacitor?: unknown };
afterEach(() => delete g.Capacitor);

describe('import from this phone', () => {
  it('is offered only inside the app', () => {
    expect(canReadPhoneContacts()).toBe(false);
    g.Capacitor = {
      isNativePlatform: () => true,
      nativePromise: async () => ({}),
    };
    expect(canReadPhoneContacts()).toBe(true);
  });

  it('turns phone contacts into vCards the import already understands', () => {
    const vcf = toVcf([
      {
        displayName: 'Wanjiru Kamau',
        givenName: 'Wanjiru',
        familyName: 'Kamau',
        organization: 'Kamau; Sons, Ltd',
        phones: [{ number: '0712 345 678', label: 'mobile' }],
        emails: [{ address: 'w@example.com' }],
      },
      // A number with no name still counts; an empty entry does not.
      { displayName: '', phones: [{ number: '+254700000001' }], emails: [] },
      { displayName: '', phones: [], emails: [] },
    ]);
    expect(countCards(vcf)).toBe(2);
    expect(vcf).toContain('FN:Wanjiru Kamau');
    expect(vcf).toContain('N:Kamau;Wanjiru;;;');
    expect(vcf).toContain('ORG:Kamau\; Sons\\, Ltd');
    expect(vcf).toContain('TEL;TYPE=CELL:0712 345 678');
    expect(vcf).toContain('FN:+254700000001');
  });

  it('reports a refused permission clearly', async () => {
    g.Capacitor = {
      isNativePlatform: () => true,
      nativePromise: () => Promise.reject({ code: 'PERMISSION_DENIED' }),
    };
    await expect(readPhoneContacts()).rejects.toBeInstanceOf(
      PhoneContactsDenied,
    );
  });
});
