import { section } from '../section';

/** Messages the web server writes itself (not relayed from the API). */
export const errors = section(
  {
    tooMany: 'Too many attempts. Wait a minute and try again.',
    tooManyRequests: 'Too many requests. Wait a minute and try again.',
    tooManyImports: 'Too many imports in a row. Wait a minute and try again.',
    unavailable: 'The service is unavailable. Try again shortly.',
    generic: 'Something went wrong. Try again.',
    sessionEnded: 'Your session has ended. Sign in again.',
    contactGone: 'That contact no longer exists.',
    passwordsDiffer: 'The two new passwords do not match.',
    passwordChanged:
      'Password changed. Every other device has been signed out.',
    twoFactorOff: 'Two-factor is off.',
    nameSaved: 'Name saved.',
    fileUnreadable: 'That file could not be read.',
    chooseFile: 'Choose a .vcf file first.',
    writeMessage: 'Write a message first.',
    sentAll: { one: 'Sent to {n} person.', other: 'Sent to {n} people.' },
    sentSome: 'Sent to {n} of {total}. The rest could not be delivered.',
    unreachable: 'Could not reach Contact Sphere. Try again.',
    sendFailed: 'Could not send. Try again.',
  },
  {
    tooMany: 'Majaribio mengi mno. Subiri dakika moja ujaribu tena.',
    tooManyRequests: 'Maombi mengi mno. Subiri dakika moja ujaribu tena.',
    tooManyImports:
      'Umeleta mara nyingi mfululizo. Subiri dakika moja ujaribu tena.',
    unavailable: 'Huduma haipatikani. Jaribu tena baada ya muda mfupi.',
    generic: 'Kuna tatizo. Jaribu tena.',
    sessionEnded: 'Muda wako wa kuingia umeisha. Ingia tena.',
    contactGone: 'Anwani hiyo haipo tena.',
    passwordsDiffer: 'Manenosiri mawili mapya hayalingani.',
    passwordChanged:
      'Nenosiri limebadilishwa. Vifaa vingine vyote vimetolewa kwenye akaunti.',
    twoFactorOff: 'Uthibitisho wa hatua mbili umezimwa.',
    nameSaved: 'Jina limehifadhiwa.',
    fileUnreadable: 'Faili hiyo haikuweza kusomwa.',
    chooseFile: 'Chagua faili ya .vcf kwanza.',
    writeMessage: 'Andika ujumbe kwanza.',
    sentAll: { one: 'Imetumwa kwa mtu {n}.', other: 'Imetumwa kwa watu {n}.' },
    sentSome: 'Imetumwa kwa {n} kati ya {total}. Waliobaki hawakufikiwa.',
    unreachable: 'Imeshindwa kufikia Contact Sphere. Jaribu tena.',
    sendFailed: 'Imeshindwa kutuma. Jaribu tena.',
  },
);
