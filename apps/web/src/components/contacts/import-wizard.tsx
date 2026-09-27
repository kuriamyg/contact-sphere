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
import { useMessages } from '@/i18n/client';
import { fmt, plural } from '@/i18n/format';

const primary =
  'rounded-lg btn-primary px-4 py-2.5 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60';
const secondary =
  'rounded-lg border border-border px-4 py-2.5 font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none';

type Stage =
  | { name: 'choose' }
  | { name: 'preview'; fileName: string; vcf: string; plan: ImportPlan }
  | { name: 'done'; plan: ImportPlan };

/**
 * Choose a .vcf → see what would happen → import. The file is read in the
 * browser; photos are removed before anything is uploaded.
 */
export function ImportWizard() {
  const t = useMessages().importWizard;
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
        setError(t.unreadable);
        return;
      }
      if (countCards(vcf) === 0) {
        setError(t.noCards);
        return;
      }
      if (vcf.length > MAX_VCF_CHARS) {
        setError(t.tooLarge);
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
            p.toImport > 0 ? plural(p.toImport, t.imported) : t.nothingNewDone
          }
        />
        <Skipped plan={p} />
        <div className="flex flex-wrap gap-3">
          <Link href="/contacts" className={primary}>
            {t.viewContacts}
          </Link>
          <button type="button" onClick={reset} className={secondary}>
            {t.another}
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
          <p className="text-muted">{plural(p.cards, t.inFile)}</p>
        </div>
        <p className="text-lg">
          {p.toImport > 0 ? (
            <>
              <strong>{plural(p.toImport, t.willAdd)}</strong> {t.willAddSuffix}
            </>
          ) : (
            t.nothingNew
          )}
        </p>
        <Skipped plan={p} />
        <Warnings plan={p} />
        {p.preview.length > 0 && (
          <details className="rounded-xl card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              {t.seeWho}
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
                  {fmt(t.andMore, { n: p.toImport - p.preview.length })}
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
            {t.chooseAnother}
          </button>
          {p.toImport > 0 && (
            <button
              type="button"
              onClick={() => onImport(stage.vcf)}
              disabled={pending}
              aria-busy={pending}
              className={`${primary} sm:ml-auto`}
            >
              {pending ? t.importing : plural(p.toImport, t.importN)}
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
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center bg-surface hover:bg-surface-hover focus-within:ring-2 focus-within:ring-foreground/40"
      >
        <span className="font-medium">{pending ? t.reading : t.choose}</span>
        <span className="text-sm text-muted">{t.nothingSaved}</span>
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
  const t = useMessages().importWizard;
  const rows = [
    p.alreadySaved > 0 && plural(p.alreadySaved, t.alreadySaved),
    p.repeatedInFile > 0 && plural(p.repeatedInFile, t.repeated),
    p.empty > 0 && plural(p.empty, t.empty),
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
  const t = useMessages().importWizard;
  const rows = [
    w.invalidEmails > 0 && plural(w.invalidEmails, t.invalidEmails),
    w.unusableBirthdays > 0 && plural(w.unusableBirthdays, t.badBirthdays),
    w.truncatedFields > 0 && plural(w.truncatedFields, t.truncated),
    w.tooManyValues > 0 && plural(w.tooManyValues, t.tooMany),
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
