import Link from 'next/link';

import { getMessages } from '@/i18n/server';

/** "By creating an account you agree to the terms and the privacy policy." */
export async function Consent() {
  const m = await getMessages();
  return (
    <p className="text-center text-xs text-muted">
      {m.auth.agree.split(/(\{terms\}|\{privacy\})/).map((part, i) =>
        part === '{terms}' ? (
          <Link key={i} href="/terms" className="underline">
            {m.auth.termsLink}
          </Link>
        ) : part === '{privacy}' ? (
          <Link key={i} href="/privacy" className="underline">
            {m.auth.privacyLink}
          </Link>
        ) : (
          part
        ),
      )}
    </p>
  );
}
