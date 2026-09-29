'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useMessages } from '@/i18n/client';
import { fmt } from '@/i18n/format';

import { onStartTour, tourDoneKey } from './tour-events';

/** Each step points at an element marked data-tour="…", when it is on screen. */
const STEPS = [
  { key: 'welcome' },
  { key: 'today', target: 'today' },
  { key: 'contacts', target: 'contacts' },
  { key: 'groups', target: 'groups' },
  { key: 'search', target: 'search' },
  { key: 'account', target: 'account' },
  { key: 'finish' },
] as const;

/** New accounts see the tour by themselves for their first two weeks. */
const FRESH_MS = 14 * 24 * 60 * 60 * 1000;
const CARD_MAX = 352;
const GAP = 14;
const PAD = 6;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The visible element for a step (phone bar or laptop sidebar), if any. */
function findTarget(name: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * The first-run tour (coach marks): a card that glides from one control to
 * the next — Today, Contacts, Groups, Search, your account — with a
 * spotlight on the control, an arrow pointing at it, Back / Next, and Skip.
 * It starts by itself once for a new account on this device, and again
 * from "Take the tour". Keyboard: → next, ← back, Esc skip.
 */
export function Tour({
  userId,
  createdAt,
  name,
}: {
  userId: string;
  createdAt?: string;
  name: string;
}) {
  const t = useMessages().tour;
  const pathname = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const primary = useRef<HTMLElement | null>(null);
  const setPrimary = (el: HTMLElement | null) => {
    primary.current = el;
  };

  // Starts by itself once, for a new account — never over the page that
  // shows a new recovery key, which must be read first.
  useEffect(() => {
    if (pathname === '/recovery-key') return;
    let done = false;
    try {
      done = localStorage.getItem(tourDoneKey(userId)) === '1';
    } catch {
      // Storage blocked: treat as seen rather than show it every time.
      done = true;
    }
    const fresh = !!createdAt && Date.now() - Date.parse(createdAt) < FRESH_MS;
    if (done || !fresh) return;
    const id = window.setTimeout(() => setStep(0), 700);
    return () => window.clearTimeout(id);
  }, [userId, createdAt, pathname]);

  useEffect(() => onStartTour(() => setStep(0)), []);

  const finish = useCallback(() => {
    setStep(null);
    try {
      localStorage.setItem(tourDoneKey(userId), '1');
    } catch {
      // Nothing to remember it in; it simply won't start by itself again.
    }
  }, [userId]);

  const current = step === null ? null : STEPS[step];
  const target = current && 'target' in current ? current.target : undefined;

  // Find and measure the control; follow it on resize and scroll.
  useEffect(() => {
    if (step === null) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setView({ w: window.innerWidth, h: window.innerHeight });
        const el = target ? findTarget(target) : null;
        if (!el) return setBox(null);
        const r = el.getBoundingClientRect();
        setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
    };
    const el = target ? findTarget(target) : null;
    el?.scrollIntoView({ block: 'nearest' });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, target]);

  // Keyboard, and focus on the main button at every step.
  useEffect(() => {
    if (step === null) return;
    primary.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' && step < STEPS.length - 1)
        setStep(step + 1);
      else if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, finish]);

  if (step === null || !current || view.w === 0) return null;

  const copy = t.steps[current.key];
  const last = step === STEPS.length - 1;
  const spot = target && box ? box : null;
  const width = Math.min(CARD_MAX, view.w - 32);

  // The card sits below the control when there is room, else above it,
  // and never leaves the screen; the arrow points at the control's middle.
  let place: React.CSSProperties;
  let arrow: { side: 'top' | 'bottom'; x: number } | null = null;
  if (spot) {
    const middle = spot.left + spot.width / 2;
    const left = Math.min(
      Math.max(middle - width / 2, 16),
      view.w - width - 16,
    );
    const below = spot.top + spot.height + 260 < view.h;
    place = below
      ? { top: spot.top + spot.height + PAD + GAP, left }
      : { bottom: view.h - spot.top + PAD + GAP, left };
    arrow = {
      side: below ? 'top' : 'bottom',
      x: Math.min(Math.max(middle - left, 24), width - 24),
    };
  } else {
    place = {
      top: '50%',
      left: (view.w - width) / 2,
      transform: 'translateY(-50%)',
    };
  }

  return (
    <div className="fixed inset-0 z-[60]" data-testid="tour">
      {spot ? (
        <div
          aria-hidden="true"
          className="tour-spot pointer-events-none fixed rounded-2xl"
          style={{
            top: spot.top - PAD,
            left: spot.left - PAD,
            width: spot.width + PAD * 2,
            height: spot.height + PAD * 2,
          }}
        />
      ) : (
        <div aria-hidden="true" className="tour-dim fixed inset-0" />
      )}
      <div
        key={step}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="tour-card fixed"
        style={{ ...place, width }}
      >
        {arrow && (
          <span
            aria-hidden="true"
            className={`tour-arrow ${arrow.side === 'top' ? 'tour-arrow-top' : 'tour-arrow-bottom'}`}
            style={{ left: arrow.x }}
          />
        )}
        <div className="space-y-2 p-5 pb-4">
          <p className="text-xs font-bold tracking-wider text-accent uppercase">
            {fmt(t.progress, { n: step + 1, total: STEPS.length })}
          </p>
          <h2
            id="tour-title"
            className="font-display text-xl font-semibold tracking-tight"
          >
            {fmt(copy.title, { name })}
          </h2>
          <p id="tour-body" className="text-[15px] leading-relaxed text-muted">
            {copy.body}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-accent' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 p-4 pt-4">
          {!last && (
            <button
              type="button"
              onClick={finish}
              className="rounded-lg px-2 py-2 text-sm font-semibold text-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              {t.skip}
            </button>
          )}
          <span className="flex-1" />
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              {t.back}
            </button>
          )}
          {last ? (
            <>
              <button
                type="button"
                onClick={finish}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                {t.later}
              </button>
              <Link
                ref={setPrimary}
                href="/contacts/import"
                onClick={finish}
                className="btn-primary rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t.importNow}
              </Link>
            </>
          ) : (
            <button
              ref={setPrimary}
              type="button"
              onClick={() => setStep(step + 1)}
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {step === 0 ? t.start : t.next}
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
