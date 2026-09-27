import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiStatusBadge } from '@/components/api-status-badge';
import { SortSelect } from '@/components/contacts/sort-select';
import { localizeApiMessage } from '@/i18n/api-messages';
import { I18nProvider } from '@/i18n/client';
import { en } from '@/i18n/en';
import { fmt, plural } from '@/i18n/format';
import { fromAcceptLanguage, parseLocale } from '@/i18n/locales';
import { sw } from '@/i18n/sw';

/** Every leaf string in a dictionary, keyed by its path. */
function leaves(o: unknown, path = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof o === 'string') out.set(path, o);
  else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      for (const [p, s] of leaves(v, path ? `${path}.${k}` : k)) out.set(p, s);
    }
  }
  return out;
}
const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  const E = leaves(en);
  const S = leaves(sw);

  it('Kiswahili has exactly the English keys', () => {
    expect([...S.keys()].sort()).toEqual([...E.keys()].sort());
  });

  it('no string is empty', () => {
    for (const [k, v] of [...E, ...S]) expect(v.trim(), k).not.toBe('');
  });

  it('each translation keeps the same {placeholders}', () => {
    for (const [k, v] of E)
      expect(placeholders(S.get(k)!), k).toEqual(placeholders(v));
  });

  it('is really translated (most strings differ from English)', () => {
    const same = [...E].filter(([k, v]) => S.get(k) === v).length;
    expect(same / E.size).toBeLessThan(0.15);
  });
});

describe('fmt and plural', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(fmt('Call {name}', { name: 'Achieng' })).toBe('Call Achieng');
    expect(fmt('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('picks one or other by n', () => {
    expect(plural(1, en.common.members)).toBe('1 member');
    expect(plural(3, en.common.members)).toBe('3 members');
    expect(plural(1, sw.common.members)).toBe('mwanachama 1');
    expect(plural(0, sw.common.members)).toBe('wanachama 0');
  });

  it('lets extra values override n (formatted numbers)', () => {
    expect(plural(1200, en.common.people, { n: '1,200' })).toBe('1,200 people');
  });
});

describe('choosing the language', () => {
  it.each([
    ['sw-KE,sw;q=0.9,en;q=0.8', 'sw'],
    ['en-GB,en;q=0.9', 'en'],
    ['fr-FR,sw;q=0.5', 'sw'],
    ['de', 'en'],
    ['', 'en'],
  ] as const)('Accept-Language %j → %s', (header, want) => {
    expect(fromAcceptLanguage(header)).toBe(want);
  });

  it('only trusts known cookie values', () => {
    expect(parseLocale('sw')).toBe('sw');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('fr')).toBeNull();
    expect(parseLocale('sw; drop table')).toBeNull();
    expect(parseLocale(undefined)).toBeNull();
  });
});

describe('API messages', () => {
  it('leaves English alone', () => {
    expect(localizeApiMessage('Contact not found.', 'en')).toBe(
      'Contact not found.',
    );
  });

  it('translates known messages and ones with numbers', () => {
    expect(localizeApiMessage('Contact not found.', 'sw')).toBe(
      'Anwani haikupatikana.',
    );
    expect(
      localizeApiMessage('This needs 240 SMS; 100 left this month.', 'sw'),
    ).toBe('Hii inahitaji SMS 240; zimebaki 100 mwezi huu.');
  });

  it('shows an unknown message as sent, never nothing', () => {
    expect(localizeApiMessage('Brand new error.', 'sw')).toBe(
      'Brand new error.',
    );
    expect(localizeApiMessage(undefined, 'sw')).toBeUndefined();
  });
});

describe('components in Kiswahili', () => {
  it('a server-rendered badge takes its words from the dictionary', () => {
    render(<ApiStatusBadge status="offline" t={sw.home} />);
    expect(screen.getByText(/Haifikiki/)).toBeInTheDocument();
  });

  it('client components read the provider', () => {
    render(
      <I18nProvider locale="sw" messages={sw.client}>
        <SortSelect value="name-asc" />
      </I18nProvider>,
    );
    expect(screen.getByLabelText(sw.client.sort.label)).toBeInTheDocument();
  });
});
