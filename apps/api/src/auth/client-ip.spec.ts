import type { Request } from 'express';

import { clientIp } from './client-ip';

const req = (headers: Record<string, string>, ip = '10.0.0.1') =>
  ({ headers, ip }) as unknown as Request;

describe('clientIp', () => {
  it('uses the address forwarded by the web server', () => {
    expect(clientIp(req({ 'x-client-ip': '203.0.113.7' }))).toBe('203.0.113.7');
    expect(clientIp(req({ 'x-client-ip': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it('ignores a malformed value and falls back to the socket address', () => {
    expect(clientIp(req({ 'x-client-ip': '1.2.3.4, 5.6.7.8' }))).toBe(
      '10.0.0.1',
    );
    expect(clientIp(req({ 'x-client-ip': '<script>' }))).toBe('10.0.0.1');
    expect(clientIp(req({}))).toBe('10.0.0.1');
  });
});
