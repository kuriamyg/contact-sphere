import { normalisePhone, phoneSearchDigits } from './phone';

describe('normalisePhone', () => {
  it('reads national Kenyan numbers as +254', () => {
    expect(normalisePhone(' 0712 345 678 ')).toEqual({
      raw: '0712 345 678',
      e164: '+254712345678',
      digits: '0712345678',
    });
  });

  it('keeps international numbers in their own country', () => {
    expect(normalisePhone('+44 20 7946 0958').e164).toBe('+442079460958');
  });

  it('keeps text that is not a valid number, unparsed, never rejected', () => {
    expect(normalisePhone('*144#')).toEqual({
      raw: '*144#',
      e164: null,
      digits: '144',
    });
    expect(normalisePhone('123').e164).toBeNull();
  });
});

describe('phoneSearchDigits', () => {
  it('ignores queries that are not phone-like or too short', () => {
    expect(phoneSearchDigits('anna')).toEqual([]);
    expect(phoneSearchDigits('07')).toEqual([]);
  });

  it('adds the country-code form of a national prefix', () => {
    expect(phoneSearchDigits('0712')).toEqual(['0712', '254712']);
  });

  it('strips formatting from international queries', () => {
    expect(phoneSearchDigits('+254 712')).toEqual(['254712']);
    expect(phoneSearchDigits('712-345')).toEqual(['712345']);
  });
});
