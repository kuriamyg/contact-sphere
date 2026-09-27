import { section } from '../section';

type Notice = { success?: string; error?: string };

/** One-line confirmations chosen by a fixed code in the URL (?done=…). */
export const notices = section<Record<string, Notice>>(
  {
    created: { success: 'Contact saved.' },
    saved: { success: 'Changes saved.' },
    archived: { success: 'Archived. It is hidden from your list but kept.' },
    unarchived: { success: 'Back in your contacts.' },
    trashed: { success: 'Moved to the trash. You can restore it for 30 days.' },
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
    contacted: { success: 'Noted — you were in touch today.' },
    cadence_saved: { success: 'Keep-in-touch reminder saved.' },
    follow_up_added: {
      success: 'Follow-up added. It shows on Today when due.',
    },
    follow_up_invalid: { error: 'Give the follow-up a real date and a note.' },
    follow_up_done: { success: 'Follow-up done.' },
    follow_up_deleted: { success: 'Follow-up deleted.' },
    failed: { error: 'That did not work. Nothing was changed — try again.' },
  },
  {
    created: { success: 'Anwani imehifadhiwa.' },
    saved: { success: 'Mabadiliko yamehifadhiwa.' },
    archived: {
      success:
        'Imewekwa kando. Haionekani kwenye orodha yako lakini imehifadhiwa.',
    },
    unarchived: { success: 'Imerudi kwenye anwani zako.' },
    trashed: {
      success: 'Imepelekwa kwenye tupio. Unaweza kuirejesha ndani ya siku 30.',
    },
    restored: { success: 'Imerejeshwa.' },
    deleted: { success: 'Imefutwa kabisa.' },
    emptied: { success: 'Tupio limesafishwa. Anwani hizo zimefutwa kabisa.' },
    merged: {
      success:
        'Zimeunganishwa. Anwani nyingine iko kwenye tupio; unaweza kutendua hapa chini ndani ya siku 30.',
    },
    merge_undone: {
      success:
        'Muunganiko umetenduliwa. Anwani zote mbili zimerudi kama zilivyokuwa.',
    },
    dismissed: { success: 'Sawa — jozi hiyo haitapendekezwa tena.' },
    undo_failed: {
      error:
        'Muunganiko huo hauwezi kutenduliwa tena (anwani nyingine ilirejeshwa au kufutwa).',
    },
    tag_renamed: {
      success: 'Jina limebadilishwa kwa kila anwani iliyokuwa nalo.',
    },
    tag_deleted: {
      success: 'Imeondolewa kwenye kila anwani. Anwani bado zipo.',
    },
    search_saved: {
      success:
        'Utafutaji umehifadhiwa. Uguse wakati wowote juu ya orodha yako.',
    },
    search_deleted: { success: 'Utafutaji uliohifadhiwa umefutwa.' },
    search_exists: {
      error: 'Tayari una utafutaji uliohifadhiwa wenye jina hilo.',
    },
    search_full: {
      error: 'Unaweza kuhifadhi hadi utafutaji 50. Futa mmoja kwanza.',
    },
    group_created: {
      success: 'Kikundi kimeundwa. Sasa ongeza wanachama wake.',
    },
    group_saved: { success: 'Kikundi kimehifadhiwa.' },
    group_deleted: {
      success: 'Kikundi kimefutwa. Anwani zake bado ziko kwenye anwani zako.',
    },
    group_exists: { error: 'Tayari una kikundi chenye jina hilo.' },
    members_added: { success: 'Wameongezwa kwenye kikundi.' },
    none_picked: { error: 'Weka alama angalau kwa anwani moja ya kuongeza.' },
    member_removed: {
      success: 'Ameondolewa kwenye kikundi. Anwani bado imehifadhiwa.',
    },
    role_saved: { success: 'Jukumu limehifadhiwa.' },
    added_to_group: { success: 'Ameongezwa kwenye kikundi.' },
    contacted: { success: 'Imeandikwa — mliwasiliana leo.' },
    cadence_saved: { success: 'Kikumbusho cha mawasiliano kimehifadhiwa.' },
    follow_up_added: {
      success: 'Ufuatiliaji umeongezwa. Utaonekana kwenye Leo ukifika wakati.',
    },
    follow_up_invalid: {
      error: 'Ipe ufuatiliaji tarehe halisi na maelezo.',
    },
    follow_up_done: { success: 'Ufuatiliaji umekamilika.' },
    follow_up_deleted: { success: 'Ufuatiliaji umefutwa.' },
    failed: {
      error: 'Hilo halikufanikiwa. Hakuna kilichobadilishwa — jaribu tena.',
    },
  },
);
