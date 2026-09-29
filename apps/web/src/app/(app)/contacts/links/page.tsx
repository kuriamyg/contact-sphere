import type { Metadata } from 'next';
import Link from 'next/link';

import {
  addRelationship,
  dismissSuggestion,
} from '@/app/actions/relationships';
import { Notice } from '@/components/contacts/notice';
import { fmt } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import { FAMILY_ROLES, listSuggestions } from '@/lib/relationships';

export const generateMetadata = (): Promise<Metadata> =>
  pageTitle('relationships');

const button =
  'rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

/**
 * Suggested links from what the owner already saved (P6, ADR 0023). Only
 * suggestions: nothing is linked until the owner confirms one.
 */
export default async function SuggestedLinksPage({
  searchParams,
}: PageProps<'/contacts/links'>) {
  const sp = await searchParams;
  const [suggestions, m] = await Promise.all([
    listSuggestions(),
    getMessages(),
  ]);
  const t = m.relationships.suggestions;

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {t.back}
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted">{t.lead}</p>
      </div>
      <Link
        href="/contacts/map"
        className="inline-block text-sm font-medium text-accent hover:underline"
      >
        {m.relationships.map.title} →
      </Link>
      <Notice code={sp.done} />

      {suggestions.length === 0 ? (
        <p className="text-muted">{t.none}</p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => {
            const key = `${s.kind}:${s.from.id}:${s.to.id}`;
            const introduced = s.kind === 'introduced';
            return (
              <li key={key} className="space-y-3 rounded-xl card p-4">
                <p className="break-words">
                  {fmt(introduced ? t.metThrough : t.sameSurname, {
                    a: s.from.displayName,
                    b: s.to.displayName,
                  })}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <form
                    action={addRelationship}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="back" value="/contacts/links" />
                    {introduced ? (
                      <>
                        {/* "from" introduced the owner to "to". */}
                        <input type="hidden" name="contactId" value={s.to.id} />
                        <input type="hidden" name="otherId" value={s.from.id} />
                        <input type="hidden" name="role" value="introducedBy" />
                      </>
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name="contactId"
                          value={s.from.id}
                        />
                        <input type="hidden" name="otherId" value={s.to.id} />
                        <label className="space-y-1 text-sm">
                          <span className="block text-muted">
                            {fmt(t.as, {
                              a: s.from.displayName,
                              b: s.to.displayName,
                            })}
                          </span>
                          <select
                            name="role"
                            defaultValue="relative"
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-base"
                          >
                            {FAMILY_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {fmt(m.relationships.roles[r], {
                                  name: s.from.displayName,
                                })}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    <button type="submit" className={button}>
                      {t.link}
                    </button>
                  </form>
                  <form action={dismissSuggestion}>
                    <input type="hidden" name="kind" value={s.kind} />
                    <input type="hidden" name="aId" value={s.from.id} />
                    <input type="hidden" name="bId" value={s.to.id} />
                    <button type="submit" className={button}>
                      {t.notRelated}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
