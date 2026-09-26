import { redirect } from 'next/navigation';

import { apiText, sessionToken } from '@/lib/api';

/**
 * Downloads every contact not in the trash as one .vcf file. The API does
 * the work as the signed-in owner; this only turns it into a download.
 */
export async function GET(): Promise<Response> {
  if (!(await sessionToken())) redirect('/login');
  const res = await apiText('/contacts/export');
  if (res.status === 401) redirect('/login');
  if (res.status !== 200) {
    return new Response('The export could not be made. Try again shortly.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const day = new Date().toISOString().slice(0, 10);
  return new Response(res.text, {
    headers: {
      'content-type': 'text/vcard; charset=utf-8',
      'content-disposition': `attachment; filename="contacts-${day}.vcf"`,
      'cache-control': 'no-store',
    },
  });
}
