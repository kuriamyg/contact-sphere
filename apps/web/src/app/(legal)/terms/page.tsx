import type { Metadata } from 'next';
import Link from 'next/link';

import { getLocale, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> => pageTitle('terms');

const UPDATED = '28 September 2026';

/** Terms of use (B7). Plain language; Kenyan law. */
export default async function TermsPage() {
  const sw = (await getLocale()) === 'sw';
  return (
    <article>
      <h1 className="font-display">Terms of use</h1>
      <p>Last updated: {UPDATED}</p>

      {sw && (
        <section className="summary" lang="sw" aria-label="Muhtasari">
          <h2>Muhtasari kwa Kiswahili</h2>
          <ul>
            <li>Lazima uwe na miaka 18 au zaidi, na ulinde nenosiri lako.</li>
            <li>
              Anwani zako ni zako. Usizitumie kutuma ujumbe usiotakiwa (spam) au
              kusumbua watu.
            </li>
            <li>
              SMS na WhatsApp hutumwa kutoka simu yako na hulipiwa na wewe.
            </li>
            <li>Unaweza kufuta akaunti yako wakati wowote.</li>
            <li>Sheria za Kenya ndizo zinazotumika.</li>
          </ul>
          <p>Toleo la Kiingereza hapa chini ndilo rasmi.</p>
        </section>
      )}

      <h2>The agreement</h2>
      <p>
        These terms are between you and Moses Mwangi Kuria (&ldquo;I&rdquo;),
        who runs Contact Sphere. By creating an account or using the app you
        agree to them and to the <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older.</li>
        <li>
          Keep your password to yourself and turn on two-factor sign-in if you
          store anything sensitive. You are responsible for what happens under
          your account.
        </li>
        <li>Tell me straight away if you think someone else has got in.</li>
      </ul>

      <h2>Your contacts stay yours</h2>
      <p>
        Everything you add remains yours. You give me permission to store and
        process it only to run the service for you. You can export it or delete
        it at any time.
      </p>

      <h2>Use it fairly</h2>
      <p>Please do not use Contact Sphere to:</p>
      <ul>
        <li>
          send messages people did not agree to receive, or harass anyone;
        </li>
        <li>store information you have no right to hold;</li>
        <li>break the law, including Kenya&rsquo;s Data Protection Act;</li>
        <li>attack, overload or try to get around the app&rsquo;s security.</li>
      </ul>
      <p>
        Group texts and WhatsApp messages are sent from your own phone and
        charged by your mobile operator; you are responsible for them and for
        their content.
      </p>

      <h2>The service</h2>
      <p>
        I work to keep Contact Sphere available, accurate and secure, but it is
        provided as it is, without a promise that it will never be interrupted
        or never contain a mistake. Keep your own copy of anything important —
        the .vcf export makes that easy. The app is free during this early
        period. If paid plans are introduced, I will tell you in advance and
        nothing will be charged without your agreement.
      </p>

      <h2>Ending</h2>
      <p>
        You can stop at any time by deleting your account in Profile. I may
        suspend an account that breaks these terms or puts others at risk, and
        will tell you why when I can.
      </p>

      <h2>Responsibility</h2>
      <p>
        To the extent Kenyan law allows, I am not liable for indirect losses, or
        for losses caused by events outside my reasonable control. Nothing in
        these terms limits rights you have as a consumer under Kenyan law.
      </p>

      <h2>Law and contact</h2>
      <p>
        These terms are governed by the laws of Kenya. Questions:{' '}
        <a href="mailto:kuriam177@gmail.com">kuriam177@gmail.com</a>. If they
        change in a way that matters, I will say so in the app first.
      </p>
    </article>
  );
}
