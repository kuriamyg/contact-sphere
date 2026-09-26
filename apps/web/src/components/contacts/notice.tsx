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
  merged: {
    success:
      'Merged. The other contact is in the trash; you can undo below for 30 days.',
  },
  merge_undone: {
    success: 'Merge undone. Both contacts are back as they were.',
  },
  dismissed: { success: 'Got it — that pair will not be suggested again.' },
  undo_failed: {
    error:
      'That merge can no longer be undone (the other contact was restored or deleted).',
  },
  tag_renamed: { success: 'Renamed on every contact that had it.' },
  tag_deleted: {
    success: 'Removed from every contact. The contacts are still here.',
  },
  search_saved: { success: 'Search saved. Tap it any time above your list.' },
  search_deleted: { success: 'Saved search deleted.' },
  search_exists: { error: 'You already have a saved search with that name.' },
  search_full: {
    error: 'You can keep up to 50 saved searches. Delete one first.',
  },
  group_created: { success: 'Group created. Now add its members.' },
  group_saved: { success: 'Group saved.' },
  group_deleted: {
    success: 'Group deleted. Its contacts are still in your contacts.',
  },
  group_exists: { error: 'You already have a group with that name.' },
  members_added: { success: 'Added to the group.' },
  none_picked: { error: 'Tick at least one contact to add.' },
  member_removed: {
    success: 'Removed from the group. The contact is still saved.',
  },
  role_saved: { success: 'Role saved.' },
  added_to_group: { success: 'Added to the group.' },
  failed: { error: 'That did not work. Nothing was changed — try again.' },
};

export function Notice({ code }: { code?: string | string[] }) {
  const n = typeof code === 'string' ? NOTICES[code] : undefined;
  return n ? <FormMessage {...n} /> : null;
}
