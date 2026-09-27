import type { EmailConfig } from '../config/env';
import {
  BrevoEmailProvider,
  emailProviderFor,
  LogEmailProvider,
  ResendEmailProvider,
} from './email-provider';

const cfg = (provider: EmailConfig['provider']): EmailConfig => ({
  provider,
  apiKey: 'secret-key',
  from: { name: 'Contact Sphere', address: 'digest@mail.example.com' },
});
const msg = {
  to: 'owner@example.com',
  subject: 'Today: 1 follow-up.',
  text: 'Today: 1 follow-up.',
  html: '<p>Today: 1 follow-up.</p>',
};

function recorder(status: number) {
  const calls: { url: string; init: RequestInit }[] = [];
  const http = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response('{}', { status }));
  }) as unknown as typeof fetch;
  return { calls, http };
}

describe('ResendEmailProvider', () => {
  it('posts to /emails with a bearer key and the sender', async () => {
    const { calls, http } = recorder(200);
    expect(await new ResendEmailProvider(cfg('resend'), http).send(msg)).toBe(
      true,
    );
    const [{ url, init }] = calls;
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).authorization).toBe(
      'Bearer secret-key',
    );
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Contact Sphere <digest@mail.example.com>',
      to: ['owner@example.com'],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
  });

  it('reports a refusal or a network failure as not sent, never throws', async () => {
    const { http } = recorder(422);
    expect(await new ResendEmailProvider(cfg('resend'), http).send(msg)).toBe(
      false,
    );
    const broken = (() =>
      Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await new ResendEmailProvider(cfg('resend'), broken).send(msg)).toBe(
      false,
    );
  });
});

describe('BrevoEmailProvider', () => {
  it('posts to /v3/smtp/email with an api-key header', async () => {
    const { calls, http } = recorder(201);
    expect(await new BrevoEmailProvider(cfg('brevo'), http).send(msg)).toBe(
      true,
    );
    const [{ url, init }] = calls;
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe(
      'secret-key',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { name: 'Contact Sphere', email: 'digest@mail.example.com' },
      to: [{ email: 'owner@example.com' }],
      subject: msg.subject,
      textContent: msg.text,
      htmlContent: msg.html,
    });
  });

  it('reports a refusal as not sent', async () => {
    const { http } = recorder(401);
    expect(await new BrevoEmailProvider(cfg('brevo'), http).send(msg)).toBe(
      false,
    );
  });
});

describe('emailProviderFor', () => {
  it('is off without configuration, and picks the named provider', () => {
    expect(emailProviderFor(undefined)).toBeNull();
    expect(emailProviderFor(cfg('log'))).toBeInstanceOf(LogEmailProvider);
    expect(emailProviderFor(cfg('resend'))).toBeInstanceOf(ResendEmailProvider);
    expect(emailProviderFor(cfg('brevo'))).toBeInstanceOf(BrevoEmailProvider);
  });
});
