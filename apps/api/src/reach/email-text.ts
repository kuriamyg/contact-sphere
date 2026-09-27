import type { EmailMessage } from './email-provider';

type Locale = 'en' | 'sw';

const WORDS: Record<
  Locale,
  {
    open: string;
    why: string;
    turnOff: string;
    testSubject: string;
    testBody: string;
  }
> = {
  en: {
    open: 'Open Today',
    why: 'You get this because email reminders are on in Contact Sphere. It shows counts only, never names.',
    turnOff: 'Turn it off in Profile',
    testSubject: 'Contact Sphere: email reminders are on',
    testBody:
      'Email reminders are on. You will get one each morning when something is due.',
  },
  sw: {
    open: 'Fungua Leo',
    why: 'Unapokea hii kwa sababu vikumbusho vya barua pepe vimewashwa kwenye Contact Sphere. Huonyesha idadi tu, kamwe si majina.',
    turnOff: 'Zima kwenye Wasifu',
    testSubject: 'Contact Sphere: vikumbusho vya barua pepe vimewashwa',
    testBody:
      'Vikumbusho vya barua pepe vimewashwa. Utapata kimoja kila asubuhi kukiwa na jambo la kufanya.',
  },
};

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );

/**
 * The morning email. Like the phone notification it carries counts only
 * (it passes through the email provider and sits in an inbox), plus links
 * back into the app. No images, no tracking.
 */
export function digestEmail(
  to: string,
  line: string,
  locale: Locale,
  webOrigin: string,
): EmailMessage {
  return compose(to, line, line, locale, webOrigin);
}

export function testEmail(
  to: string,
  locale: Locale,
  webOrigin: string,
): EmailMessage {
  const w = WORDS[locale];
  return compose(to, w.testSubject, w.testBody, locale, webOrigin);
}

function compose(
  to: string,
  subject: string,
  body: string,
  locale: Locale,
  webOrigin: string,
): EmailMessage {
  const w = WORDS[locale];
  const today = `${webOrigin}/today`;
  const account = `${webOrigin}/account`;
  const text = `${body}\n\n${w.open}: ${today}\n\n--\n${w.why}\n${w.turnOff}: ${account}\n`;
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;padding:24px;background:#fbf8f2;font-family:Arial,Helvetica,sans-serif;color:#14161c">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e2d6;border-radius:16px;padding:24px">
<p style="margin:0 0 4px;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#047857">Contact Sphere</p>
<p style="margin:0 0 20px;font-size:20px;line-height:1.35;font-weight:bold">${escape(body)}</p>
<a href="${escape(today)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:12px">${escape(w.open)}</a>
</div>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#555b68">${escape(w.why)} <a href="${escape(account)}" style="color:#047857">${escape(w.turnOff)}</a>.</p>
</body></html>`;
  return { to, subject, text, html };
}
