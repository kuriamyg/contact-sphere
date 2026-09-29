'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  fetchBackupArchive,
  previewRestore,
  type RestorePlan,
  runRestore,
} from '@/app/actions/backup';
import { Field, FormMessage, SubmitButton } from '@/components/auth/field';
import { useMessages } from '@/i18n/client';
import { fmt, plural } from '@/i18n/format';
import {
  BackupFileError,
  backupFileName,
  decryptBackup,
  encryptBackup,
  MIN_PASSPHRASE,
} from '@/lib/backup-crypto';

const secondary =
  'rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60';

/** Files bigger than this are not our backups (5,000 contacts is ~3 MB). */
const MAX_FILE = 20 * 1024 * 1024;

/**
 * Make an encrypted backup file, or restore from one (ADR 0009, C2). All
 * encryption happens here in the browser: the server sends the owner's
 * data and receives it back decrypted, but never sees the passphrase or
 * the file.
 */
export function BackupSection({
  lastBackup,
  locale,
}: {
  /** Already formatted, or null for "never". */
  lastBackup: string | null;
  locale: string;
}) {
  const t = useMessages().backup;
  return (
    <div className="space-y-6">
      <MakeBackup t={t} lastBackup={lastBackup} />
      <div className="border-t border-border pt-5">
        <Restore t={t} locale={locale} />
      </div>
    </div>
  );
}

type T = ReturnType<typeof useMessages>['backup'];

function MakeBackup({ t, lastBackup }: { t: T; lastBackup: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();

  async function make(form: FormData) {
    setError(undefined);
    setSaved(undefined);
    const pass = String(form.get('passphrase') ?? '');
    if (pass.length < MIN_PASSPHRASE) return setError(t.tooShort);
    if (pass !== String(form.get('confirmPassphrase') ?? '')) {
      return setError(t.differ);
    }
    if (form.get('understand') !== 'on') return setError(t.mustAgree);
    setBusy(true);
    try {
      const res = await fetchBackupArchive();
      if (res.error !== undefined) return setError(res.error);
      const file = await encryptBackup(res.data, pass);
      const name = backupFileName();
      const url = URL.createObjectURL(
        new Blob([file], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setSaved(fmt(t.saved, { file: name }));
      router.refresh();
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={make} className="space-y-4" noValidate>
      <p className="text-sm text-muted">{t.intro}</p>
      <p className="text-sm font-medium" data-testid="last-backup">
        {lastBackup ? fmt(t.last, { date: lastBackup }) : t.never}
      </p>
      <FormMessage error={error} success={saved} />
      <Field
        label={t.passphrase}
        name="passphrase"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSPHRASE}
        hint={t.passphraseHint}
        required
      />
      <Field
        label={t.confirm}
        name="confirmPassphrase"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSPHRASE}
        required
      />
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="understand"
          className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
        />
        <span>{t.understand}</span>
      </label>
      <SubmitButton spinner pending={busy} pendingText={t.working}>
        {t.download}
      </SubmitButton>
    </form>
  );
}

function Restore({ t, locale }: { t: T; locale: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [opened, setOpened] = useState<{
    plain: string;
    createdAt: string;
    plan: RestorePlan;
  }>();
  const [done, setDone] = useState<string>();

  async function open(form: FormData) {
    setError(undefined);
    setDone(undefined);
    const file = form.get('file');
    const pass = String(form.get('restorePassphrase') ?? '');
    if (!(file instanceof File) || file.size === 0) {
      return setError(t.notBackup);
    }
    if (file.size > MAX_FILE) return setError(t.notBackup);
    setBusy(true);
    try {
      const { plain, createdAt } = await decryptBackup(await file.text(), pass);
      const res = await previewRestore(plain);
      if (res.error !== undefined) return setError(res.error);
      setOpened({ plain, createdAt, plan: res.data });
    } catch (e) {
      setError(
        e instanceof BackupFileError
          ? e.problem === 'wrong-passphrase'
            ? t.wrongPass
            : e.problem === 'newer'
              ? t.newer
              : t.notBackup
          : t.notBackup,
      );
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!opened) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await runRestore(opened.plain);
      if (res.error !== undefined) return setError(res.error);
      setDone(plural(res.data.contacts.toAdd, t.done));
      setOpened(undefined);
    } finally {
      setBusy(false);
    }
  }

  if (opened) {
    const p = opened.plan;
    const nothing =
      p.contacts.toAdd === 0 &&
      p.groups.toAdd === 0 &&
      p.groups.toUpdate === 0 &&
      p.followUps === 0 &&
      !p.relationships;
    const date = new Date(opened.createdAt).toLocaleDateString(
      locale === 'sw' ? 'sw-KE' : 'en-KE',
      { day: 'numeric', month: 'short', year: 'numeric' },
    );
    const lines = [
      p.contacts.toAdd > 0 && plural(p.contacts.toAdd, t.contactsAdd),
      p.contacts.alreadySaved > 0 &&
        plural(p.contacts.alreadySaved, t.alreadySaved),
      p.groups.toAdd > 0 && plural(p.groups.toAdd, t.groupsAdd),
      p.groups.toUpdate > 0 && plural(p.groups.toUpdate, t.groupsUpdate),
      p.followUps > 0 && plural(p.followUps, t.followUps),
      !!p.relationships && plural(p.relationships, t.relationships),
      p.groups.overLimit > 0 && plural(p.groups.overLimit, t.overLimit),
      p.unreadable > 0 && plural(p.unreadable, t.unreadable),
    ].filter((l): l is string => !!l);
    return (
      <div className="space-y-4" data-testid="restore-preview">
        <h3 className="font-semibold">{fmt(t.previewTitle, { date })}</h3>
        <FormMessage error={error} />
        {nothing ? (
          <p className="text-sm text-muted">{t.nothing}</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {!nothing && (
            <button
              type="button"
              onClick={restore}
              disabled={busy}
              className="btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-60"
            >
              {busy ? t.restoring : t.restore}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpened(undefined)}
            disabled={busy}
            className={secondary}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={open} className="space-y-4" noValidate>
      <h3 className="font-semibold">{t.restoreTitle}</h3>
      <p className="text-sm text-muted">{t.restoreIntro}</p>
      <FormMessage error={error} success={done} />
      <div className="space-y-1.5">
        <label htmlFor="backup-file" className="block text-sm font-medium">
          {t.file}
        </label>
        <input
          id="backup-file"
          name="file"
          type="file"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-2 file:font-semibold"
        />
      </div>
      <Field
        label={t.passphrase}
        name="restorePassphrase"
        type="password"
        autoComplete="off"
        required
      />
      <button type="submit" disabled={busy} className={secondary}>
        {busy ? t.opening : t.open}
      </button>
    </form>
  );
}
