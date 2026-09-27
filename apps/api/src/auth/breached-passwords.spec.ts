import { createHash } from 'node:crypto';

import type { Env } from '../config/env';
import {
  BreachedPasswords,
  countFor,
  type FetchLike,
} from './breached-passwords';

const sha1 = (p: string) =>
  createHash('sha1').update(p).digest('hex').toUpperCase();

const reply = (ok: boolean, status: number, body: string) =>
  Promise.resolve({ ok, status, text: () => Promise.resolve(body) });

function make(on: boolean, fetchFn: FetchLike) {
  const b = new BreachedPasswords({ breachedPasswordCheck: on } as Env);
  b.fetchFn = fetchFn;
  return b;
}

describe('BreachedPasswords', () => {
  it('sends only the first 5 hex characters, asks for padding, finds the count', async () => {
    const h = sha1('password123');
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const b = make(true, (url, init) => {
      calls.push({ url, headers: init.headers });
      return reply(
        true,
        200,
        `0018A45C4D1DEF81644B54AB7F969B88D65:0\r\n${h.slice(5)}:251682\r\nFFFF0000000000000000000000000000000:3`,
      );
    });
    expect(await b.timesSeen('password123')).toBe(251682);
    expect(calls[0].url).toBe(
      `https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`,
    );
    expect(calls[0].url).not.toContain(h.slice(5));
    expect(calls[0].headers['add-padding']).toBe('true');
  });

  it('0 when not in the list or only a padding line', () => {
    expect(countFor('AAAA:5\nBBBB:0', 'CCCC')).toBe(0);
    expect(countFor('AAAA:5\nBBBB:0', 'BBBB')).toBe(0);
  });

  it('fails open: down, slow or switched off → null', async () => {
    expect(await make(true, () => reply(false, 503, '')).timesSeen('x')).toBe(
      null,
    );
    const broken = make(true, () =>
      Promise.reject(new DOMException('timed out', 'TimeoutError')),
    );
    expect(await broken.timesSeen('x')).toBeNull();
    let called = false;
    const off = make(false, () => {
      called = true;
      return reply(true, 200, '');
    });
    expect(await off.timesSeen('x')).toBeNull();
    expect(called).toBe(false);
  });
});
