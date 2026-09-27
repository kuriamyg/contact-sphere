import { section } from '../section';

/** Keep-in-touch cadences and relative days. */
export const remember = section(
  {
    cadences: {
      '7': 'Every week',
      '14': 'Every 2 weeks',
      '30': 'Every month',
      '60': 'Every 2 months',
      '90': 'Every 3 months',
      '180': 'Every 6 months',
      '365': 'Every year',
    },
    everyNDays: 'every {n} days',
    today: 'today',
    tomorrow: 'tomorrow',
    yesterday: 'yesterday',
    inDays: 'in {n} days',
    daysAgo: '{n} days ago',
  },
  {
    cadences: {
      '7': 'Kila wiki',
      '14': 'Kila wiki 2',
      '30': 'Kila mwezi',
      '60': 'Kila miezi 2',
      '90': 'Kila miezi 3',
      '180': 'Kila miezi 6',
      '365': 'Kila mwaka',
    },
    everyNDays: 'kila siku {n}',
    today: 'leo',
    tomorrow: 'kesho',
    yesterday: 'jana',
    inDays: 'baada ya siku {n}',
    daysAgo: 'siku {n} zilizopita',
  },
);
