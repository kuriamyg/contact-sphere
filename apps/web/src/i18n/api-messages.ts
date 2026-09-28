import type { Locale } from './locales';

/**
 * The API writes its user-facing messages in English. For Kiswahili the
 * web server swaps each known one for its translation; an unknown message
 * is shown as it came (still useful, never empty).
 */
const EXACT: Record<string, string> = {
  'Those sign-in details are not right.': 'Maelezo hayo ya kuingia si sahihi.',
  'Enter your email or phone number.':
    'Weka barua pepe au nambari yako ya simu.',
  'Enter a Kenyan mobile number, like 0712 345 678.':
    'Weka nambari ya simu ya Kenya, kama 0712 345 678.',
  'Too many codes for this number today. Try again tomorrow.':
    'Misimbo mingi mno kwa nambari hii leo. Jaribu tena kesho.',
  'Wait a minute before asking for another code.':
    'Subiri dakika moja kabla ya kuomba msimbo mwingine.',
  'That code has expired. Ask for a new one.':
    'Msimbo huo umeisha muda. Omba mpya.',
  'This number already has an account. Sign in instead.':
    'Nambari hii tayari ina akaunti. Ingia badala yake.',
  'Could not send the code just now. Try again in a minute.':
    'Imeshindikana kutuma msimbo sasa hivi. Jaribu tena baada ya dakika moja.',
  'Add an email address to your account first.':
    'Ongeza anwani ya barua pepe kwenye akaunti yako kwanza.',
  'Too many failed attempts for this account. Try again in 15 minutes.':
    'Majaribio mengi yameshindwa kwa akaunti hii. Jaribu tena baada ya dakika 15.',
  'That sign-in has expired. Enter your email and password again.':
    'Muda wa kuingia huko umeisha. Weka barua pepe na nenosiri lako tena.',
  'That code is not right.': 'Msimbo huo si sahihi.',
  'That code is not right. Check the time on your phone and try the newest code.':
    'Msimbo huo si sahihi. Angalia saa ya simu yako ujaribu msimbo mpya zaidi.',
  'Invalid setup token.': 'Tokeni ya kuanzisha si sahihi.',
  'Setup has already been completed.': 'Kuanzisha kumeshakamilika.',
  'Your current password is not correct.': 'Nenosiri lako la sasa si sahihi.',
  'Your password is not correct.': 'Nenosiri lako si sahihi.',
  'Choose a password different from your current one.':
    'Chagua nenosiri tofauti na la sasa.',
  'This password has appeared in known data breaches, so attackers try it first. Choose a different one.':
    'Nenosiri hili limeonekana katika uvujaji wa data unaojulikana, kwa hiyo wavamizi hulijaribu kwanza. Chagua jingine.',
  'Use “Sign out” to leave this device.':
    'Tumia “Toka” kuondoka kwenye kifaa hiki.',
  'That device is already signed out.': 'Kifaa hicho kimeshatolewa.',
  'Enter a code from your authenticator app.':
    'Weka msimbo kutoka programu yako ya uthibitishaji.',
  'Start two-factor setup first.':
    'Anza kuweka uthibitisho wa hatua mbili kwanza.',
  'Two-factor is already on.': 'Uthibitisho wa hatua mbili tayari umewashwa.',
  'Two-factor is not on.': 'Uthibitisho wa hatua mbili haujawashwa.',
  'Give the contact a name, organisation, phone number or email.':
    'Ipe anwani jina, shirika, nambari ya simu au barua pepe.',
  'Contact not found.': 'Anwani haikupatikana.',
  'Restore the contact from the trash first.':
    'Rejesha anwani kutoka kwenye tupio kwanza.',
  'Restore both contacts from the trash first.':
    'Rejesha anwani zote mbili kutoka kwenye tupio kwanza.',
  'Restore the kept contact from the trash first.':
    'Rejesha anwani iliyobaki kutoka kwenye tupio kwanza.',
  'Move the contact to the trash before deleting it for good.':
    'Peleka anwani kwenye tupio kabla ya kuifuta kabisa.',
  'Choose two different contacts.': 'Chagua anwani mbili tofauti.',
  'That merge no longer exists.': 'Muunganiko huo haupo tena.',
  'That merge was already undone.': 'Muunganiko huo ulishatenduliwa.',
  'The merged contact was restored from the trash, so this merge can no longer be undone.':
    'Anwani iliyounganishwa ilirejeshwa kutoka kwenye tupio, kwa hiyo muunganiko huu hauwezi kutenduliwa tena.',
  'No contacts found. Choose a .vcf (vCard) file exported from your phone or address book.':
    'Hakuna anwani zilizopatikana. Chagua faili ya .vcf (vCard) iliyotolewa kutoka kwenye simu yako au kitabu cha anwani.',
  'A saved search has that name already.':
    'Tayari kuna utafutaji uliohifadhiwa wenye jina hilo.',
  'Search for something before saving it.': 'Tafuta kitu kabla ya kukihifadhi.',
  'Saved search not found.': 'Utafutaji uliohifadhiwa haukupatikana.',
  'Give a tag name.': 'Weka jina la lebo.',
  'Give both tag names.': 'Weka majina yote mawili ya lebo.',
  'The names are the same.': 'Majina ni sawa.',
  'No such tag.': 'Hakuna lebo hiyo.',
  'Give the group a name.': 'Kipe kikundi jina.',
  'Group not found.': 'Kikundi hakikupatikana.',
  'You already have a group with that name.':
    'Tayari una kikundi chenye jina hilo.',
  'Not a member of that group.': 'Si mwanachama wa kikundi hicho.',
  'Some of those contacts do not exist.': 'Baadhi ya anwani hizo hazipo.',
  'Follow-up not found.': 'Ufuatiliaji haukupatikana.',
  'birthday must be a real date between 1900 and today':
    'siku ya kuzaliwa lazima iwe tarehe halisi kati ya 1900 na leo',
  'Reminders on the phone are not set up.':
    'Vikumbusho kwenye simu havijawekwa.',
  'No one in this group has a Kenyan mobile number.':
    'Hakuna mtu katika kikundi hiki mwenye nambari ya simu ya Kenya.',
  'Sending through Contact Sphere is not available yet. Text from your phone instead.':
    'Kutuma kupitia Contact Sphere bado hakupatikani. Tuma kutoka kwenye simu yako badala yake.',
};

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [
    /^A group can have up to (\d+) members\.$/,
    (m) => `Kikundi kinaweza kuwa na hadi wanachama ${m[1]}.`,
  ],
  [
    /^At most (\d+) phones or browsers can get reminders\.$/,
    (m) => `Simu au vivinjari ${m[1]} tu vinaweza kupata vikumbusho.`,
  ],
  [/^Keep it to (\d+) SMS or fewer\.$/, (m) => `Isizidi SMS ${m[1]}.`],
  [
    /^That file has (\d+) contacts; up to (\d+) can be imported at once\.$/,
    (m) =>
      `Faili hiyo ina anwani ${m[1]}; hadi ${m[2]} zinaweza kuletwa kwa mara moja.`,
  ],
  [
    /^This needs (\d+) SMS; (\d+) left this month\.$/,
    (m) => `Hii inahitaji SMS ${m[1]}; zimebaki ${m[2]} mwezi huu.`,
  ],
  [
    /^You can keep up to (\d+) saved searches\. Delete one first\.$/,
    (m) => `Unaweza kuhifadhi hadi utafutaji ${m[1]}. Futa mmoja kwanza.`,
  ],
];

export function localizeApiMessage(
  message: string | undefined,
  locale: Locale,
): string | undefined {
  if (!message || locale === 'en') return message;
  if (EXACT[message]) return EXACT[message];
  for (const [re, to] of PATTERNS) {
    const m = message.match(re);
    if (m) return to(m);
  }
  return message;
}
