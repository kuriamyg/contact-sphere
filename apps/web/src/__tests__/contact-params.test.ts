import { describe, expect, it } from 'vitest';

import {
  detailHref,
  listHref,
  parseListParams,
  toApiQuery,
} from '@/lib/contact-params';

describe('parseListParams', () => {
  it('defaults everything', () => {
    expect(parseListParams({})).toEqual({
      q: '',
      tag: '',
      sort: 'name-asc',
      view: 'active',
      page: 1,
    });
  });

  it('refuses unknown values instead of passing them on', () => {
    expect(
      parseListParams({
        sort: 'password',
        view: 'admin',
        page: '-3',
        q: ['a', 'b'],
      }),
    ).toEqual({ q: 'a', tag: '', sort: 'name-asc', view: 'active', page: 1 });
    expect(parseListParams({ page: '99999999' }).page).toBe(1);
  });

  it('tidies the tag filter and keeps it in links and the API query', () => {
    const p = parseListParams({ tag: '  Boda  Boda ' });
    expect(p.tag).toBe('boda boda');
    expect(listHref(p)).toBe('/contacts?tag=boda+boda');
    expect(toApiQuery(p)).toContain('tag=boda+boda');
    expect(listHref(p, { tag: '' })).toBe('/contacts');
  });

  it('trims and caps the search text', () => {
    expect(parseListParams({ q: `  ${'x'.repeat(300)} ` }).q).toHaveLength(100);
  });
});

describe('toApiQuery', () => {
  it('splits the sort into field and direction', () => {
    const qs = new URLSearchParams(
      toApiQuery({
        q: '0712',
        tag: '',
        sort: 'lastUsed-desc',
        view: 'trash',
        page: 2,
      }),
    );
    expect(Object.fromEntries(qs)).toEqual({
      q: '0712',
      sort: 'lastUsed',
      order: 'desc',
      view: 'trash',
      page: '2',
      pageSize: '50',
    });
  });
});

describe('listHref', () => {
  const p = parseListParams({});
  it('omits defaults for clean URLs', () => {
    expect(listHref(p)).toBe('/contacts');
    expect(listHref(p, { view: 'trash' })).toBe('/contacts?view=trash');
    expect(listHref({ ...p, q: 'ann' }, { page: 2 })).toBe(
      '/contacts?q=ann&page=2',
    );
  });
});

describe('detailHref', () => {
  const id = '01a0e38f-768a-728e-a7e7-4c063149fc39';
  it('carries the list the contact was opened from', () => {
    expect(detailHref(parseListParams({}), id)).toBe(`/contacts/${id}`);
    expect(
      detailHref(parseListParams({ q: 'ot', tag: 'Fundi', page: '2' }), id),
    ).toBe(`/contacts/${id}?q=ot&tag=fundi&page=2`);
  });
});
