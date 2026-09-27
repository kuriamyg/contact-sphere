'use client';

import { useEffect, useState } from 'react';

import {
  removePushDevice,
  savePushDevice,
  sendTestPush,
} from '@/app/actions/reach';
import { useMessages } from '@/i18n/client';

type State =
  | 'checking'
  | 'unsupported'
  | 'ios-install'
  | 'blocked'
  | 'off'
  | 'on'
  | 'busy';

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration('/')) ?? null;
}

const button =
  'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium bg-surface hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60';

/**
 * "Morning reminders on this phone" (Web Push). Free for the owner: no SMS,
 * no data beyond a tiny message. The notification shows counts only.
 */
export function PhoneReminders({ publicKey }: { publicKey: string }) {
  const t = useMessages().reminders;
  const [state, setState] = useState<State>('checking');
  const [note, setNote] = useState('');

  useEffect(() => {
    let live = true;
    void (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      let next: State;
      if (!('PushManager' in window) || !('Notification' in window)) {
        next = ios && !standalone ? 'ios-install' : 'unsupported';
      } else if (Notification.permission === 'denied') {
        next = 'blocked';
      } else {
        const reg = await registration();
        const sub = await reg?.pushManager.getSubscription();
        next = !reg ? 'unsupported' : sub ? 'on' : 'off';
      }
      if (live) setState(next);
    })();
    return () => {
      live = false;
    };
  }, []);

  async function turnOn() {
    setState('busy');
    setNote('');
    try {
      const reg = await registration();
      if (!reg) return setState('unsupported');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return setState(permission === 'denied' ? 'blocked' : 'off');
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      const json = sub.toJSON();
      const saved = await savePushDevice({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      });
      if (!saved) {
        await sub.unsubscribe();
        setNote(t.failed);
        return setState('off');
      }
      setState('on');
    } catch {
      setNote(t.browserFailed);
      setState('off');
    }
  }

  async function turnOff() {
    setState('busy');
    setNote('');
    const sub = await (await registration())?.pushManager.getSubscription();
    if (sub) {
      await removePushDevice(sub.endpoint);
      await sub.unsubscribe().catch(() => false);
    }
    setState('off');
  }

  async function test() {
    setNote('');
    const sent = await sendTestPush();
    setNote(sent ? t.testSent : t.testFailed);
  }

  if (state === 'checking') return null;
  return (
    <div className="space-y-2">
      {state === 'unsupported' && (
        <p className="text-sm text-muted">{t.unsupported}</p>
      )}
      {state === 'ios-install' && (
        <p className="text-sm text-muted">{t.iosInstall}</p>
      )}
      {state === 'blocked' && <p className="text-sm text-muted">{t.blocked}</p>}
      {(state === 'off' || state === 'busy') && (
        <button
          type="button"
          onClick={() => void turnOn()}
          disabled={state === 'busy'}
          className={button}
        >
          {t.turnOn}
        </button>
      )}
      {state === 'on' && (
        <div className="flex flex-wrap gap-2">
          <p className="w-full text-sm" role="status">
            {t.onNow}
          </p>
          <button type="button" onClick={() => void test()} className={button}>
            {t.test}
          </button>
          <button
            type="button"
            onClick={() => void turnOff()}
            className={button}
          >
            {t.turnOff}
          </button>
        </div>
      )}
      {note && (
        <p className="text-sm text-muted" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
