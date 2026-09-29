'use client';

import Link from 'next/link';
import { useRef, useState, useSyncExternalStore, useTransition } from 'react';

const noop = () => () => {};

import {
  type ImportPlan,
  previewImport,
  runImport,
} from '@/app/actions/import';
import {
  canReadPhoneContacts,
  PhoneContactsDenied,
  readPhoneContacts,
  toVcf,
} from '@/lib/phone-contacts';
import { FormMessage } from '@/components/auth/field';
import { Avatar } from '@/components/avatar';
import {
  AlertIcon,
  CheckIcon,
  ChevronRightIcon,
  FileIcon,
  PhoneIcon,
  ShieldIcon,
  UploadIcon,
} from '@/components/icons';
import {
  countCards,
  MAX_VCF_CHARS,
  stripBinaryProperties,
} from '@/lib/vcf-file';
import { useMessages } from '@/i18n/client';
import { fmt, plural } from '@/i18n/format';

const primary =
  'btn-primary inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60';
const secondary =
  'inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60';

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
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Known only in the browser; the server renders the file picker alone.
  const inApp = useSyncExternalStore(noop, canReadPhoneContacts, () => false);

  function reset() {
    setStage({ name: 'choose' });
    setError(undefined);
    if (input.current) input.current.value = '';
  }

  /** Shared by a file and "this phone": check, then show the preview. */
  async function preview(vcf: string, fileName: string) {
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
    else setStage({ name: 'preview', fileName, vcf, plan: res.plan });
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
      await preview(vcf, file.name);
    });
  }

  /** Android app only (ADR 0025): read the phone's own address book. */
  function onPhone() {
    setError(undefined);
    start(async () => {
      try {
        await preview(toVcf(await readPhoneContacts()), t.thisPhone);
      } catch (e) {
        setError(
          e instanceof PhoneContactsDenied ? t.phoneDenied : t.unreadable,
        );
      }
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

  const step = stage.name === 'choose' ? 0 : stage.name === 'preview' ? 1 : 2;
  const steps = [t.steps.choose, t.steps.check, t.steps.done];
  const progress = (
    <ol aria-label={t.stepsLabel} className="grid grid-cols-3 gap-2 text-xs">
      {steps.map((label, i) => (
        <li
          key={label}
          aria-current={i === step ? 'step' : undefined}
          className="space-y-1.5"
        >
          <span
            aria-hidden="true"
            className={`block h-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`}
          />
          <span
            className={
              i === step ? 'font-semibold text-foreground' : 'text-muted'
            }
          >
            {i + 1}. {label}
          </span>
        </li>
      ))}
    </ol>
  );

  if (stage.name === 'done') {
    const p = stage.plan;
    return (
      <div className="space-y-5">
        {progress}
        <div
          role="status"
          className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-8 text-center"
        >
          <span className="btn-primary inline-flex size-14 items-center justify-center rounded-full">
            <CheckIcon className="size-7" />
          </span>
          <p className="font-display text-xl font-semibold">
            {p.toImport > 0 ? plural(p.toImport, t.doneTitle) : t.doneNothing}
          </p>
          <p className="text-sm text-muted">
            {p.toImport > 0 ? plural(p.toImport, t.imported) : t.nothingNewDone}
          </p>
        </div>
        <Skipped plan={p} />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link href="/contacts" className={primary}>
            {t.viewContacts}
          </Link>
          <Link href="/contacts/duplicates" className={secondary}>
            {t.checkDuplicates}
          </Link>
        </div>
        <button
          type="button"
          onClick={reset}
          className="w-full text-sm font-medium text-muted underline-offset-4 hover:underline"
        >
          {t.another}
        </button>
      </div>
    );
  }

  if (stage.name === 'preview') {
    const p = stage.plan;
    const skipped = p.alreadySaved + p.repeatedInFile + p.empty;
    return (
      <div className="space-y-5">
        {progress}
        <FormMessage error={error} />
        <div className="card flex items-center gap-3 rounded-2xl p-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <FileIcon />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {stage.fileName}
            </span>
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-2.5">
          {(
            [
              [t.stats.inFile, p.cards, ''],
              [t.stats.add, p.toImport, 'text-accent'],
              [t.stats.skip, skipped, ''],
            ] as const
          ).map(([label, n, tone]) => (
            <div
              key={label}
              className="card flex flex-col-reverse gap-0.5 rounded-2xl p-3"
            >
              <dt className="text-xs text-muted">{label}</dt>
              <dd className={`font-display text-2xl font-semibold ${tone}`}>
                {n.toLocaleString('en-KE')}
              </dd>
            </div>
          ))}
        </dl>
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
          <details className="card group rounded-2xl">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
              {t.seeWho}
              <ChevronRightIcon className="size-4 text-muted transition-transform group-open:rotate-90" />
            </summary>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto border-t border-border text-sm">
              {p.preview.map((c, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2">
                  <Avatar
                    name={c.displayName}
                    colourKey={`${i}${c.displayName}`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {c.displayName}
                  </span>
                  {c.phone && (
                    <span className="shrink-0 text-muted tabular-nums">
                      {c.phone}
                    </span>
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
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
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
              className={`${primary} sm:ml-auto sm:min-w-56`}
            >
              {pending ? t.importing : plural(p.toImport, t.importN)}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {progress}
      <FormMessage error={error} />
      {inApp && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onPhone}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl btn-primary px-4 py-4 font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <PhoneIcon className="size-5" />
            {pending ? t.reading : t.fromPhone}
          </button>
          <p className="text-center text-sm text-muted">{t.fromPhoneHint}</p>
        </div>
      )}
      <label
        htmlFor="vcf"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        className={`card flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-accent hover:bg-surface-hover ${
          dragging ? 'border-accent bg-accent-soft' : 'border-border'
        }`}
      >
        <span
          className={`btn-primary inline-flex size-14 items-center justify-center rounded-2xl ${pending ? 'animate-pulse' : ''}`}
        >
          <UploadIcon className="size-6" />
        </span>
        <span className="font-display text-lg font-semibold">
          {pending ? t.reading : t.choose}
        </span>
        <span className="text-sm text-muted">{t.dropHint}</span>
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
      <p className="flex items-start gap-2 text-sm text-muted">
        <ShieldIcon className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>
          {t.privacy} {t.nothingSaved}
        </span>
      </p>
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
    <section className="card space-y-2 rounded-2xl p-4 text-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <CheckIcon className="size-4 text-accent" />
        {t.skippedTitle}
      </h2>
      <ul className="space-y-1 pl-6 text-muted">
        {rows.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
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
    <section className="space-y-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-900 dark:text-amber-100">
      <h2 className="flex items-center gap-2 font-semibold">
        <AlertIcon className="size-4" />
        {t.warningsTitle}
      </h2>
      <ul className="space-y-1 pl-6">
        {rows.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
  );
}
