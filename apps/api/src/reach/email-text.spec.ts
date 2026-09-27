import { digestEmail, testEmail } from './email-text';

const ORIGIN = 'https://app.example.com';

describe('digestEmail', () => {
  it('uses the counts line as subject and body, with links back', () => {
    const m = digestEmail(
      'owner@example.com',
      'Today: 2 follow-ups and 1 birthday.',
      'en',
      ORIGIN,
    );
    expect(m.to).toBe('owner@example.com');
    expect(m.subject).toBe('Today: 2 follow-ups and 1 birthday.');
    expect(m.text).toContain('Open Today: https://app.example.com/today');
    expect(m.text).toContain('https://app.example.com/account');
    expect(m.html).toContain('href="https://app.example.com/today"');
    expect(m.html).toContain('<html lang="en">');
    expect(m.html).not.toMatch(/<img|<script/i);
  });

  it('speaks Kiswahili', () => {
    const m = digestEmail('o@example.com', 'Leo: ufuatiliaji 1.', 'sw', ORIGIN);
    expect(m.html).toContain('Fungua Leo');
    expect(m.text).toContain('Zima kwenye Wasifu');
    expect(m.html).toContain('<html lang="sw">');
  });

  it('escapes everything placed in the HTML', () => {
    const m = digestEmail('o@example.com', '<b>&"x"</b>', 'en', ORIGIN);
    expect(m.html).toContain('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
    expect(m.html).not.toContain('<b>&');
  });
});

describe('testEmail', () => {
  it('says reminders are on, in the owner’s language', () => {
    expect(testEmail('o@example.com', 'en', ORIGIN).subject).toMatch(
      /email reminders are on/,
    );
    expect(testEmail('o@example.com', 'sw', ORIGIN).subject).toMatch(
      /vimewashwa/,
    );
  });
});
