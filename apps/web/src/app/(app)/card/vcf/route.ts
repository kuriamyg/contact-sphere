import { redirect } from 'next/navigation';

import { sessionToken } from '@/lib/api';
import { getCard } from '@/lib/reach';
import { cardVcf } from '@/lib/vcard-card';

/** The owner's card as a .vcf, to send on WhatsApp or by email. */
export async function GET(): Promise<Response> {
  if (!(await sessionToken())) redirect('/login');
  const card = await getCard();
  if (!card) return new Response('Not found', { status: 404 });
  const name =
    card.displayName.replace(/[^A-Za-z0-9 ._-]/g, '').trim() || 'contact';
  return new Response(cardVcf(card), {
    headers: {
      'content-type': 'text/vcard; charset=utf-8',
      'content-disposition': `attachment; filename="${name}.vcf"`,
      'cache-control': 'no-store',
    },
  });
}
