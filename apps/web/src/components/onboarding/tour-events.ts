/** "Take the tour" anywhere in the app starts the tour mounted in the layout. */
const EVENT = 'cs:start-tour';

export function startTour(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function onStartTour(run: () => void): () => void {
  window.addEventListener(EVENT, run);
  return () => window.removeEventListener(EVENT, run);
}

/** Per account, on this device: finished or skipped. */
export const tourDoneKey = (userId: string) => `cs-tour-done:${userId}`;
