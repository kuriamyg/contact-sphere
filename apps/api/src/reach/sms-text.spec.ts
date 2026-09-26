import { isKenyanMobile, smsSize } from './sms-text';

describe('smsSize', () => {
  it('fits 160 plain characters in one SMS', () => {
    expect(smsSize('a'.repeat(160))).toEqual({
      encoding: 'gsm',
      length: 160,
      parts: 1,
    });
    expect(smsSize('a'.repeat(161)).parts).toBe(2);
    expect(smsSize('a'.repeat(306)).parts).toBe(2);
    expect(smsSize('a'.repeat(307)).parts).toBe(3);
  });

  it('counts extended characters twice', () => {
    expect(smsSize('€'.repeat(80)).length).toBe(160);
    expect(smsSize('€'.repeat(81)).parts).toBe(2);
  });

  it('switches to 70 per SMS for emoji and curly quotes', () => {
    expect(smsSize('Habari ’').encoding).toBe('unicode');
    expect(smsSize('x'.repeat(70) + '').parts).toBe(1);
    expect(smsSize('x'.repeat(69) + '🙂').parts).toBe(2);
    expect(smsSize('x'.repeat(134)).parts).toBe(1);
  });

  it('treats a normal Kenyan reminder as one SMS', () => {
    const m =
      'Habari! Chama meeting ni Jumamosi 3pm, Kasarani. Contribution KES 500. Asante.';
    expect(smsSize(m)).toMatchObject({ encoding: 'gsm', parts: 1 });
  });
});

describe('isKenyanMobile', () => {
  it('accepts Safaricom/Airtel/Telkom mobiles only', () => {
    expect(isKenyanMobile('+254712345678')).toBe(true);
    expect(isKenyanMobile('+254110345678')).toBe(true);
    expect(isKenyanMobile('+254202345678')).toBe(false);
    expect(isKenyanMobile('+256712345678')).toBe(false);
    expect(isKenyanMobile(null)).toBe(false);
  });
});
