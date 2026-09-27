'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { fmt } from '@/i18n/format';
import { useMessages } from '@/i18n/client';
import type { EditConflict, FieldConflict, OpResult } from '@/lib/offline-ops';
import {
  addClashes,
  CLASHES_EVENT,
  readClashes,
  saveClashes,
} from '@/lib/offline-store';

function format(field: string, v: unknown): string {
  if (field === 'phones' || field === 'emails') {
    return (v as { raw?: string; address?: string; label: string }[])
      .map((r) => `${r.raw ?? r.address}${r.label ? ` (${r.label})` : ''}`)
      .join(', ');
  }
  if (field === 'tags') return (v as string[]).join(', ');
  return v as string;
}

/**
 * Offline edits that clashed with a change made elsewhere (A4). The other
 * change was kept; here the owner sees both and can put theirs back with
 * one tap, or keep what is there. Stored on this device only.
 */
export function EditClashes({ ownerId }: { ownerId: string }) {
  const t = useMessages().clashes;
  const router = useRouter();
  const [items, setItems] = useState<EditConflict[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () => void readClashes(ownerId).then(setItems);
    load();
    window.addEventListener(CLASHES_EVENT, load);
    return () => window.removeEventListener(CLASHES_EVENT, load);
  }, [ownerId]);

  const settle = async (contactId: string, field: string) => {
    const next = items
      .map((c) =>
        c.contactId === contactId
          ? { ...c, fields: c.fields.filter((f) => f.field !== field) }
          : c,
      )
      .filter((c) => c.fields.length > 0);
    setItems(next);
    await saveClashes(ownerId, next);
  };

  const takeMine = async (c: EditConflict, f: FieldConflict) => {
    const key = `${c.contactId}:${f.field}`;
    setBusy(key);
    setError(false);
    try {
      const res = await fetch('/offline-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          ops: [
            {
              opId: crypto.randomUUID(),
              type: 'contact.edit',
              contactId: c.contactId,
              changes: { [f.field]: { from: f.theirs, to: f.mine } },
            },
          ],
        }),
      });
      const body = res.ok
        ? ((await res.json()) as { results: OpResult[] })
        : null;
      const r = body?.results[0];
      if (!r || r.status === 'retry') {
        setError(true);
        return;
      }
      await settle(c.contactId, f.field);
      // Changed yet again meanwhile: show the newest clash instead.
      if (r.conflict) await addClashes(ownerId, [r.conflict]);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) return null;
  return (
    <div className="mb-6 space-y-3">
      {items.map((c) => (
        <section
          key={c.contactId}
          aria-label={t.title}
          className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-semibold">{t.title}</h2>
            <Link
              href={`/contacts/${c.contactId}`}
              className="text-sm font-semibold text-accent hover:underline"
            >
              {t.open}
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            {fmt(t.body, { name: c.name })}
          </p>
          <ul className="mt-3 divide-y divide-border">
            {c.fields.map((f) => {
              const key = `${c.contactId}:${f.field}`;
              return (
                <li key={key} className="py-3">
                  <p className="text-sm font-semibold">{t.fields[f.field]}</p>
                  <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                    {fmt(t.theirs, { x: format(f.field, f.theirs) || t.empty })}
                  </p>
                  <p className="text-sm break-words whitespace-pre-wrap text-muted">
                    {fmt(t.mine, {
                      x: format(f.field, f.mine) || t.empty,
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg btn-primary px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
                      disabled={busy !== null}
                      aria-busy={busy === key}
                      onClick={() => void takeMine(c, f)}
                    >
                      {t.useMine}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
                      disabled={busy !== null}
                      onClick={() => void settle(c.contactId, f.field)}
                    >
                      {t.keep}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {error && (
            <p
              role="alert"
              className="mt-2 text-sm text-red-700 dark:text-red-300"
            >
              {t.failed}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
