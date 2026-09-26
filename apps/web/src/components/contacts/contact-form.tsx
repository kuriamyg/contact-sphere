'use client';

import Link from 'next/link';
import { useActionState, useId, useState } from 'react';

import type { ContactFormState } from '@/app/actions/contacts';
import { Field, FormMessage, SubmitButton } from '@/components/auth/field';
import type { ContactFormValues } from '@/lib/contact-form';

const MAX_ROWS = 20;
const inputClass =
  'block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/40';
const smallButton =
  'rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-50';

type Row = { key: number; value: string; label: string };

/**
 * A list of phone numbers or emails: one value and an optional label per
 * row. Rows are submitted as parallel lists (e.g. phoneRaw / phoneLabel);
 * the first row is the primary one.
 */
function RowList({
  legend,
  valueName,
  labelName,
  valueLabel,
  initial,
  inputType,
  inputMode,
  autoComplete,
  addText,
}: {
  legend: string;
  valueName: string;
  labelName: string;
  valueLabel: string;
  initial: { value: string; label: string }[];
  inputType: 'tel' | 'email';
  inputMode: 'tel' | 'email';
  autoComplete: string;
  addText: string;
}) {
  const uid = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r, key) => ({ key, ...r })),
  );
  const [next, setNext] = useState(initial.length);

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{legend}</legend>
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-[2_1_12rem] space-y-1.5">
            <label htmlFor={`${uid}-v${row.key}`} className="sr-only">
              {valueLabel} {i + 1}
              {i === 0 ? ' (primary)' : ''}
            </label>
            <input
              id={`${uid}-v${row.key}`}
              name={valueName}
              type={inputType}
              inputMode={inputMode}
              autoComplete={autoComplete}
              defaultValue={row.value}
              placeholder={valueLabel}
              className={inputClass}
            />
          </div>
          <div className="min-w-0 flex-[1_1_7rem] space-y-1.5">
            <label htmlFor={`${uid}-l${row.key}`} className="sr-only">
              Label for {valueLabel.toLowerCase()} {i + 1}
            </label>
            <input
              id={`${uid}-l${row.key}`}
              name={labelName}
              defaultValue={row.label}
              placeholder="Label (e.g. mobile)"
              maxLength={40}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            className={smallButton}
            aria-label={`Remove ${valueLabel.toLowerCase()} ${i + 1}`}
            onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={smallButton}
        disabled={rows.length >= MAX_ROWS}
        onClick={() => {
          setRows([...rows, { key: next, value: '', label: '' }]);
          setNext(next + 1);
        }}
      >
        {addText}
      </button>
    </fieldset>
  );
}

function Fields({ v }: { v: ContactFormValues }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          name="givenName"
          autoComplete="off"
          maxLength={100}
          defaultValue={v.givenName}
        />
        <Field
          label="Last name"
          name="familyName"
          autoComplete="off"
          maxLength={100}
          defaultValue={v.familyName}
        />
      </div>
      <Field
        label="Display name (optional)"
        name="displayName"
        autoComplete="off"
        maxLength={200}
        hint="How the contact appears in lists. Leave blank to use the name."
        defaultValue={v.displayName}
      />
      <Field
        label="Nickname"
        name="nickname"
        autoComplete="off"
        maxLength={100}
        defaultValue={v.nickname}
      />
      <RowList
        legend="Phone numbers"
        valueName="phoneRaw"
        labelName="phoneLabel"
        valueLabel="Phone number"
        initial={v.phones.map((p) => ({ value: p.raw, label: p.label }))}
        inputType="tel"
        inputMode="tel"
        autoComplete="off"
        addText="Add a number"
      />
      <RowList
        legend="Email addresses"
        valueName="emailAddress"
        labelName="emailLabel"
        valueLabel="Email address"
        initial={v.emails.map((e) => ({ value: e.address, label: e.label }))}
        inputType="email"
        inputMode="email"
        autoComplete="off"
        addText="Add an email"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Organisation"
          name="organization"
          autoComplete="off"
          maxLength={200}
          defaultValue={v.organization}
        />
        <Field
          label="Job title"
          name="jobTitle"
          autoComplete="off"
          maxLength={200}
          defaultValue={v.jobTitle}
        />
      </div>
      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">
          Who they are to you
        </legend>
        <Field
          label="Skills and services"
          name="tags"
          autoComplete="off"
          maxLength={900}
          hint="Separate with commas, e.g. plumber, boda boda, lawyer. You can search by these."
          defaultValue={v.tags}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Area"
            name="area"
            autoComplete="off"
            maxLength={100}
            hint="Estate, town or stage"
            defaultValue={v.area}
          />
          <Field
            label="Met through"
            name="metThrough"
            autoComplete="off"
            maxLength={200}
            hint="e.g. church, chama, work"
            defaultValue={v.metThrough}
          />
        </div>
      </fieldset>
      <Field
        label="Birthday"
        name="birthday"
        type="date"
        min="1900-01-01"
        defaultValue={v.birthday}
      />
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={10_000}
          defaultValue={v.notes}
          className={inputClass}
        />
      </div>
    </>
  );
}

/**
 * Create or edit a contact. When the server refuses the form, it comes back
 * with exactly what was typed (the `attempt` key re-mounts the fields with
 * those values), so nothing has to be entered twice.
 */
export function ContactForm({
  action,
  initial,
  contactId,
  submitText,
  cancelHref,
}: {
  action: (s: ContactFormState, f: FormData) => Promise<ContactFormState>;
  initial: ContactFormValues;
  contactId?: string;
  submitText: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initial;
  return (
    <form
      key={state.attempt ?? 0}
      action={formAction}
      className="space-y-6"
      noValidate
    >
      <FormMessage error={state.error} />
      {contactId && <input type="hidden" name="id" value={contactId} />}
      <Fields v={values} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Link
          href={cancelHref}
          className="rounded-lg px-4 py-2.5 text-center font-medium text-muted hover:underline"
        >
          Cancel
        </Link>
        <div className="sm:ml-auto sm:w-48">
          <SubmitButton pending={pending} pendingText="Saving…">
            {submitText}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
