import { redirect } from 'next/navigation';

import { apiText, sessionToken } from '@/lib/api';
import { UUID } from '@/lib/contacts';
import { getGroup } from '@/lib/groups';

/** Downloads one group's members as a .vcf file. */
export async function GET(
  _req: Request,
  ctx: RouteContext<'/groups/[id]/export'>,
): Promise<Response> {
  if (!(await sessionToken())) redirect('/login');
  const { id } = await ctx.params;
  if (!UUID.test(id)) redirect('/groups');
  const [res, g] = await Promise.all([
    apiText(`/groups/${id}/export`),
    getGroup(id).catch(() => null),
  ]);
  const file = g?.name.replace(/[^\w -]/g, '').trim() || 'group';
  if (res.status === 401) redirect('/login');
  if (res.status === 404) redirect('/groups');
  if (res.status !== 200) {
    return new Response('The export could not be made. Try again shortly.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  return new Response(res.text, {
    headers: {
      'content-type': 'text/vcard; charset=utf-8',
      'content-disposition': `attachment; filename="${file}.vcf"`,
      'cache-control': 'no-store',
    },
  });
}
