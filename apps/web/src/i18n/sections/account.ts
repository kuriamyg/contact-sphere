import { section } from '../section';

export const account = section(
  {
    title: 'Profile',
    yourProfile: 'Your profile',
    settingsNav: 'Settings sections',
    welcome: 'Welcome',
    memberSince: 'Member since {date}',
    twoFactorOn: 'Two-factor sign-in is on',
    twoFactorOff: 'Two-factor sign-in is off',
    yourContacts: 'Your contacts',
    stats: { contacts: 'Contacts', archived: 'Archived', trash: 'Trash' },
    personal: 'Personal details',
    email: 'Email',
    phone: 'Mobile number',
    emailNeedsAddress:
      'Email reminders need an email address, and this account signs in with a mobile number. Phone reminders above work without one.',
    security: 'Security',
    twoFactor: 'Two-factor sign-in',
    changePassword: 'Change password',
    installTitle: 'Use it like an app',
    installBody:
      'Put Contact Sphere on your home screen: it opens full screen, straight into Today, like any other app.',
    remindersTitle: 'Morning reminders',
    remindersBody:
      'A free notification on this phone each morning when a follow-up, birthday or keep-in-touch is due. No SMS, no cost.',
    notAvailable: 'Not available right now.',
    cardTitle: 'Your QR business card',
    cardBody:
      'Let someone scan your card with their phone camera to save your number — no typing, no mistakes.',
    showCard: 'Show my card',
    languageTitle: 'Language',
    languageBody:
      'The app, your morning reminders and the ready-made messages follow this choice.',
    offlineTitle: 'Use it without data',
    offlineBody:
      'Keep a copy of your contacts, groups and Today on this phone. With no data bundle you can still search, open a contact, and call or SMS (that uses airtime, like your phone book). Adding or changing things and WhatsApp still need data. Signing out deletes the copy.',
    dataTitle: 'Your data',
    dataBody:
      'Your contacts are yours: never sold, shared or used for advertising. Take a copy any time.',
    exportVcf: 'Export contacts (.vcf)',
    importContacts: 'Import contacts',
    deleteTitle: 'Delete your account',
    deleteBody:
      'This deletes your account and everything in it, for good: every contact, number, note, group, follow-up and setting, and signs out every device. It cannot be undone.',
    deleteExport: 'Take a copy first: download your contacts (.vcf).',
    legalTitle: 'Privacy and terms',
    legalBody:
      'How your data and your contacts’ data are handled, and the rules for using Contact Sphere.',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    signOutTitle: 'Devices and sign-out',
    devicesBody:
      'Where you are signed in now. Don’t recognise one? Sign it out, then change your password.',
    thisDevice: 'This device',
    someBrowser: 'A browser',
    deviceActive: 'Active {date}',
    deviceSince: 'signed in {date}',
    signOutDevice: 'Sign out',
    signOutDeviceLabel: 'Sign out {device}',
    devicesFailed: 'Could not load your devices just now.',
    signOutHere: 'Sign out of this device',
    signOutAllBody:
      'Lost a phone, or signed in somewhere you shouldn’t have? This signs out every device, including this one.',
    signOutAll: 'Sign out everywhere',
  },
  {
    title: 'Wasifu',
    yourProfile: 'Wasifu wako',
    settingsNav: 'Sehemu za mipangilio',
    welcome: 'Karibu',
    memberSince: 'Mwanachama tangu {date}',
    twoFactorOn: 'Kuingia kwa hatua mbili kumewashwa',
    twoFactorOff: 'Kuingia kwa hatua mbili kumezimwa',
    yourContacts: 'Anwani zako',
    stats: {
      contacts: 'Anwani',
      archived: 'Zilizowekwa kando',
      trash: 'Tupio',
    },
    personal: 'Taarifa binafsi',
    email: 'Barua pepe',
    phone: 'Nambari ya simu',
    emailNeedsAddress:
      'Vikumbusho vya barua pepe vinahitaji anwani ya barua pepe, na akaunti hii huingia kwa nambari ya simu. Vikumbusho vya simu hapo juu hufanya kazi bila hiyo.',
    security: 'Usalama',
    twoFactor: 'Kuingia kwa hatua mbili',
    changePassword: 'Badilisha nenosiri',
    installTitle: 'Itumie kama programu',
    installBody:
      'Weka Contact Sphere kwenye skrini yako ya nyumbani: hufunguka skrini nzima, moja kwa moja kwenye Leo, kama programu nyingine yoyote.',
    remindersTitle: 'Vikumbusho vya asubuhi',
    remindersBody:
      'Arifa ya bure kwenye simu hii kila asubuhi kukiwa na ufuatiliaji, siku ya kuzaliwa au mawasiliano yanayotakiwa. Hakuna SMS, hakuna gharama.',
    notAvailable: 'Haipatikani kwa sasa.',
    cardTitle: 'Kadi yako ya biashara ya QR',
    cardBody:
      'Mtu achanganue kadi yako kwa kamera ya simu yake ili ahifadhi nambari yako — bila kuandika, bila makosa.',
    showCard: 'Onyesha kadi yangu',
    languageTitle: 'Lugha',
    languageBody:
      'Programu, vikumbusho vyako vya asubuhi na jumbe zilizoandaliwa hufuata chaguo hili.',
    offlineTitle: 'Itumie bila data',
    offlineBody:
      'Weka nakala ya anwani, vikundi na Leo kwenye simu hii. Bila kifurushi cha data bado unaweza kutafuta, kufungua anwani, na kupiga simu au kutuma SMS (hutumia salio, kama kitabu chako cha simu). Kuongeza au kubadilisha vitu na WhatsApp bado vinahitaji data. Kutoka kunafuta nakala.',
    dataTitle: 'Data yako',
    dataBody:
      'Anwani zako ni zako: haziuzwi, hazishirikiwi wala kutumika kwa matangazo. Chukua nakala wakati wowote.',
    exportVcf: 'Pakua anwani (.vcf)',
    importContacts: 'Leta anwani',
    deleteTitle: 'Futa akaunti yako',
    deleteBody:
      'Hii inafuta akaunti yako na kila kitu ndani yake, milele: kila anwani, nambari, maelezo, kikundi, ufuatiliaji na mipangilio, na inakutoa kwenye kila kifaa. Haiwezi kutenduliwa.',
    deleteExport: 'Chukua nakala kwanza: pakua anwani zako (.vcf).',
    legalTitle: 'Faragha na masharti',
    legalBody:
      'Jinsi data yako na ya anwani zako inavyoshughulikiwa, na kanuni za kutumia Contact Sphere.',
    privacy: 'Sera ya faragha',
    terms: 'Masharti ya matumizi',
    signOutTitle: 'Vifaa na kutoka',
    devicesBody:
      'Mahali ulipoingia sasa. Hukitambui kimoja? Kitoe, kisha ubadilishe nenosiri lako.',
    thisDevice: 'Kifaa hiki',
    someBrowser: 'Kivinjari',
    deviceActive: 'Kilitumika {date}',
    deviceSince: 'uliingia {date}',
    signOutDevice: 'Toa',
    signOutDeviceLabel: 'Toa {device}',
    devicesFailed: 'Imeshindwa kupakia vifaa vyako sasa hivi.',
    signOutHere: 'Toka kwenye kifaa hiki',
    signOutAllBody:
      'Umepoteza simu, au uliingia mahali usipopaswa? Hii inakutoa kwenye kila kifaa, pamoja na hiki.',
    signOutAll: 'Toka kila mahali',
  },
);
