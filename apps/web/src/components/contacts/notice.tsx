import { FormMessage } from '@/components/auth/field';

/**
 * One-line confirmations after an action, chosen by a fixed code in the URL
 * (?done=trashed). Only known codes show anything, so the URL cannot be
 * used to put arbitrary text on the page.
 */
const NOTICES: Record<string, { success?: string; error?: string }> = {
  created: { success: 'Contact saved.' },
  saved: { success: 'Changes saved.' },
  archived: { success: 'Archived. It is hidden from your list but kept.' },
  unarchived: { success: 'Back in your contacts.' },
  trashed: {
    success: 'Moved to the trash. You can restore it for 30 days.',
  },
  restored: { success: 'Restored.' },
  deleted: { success: 'Deleted for good.' },
  emptied: { success: 'Trash emptied. Those contacts are deleted for good.' },
  failed: { error: 'That did not work. Nothing was changed — try again.' },
};

export function Notice({ code }: { code?: string | string[] }) {
  const n = typeof code === 'string' ? NOTICES[code] : undefined;
  return n ? <FormMessage {...n} /> : null;
}
