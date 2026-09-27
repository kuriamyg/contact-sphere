import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GroupTexter } from '@/components/reach/group-texter';
import { UUID } from '@/lib/contacts';
import { getGroup } from '@/lib/groups';
import { getReachStatus } from '@/lib/reach';
import { getMessages, pageTitle } from '@/i18n/server';

export const generateMetadata = (): Promise<Metadata> => pageTitle('textGroup');

export default async function TextGroupPage({
  params,
}: PageProps<'/groups/[id]/text'>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [g, reach] = await Promise.all([getGroup(id), getReachStatus()]);
  if (!g) notFound();
  const t = (await getMessages()).groups.text;
  const numbers = [
    ...new Set(
      g.members
        .map((m) => m.phone?.e164 ?? m.phone?.raw)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const sms = reach?.sms;
  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={`/groups/${g.id}`}
        className="text-sm text-muted hover:underline"
      >
        ← {g.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      {numbers.length === 0 ? (
        <p className="text-muted">{t.noNumbers}</p>
      ) : (
        <GroupTexter
          groupId={g.id}
          numbers={numbers}
          provider={
            sms?.enabled
              ? {
                  priceCents: sms.priceCents,
                  remaining: Math.max(0, sms.monthlyLimit - sms.usedThisMonth),
                }
              : null
          }
        />
      )}
    </div>
  );
}
