import { describe, expect, it } from 'vitest';

import { isKnownApiMessage, localizeApiMessage } from '@/i18n/api-messages';

describe('API messages shown to people', () => {
  it('knows our own messages, including from server errors (503)', () => {
    expect(
      isKnownApiMessage(
        'Could not send the code just now. Try again in a minute.',
      ),
    ).toBe(true);
    expect(isKnownApiMessage('A group can have up to 500 members.')).toBe(true);
  });

  it('never treats framework defaults or nothing as ours', () => {
    expect(isKnownApiMessage('Internal server error')).toBe(false);
    expect(isKnownApiMessage('Service Unavailable')).toBe(false);
    expect(isKnownApiMessage(undefined)).toBe(false);
  });

  it('explains Do Not Disturb in Kiswahili too', () => {
    const en =
      'Your line is blocking messages from companies (Do Not Disturb), so the code could not be delivered. Allow promotional messages on your line, or use another number.';
    expect(localizeApiMessage(en, 'sw')).toMatch(/Usinisumbue/);
  });
});
