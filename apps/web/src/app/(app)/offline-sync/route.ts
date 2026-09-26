import { api, sessionToken } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { applyOp, type Op, parseOps, type OpResult } from '@/lib/offline-ops';

/**
 * Changes made with no data (Phase 10b+), sent when the phone is back
 * online. Same-origin only: a forged request from another site carries a
 * different Origin (and a JSON body forces a CORS preflight anyway).
 * Ops run in order; the first one that should be retried stops the rest,
 * so a follow-up is never sent before the contact it belongs to.
 */
export async function POST(req: Request): Promise<Response> {
  const headers = { 'cache-control': 'no-store' };
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers });
  }
  if (!(await sessionToken())) {
    return Response.json({ error: 'signed out' }, { status: 401, headers });
  }
  let ops: Op[];
  let ownerId: unknown;
  try {
    const body = (await req.json()) as { ownerId?: unknown };
    ownerId = body.ownerId;
    ops = parseOps(body);
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400, headers });
  }
  // Changes belong to the account that made them; never apply them to
  // another account signed in on the same phone.
  const user = await currentUser().catch(() => null);
  if (!user) {
    return Response.json({ error: 'signed out' }, { status: 401, headers });
  }
  if (ownerId !== user.id) {
    return Response.json(
      { error: 'different account' },
      { status: 409, headers },
    );
  }
  const results: OpResult[] = [];
  let stop = false;
  for (const op of ops) {
    if (stop) {
      results.push({ opId: op.opId, status: 'retry' });
      continue;
    }
    const r = await applyOp(op, api);
    if (r.status === 'signed-out') {
      return Response.json({ error: 'signed out' }, { status: 401, headers });
    }
    results.push(r as OpResult);
    if (r.status === 'retry') stop = true;
  }
  return Response.json({ results }, { headers });
}
