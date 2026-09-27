import { section } from '../section';

export const contactPages = section(
  {
    newTitle: 'New contact',
    saveContact: 'Save contact',
    editTitle: 'Edit {name}',
    saveChanges: 'Save changes',
    import: {
      eyebrow: 'Bring your contacts',
      howLead: 'Export a .vcf from where your contacts live now:',
      title: 'Import contacts',
      lead: 'From a .vcf (vCard) file. Contacts already saved are skipped, so it is safe to import the same file twice. Photos are not imported.',
      howTitle: 'Getting a .vcf file',
      android: 'Android (Google Contacts):',
      androidHow:
        'open Contacts → Fix & manage → Export to file. Samsung: Contacts → ☰ → Manage contacts → Import or export → Export.',
      iphone: 'iPhone:',
      iphoneHow:
        'on icloud.com → Contacts → select all → Export vCard. Or in the Contacts app, open a list, then Export.',
      web: 'Google Contacts on the web:',
      webHow: 'Export → vCard.',
    },
    tags: {
      title: 'Skills and saved searches',
      skills: 'Skills and services',
      noSkills:
        'None yet. Add them when you edit a contact, or import a .vcf with groups.',
      explain:
        'Renaming or removing changes every contact that has it. Renaming to a skill that already exists joins the two.',
      rename: 'Rename',
      newName: 'New name for {tag}',
      save: 'Save',
      remove: 'Remove',
      removeConfirm: {
        one: 'Remove “{tag}” from {n} contact? The contact stays.',
        other: 'Remove “{tag}” from {n} contacts? The contacts stay.',
      },
      removeTag: 'Remove “{tag}”',
      saved: 'Saved searches',
      noSaved:
        'None yet. Search or pick a skill on your contacts, then “Save this search”.',
      skillIs: 'skill: {tag}',
      delete: 'Delete',
      deleteSaved: 'Delete saved search {name}',
    },
  },
  {
    newTitle: 'Anwani mpya',
    saveContact: 'Hifadhi anwani',
    editTitle: 'Hariri {name}',
    saveChanges: 'Hifadhi mabadiliko',
    import: {
      eyebrow: 'Leta anwani zako',
      howLead: 'Hamisha faili ya .vcf kutoka mahali anwani zako zilipo sasa:',
      title: 'Leta anwani',
      lead: 'Kutoka faili ya .vcf (vCard). Anwani zilizokwisha hifadhiwa hurukwa, kwa hiyo ni salama kuleta faili ileile mara mbili. Picha haziletwi.',
      howTitle: 'Kupata faili ya .vcf',
      android: 'Android (Google Contacts):',
      androidHow:
        'fungua Anwani → Rekebisha na usimamie → Hamisha kwenye faili. Samsung: Anwani → ☰ → Simamia anwani → Leta au hamisha → Hamisha.',
      iphone: 'iPhone:',
      iphoneHow:
        'kwenye icloud.com → Anwani → chagua zote → Hamisha vCard. Au kwenye programu ya Anwani, fungua orodha, kisha Hamisha.',
      web: 'Google Contacts kwenye wavuti:',
      webHow: 'Hamisha → vCard.',
    },
    tags: {
      title: 'Ujuzi na utafutaji uliohifadhiwa',
      skills: 'Ujuzi na huduma',
      noSkills:
        'Bado hakuna. Viongeze unapohariri anwani, au leta faili ya .vcf yenye vikundi.',
      explain:
        'Kubadilisha jina au kuondoa hubadilisha kila anwani iliyo nacho. Kubadilisha jina kuwa ujuzi uliopo tayari huviunganisha viwili.',
      rename: 'Badilisha jina',
      newName: 'Jina jipya la {tag}',
      save: 'Hifadhi',
      remove: 'Ondoa',
      removeConfirm: {
        one: 'Ondoa “{tag}” kwenye anwani {n}? Anwani itabaki.',
        other: 'Ondoa “{tag}” kwenye anwani {n}? Anwani zitabaki.',
      },
      removeTag: 'Ondoa “{tag}”',
      saved: 'Utafutaji uliohifadhiwa',
      noSaved:
        'Bado hakuna. Tafuta au chagua ujuzi kwenye anwani zako, kisha “Hifadhi utafutaji huu”.',
      skillIs: 'ujuzi: {tag}',
      delete: 'Futa',
      deleteSaved: 'Futa utafutaji uliohifadhiwa {name}',
    },
  },
);
