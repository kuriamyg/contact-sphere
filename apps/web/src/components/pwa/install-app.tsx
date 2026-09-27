'use client';

import { useEffect, useState } from 'react';

import { useMessages } from '@/i18n/client';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type State = 'unknown' | 'installed' | 'can-install' | 'ios' | 'manual';

/**
 * "Install on this phone". Android/Chrome offer a one-tap prompt; iPhone
 * needs Share → Add to Home Screen, which we explain.
 */
export function InstallApp() {
  const t = useMessages().install;
  const [state, setState] = useState<State>('unknown');
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // Decided after mount: the server cannot know the device.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(standalone ? 'installed' : ios ? 'ios' : 'manual');
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setState('can-install');
    };
    const onInstalled = () => setState('installed');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (state === 'unknown') return null;
  if (state === 'installed') {
    return (
      <p className="text-sm text-muted" role="status">
        {t.installed}
      </p>
    );
  }
  if (state === 'can-install' && prompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === 'accepted') setState('installed');
          setPrompt(null);
        }}
        className="inline-flex items-center gap-2 rounded-lg btn-primary px-4 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t.install}
      </button>
    );
  }
  return (
    <p className="text-sm text-muted">{state === 'ios' ? t.ios : t.other}</p>
  );
}
