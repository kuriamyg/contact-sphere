import { kenyanMobile } from './mobile';

describe('kenyanMobile', () => {
  it.each([
    ['0712 345 678', '+254712345678'],
    ['+254 712 345678', '+254712345678'],
    ['254712345678', '+254712345678'],
    ['0110 123 456', '+254110123456'],
    ['0733000000', '+254733000000'],
  ])('%s → %s', (input, e164) => {
    expect(kenyanMobile(input)).toBe(e164);
  });

  it.each([
    '',
    '12345',
    '020 222 2222',
    '+44 7700 900123',
    '0712',
    'x'.repeat(40),
  ])('refuses %s', (input) => {
    expect(kenyanMobile(input)).toBeNull();
  });
});
