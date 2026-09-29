import type { Metadata } from 'next';
import Link from 'next/link';

import { getLocale, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> => pageTitle('privacy');

const UPDATED = '28 September 2026';

/**
 * Privacy policy (B7). Written for the Kenya Data Protection Act 2019 and
 * kept factual: every statement matches what the code and hosting do
 * (docs/security/threat-model.md). Change them together.
 */
export default async function PrivacyPage() {
  const sw = (await getLocale()) === 'sw';
  return (
    <article>
      <h1 className="font-display">Privacy policy</h1>
      <p>Last updated: {UPDATED}</p>

      {sw && (
        <section className="summary" lang="sw" aria-label="Muhtasari">
          <h2>Muhtasari kwa Kiswahili</h2>
          <ul>
            <li>
              <strong>Tunahifadhi nini:</strong> barua pepe au nambari yako ya
              simu, nenosiri lililofichwa (hash), mipangilio yako, na anwani
              unazoweka (majina, nambari, maelezo, vikundi, ufuatiliaji).
            </li>
            <li>
              <strong>Hatuuzi wala kushiriki</strong> data yako, hakuna
              matangazo, na programu haina vifuatiliaji.
            </li>
            <li>
              <strong>Mahali:</strong> seva na hifadhidata ziko Frankfurt,
              Ujerumani (Umoja wa Ulaya).
            </li>
            <li>
              <strong>Haki zako:</strong> kuona, kurekebisha, kupakua (.vcf) na
              kufuta akaunti yako yote wakati wowote kupitia Wasifu.
            </li>
            <li>
              <strong>Malalamiko:</strong> niandikie kwanza; unaweza pia
              kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data (ODPC).
            </li>
          </ul>
          <p>Toleo la Kiingereza hapa chini ndilo rasmi.</p>
        </section>
      )}

      <h2>Who is responsible</h2>
      <p>
        Contact Sphere is run by <strong>Moses Mwangi Kuria</strong>, Nairobi,
        Kenya (&ldquo;I&rdquo;, &ldquo;me&rdquo;). I am the data controller for
        your account data. Questions or requests:{' '}
        <a href="mailto:kuriam177@gmail.com">kuriam177@gmail.com</a>.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>
          Your contacts are yours. They are never sold, shared or used for
          advertising.
        </li>
        <li>
          The app has no advertising, no analytics and no tracking cookies.
        </li>
        <li>
          You can download everything (.vcf) and delete your account yourself,
          at any time.
        </li>
      </ul>

      <h2>What is stored</h2>
      <h3>About you</h3>
      <ul>
        <li>
          Your email address or mobile number (whichever you signed up with)
          and, if you add one, your display name.
        </li>
        <li>
          If you use &ldquo;Continue with Google&rdquo;: your Google
          account&rsquo;s id, email address and name, as Google shares them with
          your permission. Never your Google password, and nothing else from
          your Google account.
        </li>
        <li>
          Your password — only as a one-way argon2 hash; nobody, including me,
          can read it.
        </li>
        <li>
          If you turn on two-factor sign-in: the authenticator secret
          (encrypted) and one-way hashes of your recovery codes.
        </li>
        <li>
          Your settings: language, reminder choices, which contact is your QR
          card.
        </li>
        <li>
          Signed-in devices: a coarse label such as &ldquo;Chrome on
          Android&rdquo; and when each was used — never your IP address or the
          full browser string.
        </li>
        <li>
          If you turn on phone reminders: the push address your browser gives
          (at Google, Apple or Mozilla).
        </li>
        <li>
          Your plan and payments: how many months, the amount, the date and the
          M-Pesa confirmation code. Never your M-Pesa PIN. The number you pay
          from is passed to Safaricom for the payment prompt and not stored.
        </li>
        <li>
          A security log of actions (for example &ldquo;contact updated&rdquo;),
          holding only ids, times and counts — never names, numbers or notes.
        </li>
      </ul>
      <h3>About the people in your contacts</h3>
      <p>
        Whatever you add: names, phone numbers, emails, organisation, job, area,
        who introduced you, skills, birthdays, notes, groups and roles, and your
        follow-ups. These people did not sign up — please store only what you
        need, and treat it with care. If you use Contact Sphere for a chama,
        church or business rather than personally, you are responsible under the
        Data Protection Act for having a good reason to keep their details.
      </p>

      <h2>Why, and on what basis</h2>
      <ul>
        <li>
          <strong>To provide the service you asked for</strong> (performance of
          our agreement): storing and showing your contacts, reminders, groups,
          import and export.
        </li>
        <li>
          <strong>To keep it secure</strong> (legitimate interest and legal
          obligation): sign-in protection, rate limits, the security log.
        </li>
        <li>
          <strong>To take payment and keep the books</strong> (performance of
          our agreement and legal obligation): your plan and payment records.
        </li>
        <li>
          <strong>Only when you switch them on</strong> (consent): phone and
          email reminders, the offline copy on your phone.
        </li>
      </ul>

      <h2>Where it is kept, and who helps</h2>
      <p>
        The database and the application servers are in{' '}
        <strong>Frankfurt, Germany (European Union)</strong>, which protects
        personal data to a standard at least equal to Kenya&rsquo;s. These
        companies process data for me, only to run the service:
      </p>
      <ul>
        <li>
          <strong>Neon</strong> — the database (Frankfurt).
        </li>
        <li>
          <strong>Render</strong> — the application server (Frankfurt).
        </li>
        <li>
          <strong>Vercel</strong> — the web server (Frankfurt) and its global
          delivery network.
        </li>
        <li>
          <strong>Resend</strong> — only if you turn on email reminders: your
          email address and the number of people to reach that day, never their
          names.
        </li>
        <li>
          <strong>Google</strong> — only if you choose &ldquo;Continue with
          Google&rdquo;: Google confirms who you are and tells us your name and
          email. We send Google nothing about your contacts.
        </li>
        <li>
          <strong>Safaricom (M-Pesa)</strong> — only when you pay in the app:
          your M-Pesa number and the amount, for the payment prompt.
        </li>
        <li>
          <strong>Africa&rsquo;s Talking</strong> (Nairobi, Kenya) — only when
          you sign up or reset your password with a mobile number: your number
          and the text carrying the one-time code.
        </li>
        <li>
          <strong>Google, Apple or Mozilla</strong> push services — only if you
          turn on phone reminders; the message is encrypted to your device.
        </li>
        <li>
          <strong>Have I Been Pwned</strong> — when you set a password, the
          first 5 characters of its SHA-1 hash are checked against known
          breaches. Nothing that identifies you is sent.
        </li>
      </ul>
      <p>
        Texting a group uses your own phone&rsquo;s SMS or WhatsApp — the app
        does not send those messages or see their content.
      </p>

      <p>
        As the person running the service, I can see each account&rsquo;s name,
        email or mobile number, plan, payments, when it was last used and how
        many contacts and groups it has — to support you and to keep the books.
        Never the contacts themselves.
      </p>

      <h2>How long it is kept</h2>
      <ul>
        <li>Your data: for as long as you have an account.</li>
        <li>Contacts you move to the trash: 30 days, then deleted for good.</li>
        <li>
          Sign-in sessions: end after 7 days unused, and at most after 30 days.
        </li>
        <li>Failed sign-in counters: deleted after one day.</li>
        <li>
          Payment records: 5 years, as Kenyan tax law requires — also after you
          delete your account, but no longer linked to it.
        </li>
        <li>
          One-time SMS codes: kept only as one-way hashes, work for 10 minutes,
          and deleted within a day.
        </li>
        <li>
          When you delete your account, everything above is deleted at once. The
          hosting provider&rsquo;s point-in-time backups may hold it for up to 7
          more days before they expire. The security log keeps a record that an
          account was deleted, with counts only.
        </li>
      </ul>

      <h2>On your phone</h2>
      <p>
        Contact Sphere uses only cookies it needs: one that keeps you signed in
        (it cannot be read by the page&rsquo;s scripts), and small ones for your
        language, theme and screen size. If you switch on &ldquo;Use it without
        data&rdquo;, a copy of your contacts is kept in this browser&rsquo;s
        storage until you turn it off or sign out.
      </p>

      <h2>Your rights</h2>
      <p>Under the Data Protection Act 2019 you can:</p>
      <ul>
        <li>
          <strong>Be informed</strong> — this page.
        </li>
        <li>
          <strong>See and correct</strong> your data — everything is visible and
          editable in the app.
        </li>
        <li>
          <strong>Take it with you</strong> — Profile → Your data → Export
          contacts (.vcf).
        </li>
        <li>
          <strong>Delete it</strong> — Profile → Delete your account removes
          everything immediately.
        </li>
        <li>
          <strong>Object</strong> to processing, or ask me anything about it, by
          email.
        </li>
      </ul>
      <p>
        I reply to requests as soon as possible and within the time the law
        allows. If you are not satisfied, you may complain to the Office of the
        Data Protection Commissioner (ODPC) at{' '}
        <a href="https://www.odpc.go.ke" rel="noopener noreferrer">
          odpc.go.ke
        </a>
        .
      </p>

      <h2>Security</h2>
      <p>
        Encrypted connections everywhere, two-factor sign-in, a check against
        breached passwords, per-device sign-out, rate limits and lock-outs,
        database rules that keep each account&rsquo;s data apart, a security log
        the app itself cannot alter, and logs that never contain your
        contacts&rsquo; details. If a breach ever affects your data, I will tell
        you and the ODPC as the law requires.
      </p>

      <h2>Children</h2>
      <p>Contact Sphere is for people aged 18 and over.</p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that matters, I will say so in the app
        before it takes effect. The date at the top shows the latest version.
        See also the <Link href="/terms">terms of use</Link>.
      </p>
    </article>
  );
}
