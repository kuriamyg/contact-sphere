'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';

import {
  type ImportPlan,
  previewImport,
  runImport,
} from '@/app/actions/import';
import { FormMessage } from '@/components/auth/field';
import {
  countCards,
  MAX_VCF_CHARS,
  stripBinaryProperties,
} from '@/lib/vcf-file';

const primary =
  'rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60';
const secondary =
  'rounded-lg border border-border px-4 py-2.5 font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

type Stage =
  | { name: 'choose' }
  | { name: 'preview'; fileName: string; vcf: string; plan: ImportPlan }
  | { name: 'done'; plan: ImportPlan };

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Choose a .vcf → see what would happen → import. The file is read in the
 * browser; photos are removed before anything is uploaded.
 */
export function ImportWizard() {
  const [stage, setStage] = useState<Stage>({ name: 'choose' });
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function reset() {
    setStage({ name: 'choose' });
    setError(undefined);
    if (input.current) input.current.value = '';
  }

  function onFile(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    start(async () => {
      let vcf: string;
      try {
        vcf = stripBinaryProperties(await file.text());
      } catch {
        setError('That file could not be read.');
        return;
      }
      if (countCards(vcf) === 0) {
        setError(
          'No contacts found. Choose a .vcf (vCard) file exported from your phone or address book.',
        );
        return;
      }
      if (vcf.length > MAX_VCF_CHARS) {
        setError(
          'That file is too large to import at once (over 4 MB without photos).',
        );
        return;
      }
      const res = await previewImport(vcf);
      if ('error' in res) setError(res.error);
      else
        setStage({ name: 'preview', fileName: file.name, vcf, plan: res.plan });
    });
  }

  function onImport(vcf: string) {
    setError(undefined);
    start(async () => {
      const res = await runImport(vcf);
      if ('error' in res) setError(res.error);
      else setStage({ name: 'done', plan: res.plan });
    });
  }

  if (stage.name === 'done') {
    const p = stage.plan;
    return (
      <div className="space-y-4">
        <FormMessage
          success={
            p.toImport > 0
              ? `Imported ${plural(p.toImport, 'contact', 'contacts')}.`
              : 'Nothing new to import — everything in that file is already saved.'
          }
        />
        <Skipped plan={p} />
        <div className="flex flex-wrap gap-3">
          <Link href="/contacts" className={primary}>
            View contacts
          </Link>
          <button type="button" onClick={reset} className={secondary}>
            Import another file
          </button>
        </div>
      </div>
    );
  }

  if (stage.name === 'preview') {
    const p = stage.plan;
    return (
      <div className="space-y-5">
        <FormMessage error={error} />
        <div className="space-y-1">
          <p className="font-medium break-all">{stage.fileName}</p>
          <p className="text-muted">
            {plural(p.cards, 'contact', 'contacts')} in the file.
          </p>
        </div>
        <p className="text-lg">
          {p.toImport > 0 ? (
            <>
              <strong>{plural(p.toImport, 'contact', 'contacts')}</strong> will
              be added.
            </>
          ) : (
            'Nothing new to add — everything in this file is already saved.'
          )}
        </p>
        <Skipped plan={p} />
        <Warnings plan={p} />
        {p.preview.length > 0 && (
          <details className="rounded-xl border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              See who will be added
            </summary>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto border-t border-border text-sm">
              {p.preview.map((c, i) => (
                <li key={i} className="flex justify-between gap-3 px-4 py-2">
                  <span className="truncate">{c.displayName}</span>
                  {c.phone && (
                    <span className="shrink-0 text-muted">{c.phone}</span>
                  )}
                </li>
              ))}
              {p.toImport > p.preview.length && (
                <li className="px-4 py-2 text-muted">
                  …and {p.toImport - p.preview.length} more
                </li>
              )}
            </ul>
          </details>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className={secondary}
            disabled={pending}
          >
            Choose another file
          </button>
          {p.toImport > 0 && (
            <button
              type="button"
              onClick={() => onImport(stage.vcf)}
              disabled={pending}
              aria-busy={pending}
              className={`${primary} sm:ml-auto`}
            >
              {pending
                ? 'Importing…'
                : `Import ${plural(p.toImport, 'contact', 'contacts')}`}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormMessage error={error} />
      <label
        htmlFor="vcf"
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center hover:bg-surface focus-within:ring-2 focus-within:ring-foreground/40"
      >
        <span className="font-medium">
          {pending ? 'Reading the file…' : 'Choose a .vcf file'}
        </span>
        <span className="text-sm text-muted">
          Nothing is saved until you confirm on the next step.
        </span>
        <input
          ref={input}
          id="vcf"
          type="file"
          accept=".vcf,.vcard,text/vcard,text/x-vcard,text/directory"
          className="sr-only"
          disabled={pending}
          onChange={(e) => onFile(e.currentTarget.files?.[0])}
        />
      </label>
    </div>
  );
}

function Skipped({ plan: p }: { plan: ImportPlan }) {
  const rows = [
    p.alreadySaved > 0 &&
      `${plural(p.alreadySaved, 'contact is', 'contacts are')} already saved (same name, numbers and emails) and will be skipped.`,
    p.repeatedInFile > 0 &&
      `${plural(p.repeatedInFile, 'contact appears', 'contacts appear')} twice in the file; the copy will be skipped.`,
    p.empty > 0 &&
      `${plural(p.empty, 'entry has', 'entries have')} no name, number or email and will be skipped.`,
  ].filter(Boolean) as string[];
  if (rows.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
      {rows.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}

function Warnings({ plan: { warnings: w } }: { plan: ImportPlan }) {
  const rows = [
    w.invalidEmails > 0 &&
      `${plural(w.invalidEmails, 'email address was', 'email addresses were')} not valid and will be left out.`,
    w.unusableBirthdays > 0 &&
      `${plural(w.unusableBirthdays, 'birthday has', 'birthdays have')} no year or are not real dates and will be left out.`,
    w.truncatedFields > 0 &&
      `${plural(w.truncatedFields, 'field is', 'fields are')} longer than allowed and will be shortened.`,
    w.tooManyValues > 0 &&
      `${plural(w.tooManyValues, 'number or email is', 'numbers or emails are')} beyond 20 on one contact and will be left out.`,
  ].filter(Boolean) as string[];
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <ul className="list-disc space-y-1 pl-5">
        {rows.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
