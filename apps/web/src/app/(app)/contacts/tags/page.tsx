import type { Metadata } from 'next';
import Link from 'next/link';

import { deleteSearch, deleteTag, renameTag } from '@/app/actions/tags';
import { Notice } from '@/components/contacts/notice';
import { fmt, plural } from '@/i18n/format';
import { getMessages, pageTitle } from '@/i18n/server';
import { listSavedSearches, listTags } from '@/lib/contacts';

export const generateMetadata = (): Promise<Metadata> => pageTitle('tags');

const button =
  'rounded-lg border border-border px-3 py-2 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';
const input =
  'block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';

const searchHref = (q: string, tag: string | null) => {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (tag) qs.set('tag', tag);
  return `/contacts?${qs.toString()}`;
};

/** Rename or remove a skill everywhere at once; tidy saved searches. */
export default async function TagsPage({
  searchParams,
}: PageProps<'/contacts/tags'>) {
  const { done } = await searchParams;
  const [tags, searches, m] = await Promise.all([
    listTags(),
    listSavedSearches(),
    getMessages(),
  ]);
  const t = m.contactPages.tags;
  return (
    <div className="max-w-xl space-y-8">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        {m.contacts.detail.back}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <Notice code={done} />

      <section aria-labelledby="skills" className="space-y-3">
        <h2 id="skills" className="text-lg font-semibold">
          {t.skills}
        </h2>
        {tags.length === 0 ? (
          <p className="text-muted">{t.noSkills}</p>
        ) : (
          <>
            <p className="text-sm text-muted">{t.explain}</p>
            <ul className="divide-y divide-border rounded-xl card">
              {tags.map((tg) => (
                <li key={tg.tag} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/contacts?tag=${encodeURIComponent(tg.tag)}`}
                      className="min-w-0 font-medium break-words hover:underline"
                    >
                      {tg.tag}
                    </Link>
                    <span className="shrink-0 text-sm text-muted tabular-nums">
                      {plural(tg.count, m.common.contacts)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <details className="group">
                      <summary className={`${button} cursor-pointer list-none`}>
                        {t.rename}
                      </summary>
                      <form action={renameTag} className="mt-2 flex gap-2">
                        <input type="hidden" name="from" value={tg.tag} />
                        <label className="sr-only" htmlFor={`to-${tg.tag}`}>
                          {fmt(t.newName, { tag: tg.tag })}
                        </label>
                        <input
                          id={`to-${tg.tag}`}
                          name="to"
                          required
                          maxLength={40}
                          defaultValue={tg.tag}
                          className={input}
                        />
                        <button type="submit" className={button}>
                          {t.save}
                        </button>
                      </form>
                    </details>
                    <details>
                      <summary
                        className={`${button} cursor-pointer list-none text-red-700 dark:text-red-300`}
                      >
                        {t.remove}
                      </summary>
                      <form action={deleteTag} className="mt-2 space-y-2">
                        <input type="hidden" name="tag" value={tg.tag} />
                        <p className="text-sm">
                          {plural(tg.count, t.removeConfirm, { tag: tg.tag })}
                        </p>
                        <button
                          type="submit"
                          className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                        >
                          {fmt(t.removeTag, { tag: tg.tag })}
                        </button>
                      </form>
                    </details>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="saved" className="space-y-3">
        <h2 id="saved" className="text-lg font-semibold">
          {t.saved}
        </h2>
        {searches.length === 0 ? (
          <p className="text-muted">{t.noSaved}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl card">
            {searches.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={searchHref(s.query, s.tag)}
                  className="min-w-0 hover:underline"
                >
                  <span className="block font-medium break-words">
                    {s.name}
                  </span>
                  <span className="block text-sm break-words text-muted">
                    {[
                      s.query && `“${s.query}”`,
                      s.tag && fmt(t.skillIs, { tag: s.tag }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </Link>
                <form action={deleteSearch}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className={button}
                    aria-label={fmt(t.deleteSaved, { name: s.name })}
                  >
                    {t.delete}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
