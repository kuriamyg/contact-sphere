import { section } from '../section';

/** Plans, payments and the operator page (B9, ADR 0019). */
export const billing = section(
  {
    planTitle: 'Your plan',
    plus: 'Plus',
    free: 'Free',
    operatorPlan: 'Plus — you run Contact Sphere.',
    trialUntil: 'Plus trial until {date}.',
    plusUntil: 'Plus until {date}.',
    lapsed: 'Your Plus ended on {date}. You are on the free plan.',
    freeLead:
      'Free keeps all your contacts, search, import and export, and 3 groups.',
    plusLead:
      'Plus adds morning reminders on your phone and by email, and unlimited groups.',
    priceLine: 'KES 99 a month, or KES 990 a year (two months free).',
    renew: 'Pay for Plus',
    payByHand:
      'Or send the amount by M-Pesa — {payTo} — and it is added once the payment is confirmed.',
    notYet: 'Paying in the app is not switched on yet.',
    history: 'Payments',
    methods: {
      mpesa_stk: 'M-Pesa',
      manual: 'M-Pesa (by hand)',
      grant: 'Free months',
    },
    statuses: { pending: 'Waiting', paid: 'Paid', failed: 'Not paid' },
    months: { one: '{n} month', other: '{n} months' },
    operatorTitle: 'Operator',
    operatorLead:
      'Everyone with an account. Counts only — never their contacts’ details.',
    accounts: 'Accounts',
    onPlus: 'On Plus',
    paying: 'Paying',
    collected: 'Collected',
    joined: 'Joined {date}',
    lastSeen: 'Last seen {date}',
    never: 'Not signed in yet',
    contactsGroups: '{contacts} contacts · {groups} groups',
    paidTotal: 'KES {amount} paid',
    you: 'You',
    noAccounts: 'No accounts yet. Share the sign-up link.',
    signupLink: 'Sign-up link for new people: {url}',
  },
  {
    planTitle: 'Mpango wako',
    plus: 'Plus',
    free: 'Bure',
    operatorPlan: 'Plus — wewe ndiye unaendesha Contact Sphere.',
    trialUntil: 'Majaribio ya Plus hadi {date}.',
    plusUntil: 'Plus hadi {date}.',
    lapsed: 'Plus yako iliisha {date}. Uko kwenye mpango wa bure.',
    freeLead:
      'Bure huhifadhi anwani zako zote, utafutaji, kuleta na kutoa, na vikundi 3.',
    plusLead:
      'Plus huongeza vikumbusho vya asubuhi kwenye simu na kwa barua pepe, na vikundi bila kikomo.',
    priceLine: 'KES 99 kwa mwezi, au KES 990 kwa mwaka (miezi miwili bure).',
    renew: 'Lipia Plus',
    payByHand:
      'Au tuma kiasi hicho kwa M-Pesa — {payTo} — na kitaongezwa malipo yakithibitishwa.',
    notYet: 'Kulipa ndani ya programu bado hakujawashwa.',
    history: 'Malipo',
    methods: {
      mpesa_stk: 'M-Pesa',
      manual: 'M-Pesa (kwa mkono)',
      grant: 'Miezi ya bure',
    },
    statuses: { pending: 'Inasubiri', paid: 'Imelipwa', failed: 'Haijalipwa' },
    months: { one: 'mwezi {n}', other: 'miezi {n}' },
    operatorTitle: 'Msimamizi',
    operatorLead:
      'Kila mwenye akaunti. Idadi tu — kamwe si maelezo ya anwani zao.',
    accounts: 'Akaunti',
    onPlus: 'Kwenye Plus',
    paying: 'Wanaolipa',
    collected: 'Zilizokusanywa',
    joined: 'Alijiunga {date}',
    lastSeen: 'Alionekana {date}',
    never: 'Bado hajaingia',
    contactsGroups: 'anwani {contacts} · vikundi {groups}',
    paidTotal: 'KES {amount} zimelipwa',
    you: 'Wewe',
    noAccounts: 'Bado hakuna akaunti. Shiriki kiungo cha kujisajili.',
    signupLink: 'Kiungo cha kujisajili kwa watu wapya: {url}',
  },
);
