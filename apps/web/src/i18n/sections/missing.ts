import { section } from '../section';

/** The "not found" pages. */
export const missing = section(
  {
    pageTitle: 'Page not found',
    pageBody: 'The link may be wrong, or the page is not for this account.',
    pageBack: 'Go to Today',
    contactTitle: 'Contact not found',
    contactBody: 'It may have been deleted for good, or the link is wrong.',
    contactBack: 'Back to contacts',
    groupTitle: 'That group does not exist',
    groupBody: 'It may have been deleted.',
    groupBack: 'Back to groups',
    pairTitle: 'This pair is no longer available',
    pairBody:
      'One of the contacts may have been merged, moved to the trash or deleted.',
    pairBack: 'Back to duplicates',
  },
  {
    pageTitle: 'Ukurasa haukupatikana',
    pageBody: 'Huenda kiungo si sahihi, au ukurasa si wa akaunti hii.',
    pageBack: 'Nenda kwa Leo',
    contactTitle: 'Anwani haikupatikana',
    contactBody: 'Huenda imefutwa kabisa, au kiungo si sahihi.',
    contactBack: 'Rudi kwenye anwani',
    groupTitle: 'Kikundi hicho hakipo',
    groupBody: 'Huenda kimefutwa.',
    groupBack: 'Rudi kwenye vikundi',
    pairTitle: 'Jozi hii haipatikani tena',
    pairBody:
      'Moja ya anwani huenda imeunganishwa, imepelekwa kwenye tupio au imefutwa.',
    pairBack: 'Rudi kwenye nakala',
  },
);
