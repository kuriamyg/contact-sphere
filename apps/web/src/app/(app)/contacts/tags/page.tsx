import type { Metadata } from 'next';
import Link from 'next/link';

import { deleteSearch, deleteTag, renameTag } from '@/app/actions/tags';
import { Notice } from '@/components/contacts/notice';
import { listSavedSearches, listTags } from '@/lib/contacts';

export const metadata: Metadata = {
  title: 'Skills and saved searches · Contact Sphere',
};

const button =
  'rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';
const input =
  'block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';

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
  const [tags, searches] = await Promise.all([listTags(), listSavedSearches()]);
  return (
    <div className="max-w-xl space-y-8">
      <Link href="/contacts" className="text-sm text-muted hover:underline">
        ← Contacts
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        Skills and saved searches
      </h1>
      <Notice code={done} />

      <section aria-labelledby="skills" className="space-y-3">
        <h2 id="skills" className="text-lg font-semibold">
          Skills and services
        </h2>
        {tags.length === 0 ? (
          <p className="text-muted">
            None yet. Add them when you edit a contact, or import a .vcf with
            groups.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Renaming or removing changes every contact that has it. Renaming
              to a skill that already exists joins the two.
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {tags.map((t) => (
                <li key={t.tag} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/contacts?tag=${encodeURIComponent(t.tag)}`}
                      className="min-w-0 font-medium break-words hover:underline"
                    >
                      {t.tag}
                    </Link>
                    <span className="shrink-0 text-sm text-muted tabular-nums">
                      {t.count} {t.count === 1 ? 'contact' : 'contacts'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <details className="group">
                      <summary className={`${button} cursor-pointer list-none`}>
                        Rename
                      </summary>
                      <form action={renameTag} className="mt-2 flex gap-2">
                        <input type="hidden" name="from" value={t.tag} />
                        <label className="sr-only" htmlFor={`to-${t.tag}`}>
                          New name for {t.tag}
                        </label>
                        <input
                          id={`to-${t.tag}`}
                          name="to"
                          required
                          maxLength={40}
                          defaultValue={t.tag}
                          className={input}
                        />
                        <button type="submit" className={button}>
                          Save
                        </button>
                      </form>
                    </details>
                    <details>
                      <summary
                        className={`${button} cursor-pointer list-none text-red-700 dark:text-red-300`}
                      >
                        Remove
                      </summary>
                      <form action={deleteTag} className="mt-2 space-y-2">
                        <input type="hidden" name="tag" value={t.tag} />
                        <p className="text-sm">
                          Remove “{t.tag}” from {t.count}{' '}
                          {t.count === 1 ? 'contact' : 'contacts'}? The contacts
                          stay.
                        </p>
                        <button
                          type="submit"
                          className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                        >
                          Remove “{t.tag}”
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
          Saved searches
        </h2>
        {searches.length === 0 ? (
          <p className="text-muted">
            None yet. Search or pick a skill on your contacts, then “Save this
            search”.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
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
                    {[s.query && `“${s.query}”`, s.tag && `skill: ${s.tag}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </Link>
                <form action={deleteSearch}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className={button}
                    aria-label={`Delete saved search ${s.name}`}
                  >
                    Delete
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
