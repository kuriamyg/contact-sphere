/*
 * Contact Sphere offline app (Phase 10b).
 *
 * Shown by the service worker when there is no connection. It reads the
 * copy the signed-in app saved in this browser (IndexedDB "cs-offline")
 * and lets the owner browse, search and call — with no data at all.
 * Read-only: nothing here writes to the server.
 *
 * Safety: all text is inserted with textContent, never as HTML.
 */
(function () {
  'use strict';

  // The theme chosen in the app (cookie cs-theme): auto, light or dark.
  var themeMatch = /(?:^|; )cs-theme=(auto|light|dark)/.exec(document.cookie);
  document.documentElement.setAttribute(
    'data-theme',
    themeMatch ? themeMatch[1] : 'auto',
  );

  // The language chosen in the app (cookie cs-lang), else the phone's.
  var langMatch = /(?:^|; )cs-lang=(en|sw)/.exec(document.cookie);
  var LANG = langMatch
    ? langMatch[1]
    : /^sw\b/i.test(navigator.language || '')
      ? 'sw'
      : 'en';
  document.documentElement.setAttribute('lang', LANG);
  var STRINGS = {
    en: {
      title: 'Contact Sphere (offline)',
      main: 'Main',
      today: 'Today',
      contacts: 'Contacts',
      groups: 'Groups',
      loading: 'Loading…',
      done: 'Done',
      doneWith: 'Done: {x}',
      waiting:
        'Waiting to send — saved on this phone, sent when you have data.',
      waitingShort: 'waiting to send',
      relToday: 'today',
      relTomorrow: 'tomorrow',
      relIn: 'in {n} days',
      relLate: ['{n} day late', '{n} days late'],
      justNow: 'just now',
      minAgo: '{n} min ago',
      hoursAgo: '{n} h ago',
      daysAgo: '{n} days ago',
      call: 'Call',
      callName: 'Call {x}',
      sms: 'SMS',
      smsName: 'SMS {x}',
      searchPlaceholder: 'Name, skill, area, number…',
      searchLabel: 'Search contacts',
      count: ['{n} contact', '{n} contacts'],
      first100: ' — showing the first 100, search to narrow',
      newContact: 'New contact',
      notInCopy: 'Not in the offline copy',
      notInCopyBody:
        'It may be archived, in the trash, or added after the copy was made.',
      backContacts: '← Contacts',
      backGroups: '← Groups',
      skills: 'Skills and services',
      phone: 'Phone',
      primary: 'primary',
      email: 'Email',
      area: 'Area: ',
      metThrough: 'Met through: ',
      birthday: 'Birthday: ',
      followUps: 'Follow-ups',
      notes: 'Notes',
      editNeedsData: 'Editing details (name, numbers, skills) needs data.',
      inTouchToday: 'I was in touch today',
      lastInTouch: 'Last in touch: {x}',
      notContacted: 'Not marked as contacted yet',
      followDate: 'Follow-up date',
      followNote: 'Follow-up note',
      followPlaceholder: 'e.g. Ask about the harambee',
      addFollowTitle: 'Add a follow-up',
      addFollow: 'Add follow-up',
      name: 'Name',
      phoneNumber: 'Phone number',
      note: 'Note',
      noteOptional: 'Note (optional)',
      saveContact: 'Save contact',
      newContactNote:
        'Saved on this phone now; added to your account when you have data. Add more details later in the full app.',
      nothingDue: 'Nothing due today.',
      followUp: 'Follow up',
      keepInTouch: 'Keep in touch',
      dueToday: 'due today',
      overdue: ['{n} day overdue', '{n} days overdue'],
      inTouchWith: 'I was in touch with {x}',
      birthdays: 'Birthdays',
      birthdayToday: 'Today 🎉',
      turns: ' · turns {n}',
      members: ['{n} member', '{n} members'],
      noGroups: 'No groups in the offline copy.',
      textEveryone: 'Text everyone (SMS)',
      offlineTitle: 'You’re offline',
      noCopy: 'There is no copy of your contacts on this phone yet.',
      noCopyHow:
        'When you have data or Wi-Fi: open Profile → “Use it without data” → Keep a copy on this phone. After that, your contacts open here even with no bundle.',
      tryAgain: 'Try again',
      noConnection: 'No connection.',
      bannerFirst: 'No connection — showing the copy on this phone.',
      banner: 'No connection — your copy from {x}. Calls and SMS use airtime.',
      earlier: 'earlier',
      queued: [' {n} change waiting to send.', ' {n} changes waiting to send.'],
      notSaved: ' Not saved: {x}',
      otherAccount: 'changes made by another account were discarded.',
      refused: 'a change was refused.',
      sent: ['Sent {n} change. ', 'Sent {n} changes. '],
      backOnline: 'You’re back online — open the full app',
    },
    sw: {
      title: 'Contact Sphere (bila mtandao)',
      main: 'Kuu',
      today: 'Leo',
      contacts: 'Anwani',
      groups: 'Vikundi',
      loading: 'Inapakia…',
      done: 'Imekamilika',
      doneWith: 'Imekamilika: {x}',
      waiting:
        'Inasubiri kutumwa — imehifadhiwa kwenye simu hii, itatumwa ukipata data.',
      waitingShort: 'inasubiri kutumwa',
      relToday: 'leo',
      relTomorrow: 'kesho',
      relIn: 'baada ya siku {n}',
      relLate: ['imechelewa siku {n}', 'imechelewa siku {n}'],
      justNow: 'sasa hivi',
      minAgo: 'dakika {n} zilizopita',
      hoursAgo: 'saa {n} zilizopita',
      daysAgo: 'siku {n} zilizopita',
      call: 'Piga simu',
      callName: 'Mpigie {x}',
      sms: 'SMS',
      smsName: 'Mtumie {x} SMS',
      searchPlaceholder: 'Jina, ujuzi, eneo, nambari…',
      searchLabel: 'Tafuta anwani',
      count: ['anwani {n}', 'anwani {n}'],
      first100: ' — zinaonyeshwa 100 za kwanza, tafuta ili kupunguza',
      newContact: 'Anwani mpya',
      notInCopy: 'Haipo kwenye nakala ya simu',
      notInCopyBody:
        'Huenda imewekwa kando, iko kwenye tupio, au iliongezwa baada ya nakala kutengenezwa.',
      backContacts: '← Anwani',
      backGroups: '← Vikundi',
      skills: 'Ujuzi na huduma',
      phone: 'Simu',
      primary: 'kuu',
      email: 'Barua pepe',
      area: 'Eneo: ',
      metThrough: 'Tulikutana kupitia: ',
      birthday: 'Siku ya kuzaliwa: ',
      followUps: 'Ufuatiliaji',
      notes: 'Maelezo',
      editNeedsData: 'Kuhariri taarifa (jina, nambari, ujuzi) kunahitaji data.',
      inTouchToday: 'Nimewasiliana naye leo',
      lastInTouch: 'Mliwasiliana mara ya mwisho: {x}',
      notContacted: 'Bado hajawekwa kuwa mliwasiliana',
      followDate: 'Tarehe ya ufuatiliaji',
      followNote: 'Maelezo ya ufuatiliaji',
      followPlaceholder: 'k.m. Uliza kuhusu harambee',
      addFollowTitle: 'Ongeza ufuatiliaji',
      addFollow: 'Ongeza ufuatiliaji',
      name: 'Jina',
      phoneNumber: 'Nambari ya simu',
      note: 'Maelezo',
      noteOptional: 'Maelezo (si lazima)',
      saveContact: 'Hifadhi anwani',
      newContactNote:
        'Imehifadhiwa kwenye simu hii sasa; itaongezwa kwenye akaunti yako ukipata data. Ongeza taarifa zaidi baadaye kwenye programu kamili.',
      nothingDue: 'Hakuna cha kufanya leo.',
      followUp: 'Fuatilia',
      keepInTouch: 'Endelea kuwasiliana',
      dueToday: 'inatakiwa leo',
      overdue: ['imechelewa siku {n}', 'imechelewa siku {n}'],
      inTouchWith: 'Nimewasiliana na {x}',
      birthdays: 'Siku za kuzaliwa',
      birthdayToday: 'Leo 🎉',
      turns: ' · anatimiza miaka {n}',
      members: ['mwanachama {n}', 'wanachama {n}'],
      noGroups: 'Hakuna vikundi kwenye nakala ya simu.',
      textEveryone: 'Tuma SMS kwa wote',
      offlineTitle: 'Huna mtandao',
      noCopy: 'Bado hakuna nakala ya anwani zako kwenye simu hii.',
      noCopyHow:
        'Ukipata data au Wi-Fi: fungua Wasifu → “Tumia bila data” → Hifadhi nakala kwenye simu hii. Baada ya hapo, anwani zako zitafunguka hapa hata bila kifurushi.',
      tryAgain: 'Jaribu tena',
      noConnection: 'Hakuna mtandao.',
      bannerFirst: 'Hakuna mtandao — inaonyesha nakala iliyo kwenye simu hii.',
      banner:
        'Hakuna mtandao — nakala yako ya {x}. Simu na SMS hutumia salio la muda wa maongezi.',
      earlier: 'awali',
      queued: [
        ' Badiliko {n} linasubiri kutumwa.',
        ' Mabadiliko {n} yanasubiri kutumwa.',
      ],
      notSaved: ' Haijahifadhiwa: {x}',
      otherAccount: 'mabadiliko yaliyofanywa na akaunti nyingine yametupwa.',
      refused: 'badiliko moja limekataliwa.',
      sent: ['Badiliko {n} limetumwa. ', 'Mabadiliko {n} yametumwa. '],
      backOnline: 'Mtandao umerudi — fungua programu kamili',
    },
  };
  var T = STRINGS[LANG];
  var INTL = LANG === 'sw' ? 'sw-KE' : 'en-KE';
  /** T[key] with {n} and {x} filled; a [one, other] pair picks by n. */
  function tr(key, n, x) {
    var v = T[key];
    if (Array.isArray(v)) v = n === 1 ? v[0] : v[1];
    return String(v)
      .replace('{n}', n === undefined ? '' : String(n))
      .replace('{x}', x === undefined ? '' : String(x));
  }
  document.title = T.title;
  (function staticText() {
    var nav = document.querySelector('.top nav');
    if (nav) {
      nav.setAttribute('aria-label', T.main);
      var links = nav.querySelectorAll('a');
      ['today', 'contacts', 'groups'].forEach(function (k, i) {
        if (links[i]) links[i].textContent = T[k];
      });
    }
    var b = document.getElementById('banner');
    if (b) b.textContent = T.bannerFirst;
    var loading = document.querySelector('#main .muted');
    if (loading) loading.textContent = T.loading;
  })();

  var DB_NAME = 'cs-offline';
  var FLAG = 'cs-offline';
  var data = null;
  var info = null;
  var main = document.getElementById('main');
  var banner = document.getElementById('banner');
  /** Changes made here, waiting to be sent: { ownerId, ops: [...] }. */
  var queue = { ownerId: null, ops: [] };
  var lastProblems = [];

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    var hex = Array.prototype.map
      .call(b, function (x) {
        return (x + 256).toString(16).slice(1);
      })
      .join('');
    return (
      hex.slice(0, 8) +
      '-' +
      hex.slice(8, 12) +
      '-' +
      hex.slice(12, 16) +
      '-' +
      hex.slice(16, 20) +
      '-' +
      hex.slice(20)
    );
  }

  /** Saves the copy (with changes shown) and the queue, so a reload keeps them. */
  function persist(cb) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = function () {
      var db = req.result;
      var tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(data, 'snapshot');
      tx.objectStore('kv').put(queue, 'queue');
      tx.oncomplete = function () {
        db.close();
        if (cb) cb();
      };
      tx.onerror = function () {
        db.close();
        if (cb) cb();
      };
    };
    req.onerror = function () {
      if (cb) cb();
    };
  }

  function record(op) {
    op.opId = uuid();
    queue.ownerId = data.ownerId;
    queue.ops.push(op);
    persist();
    updateBanner();
  }

  function rerender() {
    route();
  }
  function markContacted(c) {
    record({
      type: 'contacted',
      contactId: c.id,
      at: new Date().toISOString(),
    });
    c.lastContactedOn = today();
    persist();
    rerender();
  }
  function followDone(f) {
    record({ type: 'followup.done', followUpId: f.id });
    data.followUps = data.followUps.filter(function (x) {
      return x.id !== f.id;
    });
    persist();
    rerender();
  }
  function addFollow(c, dueOn, note) {
    var id = uuid();
    record({
      type: 'followup.add',
      followUpId: id,
      contactId: c.id,
      dueOn: dueOn,
      note: note,
    });
    data.followUps.push({ id: id, contactId: c.id, dueOn: dueOn, note: note });
    data.followUps.sort(function (a, b) {
      return a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0;
    });
    persist();
    rerender();
  }
  function newContact(name, phone, note) {
    var id = uuid();
    var op = { type: 'contact.create', contactId: id, name: name };
    if (phone) op.phone = phone;
    if (note) op.note = note;
    record(op);
    data.contacts.push({
      id: id,
      name: name,
      organization: null,
      jobTitle: null,
      nickname: null,
      area: null,
      metThrough: null,
      tags: [],
      birthday: null,
      notes: note || null,
      createdOn: today(),
      keepInTouchDays: null,
      lastContactedOn: null,
      phones: phone ? [[phone, null, null]] : [],
      emails: [],
    });
    data.contacts.sort(function (a, b) {
      return fold(a.name) < fold(b.name) ? -1 : 1;
    });
    persist();
    location.hash = '#/c/' + id;
  }
  function doneButton(label, onClick) {
    var b = h(
      'button',
      { type: 'button', class: 'btn', 'aria-label': label },
      T.done,
    );
    b.addEventListener('click', onClick);
    return b;
  }
  function waitingNote() {
    return h('p', { class: 'pending small' }, T.waiting);
  }

  function isPending(id) {
    return queue.ops.some(function (o) {
      return o.contactId === id || o.followUpId === id;
    });
  }

  // ---- tiny DOM helper: h('a', { href: '#' }, 'text', child) --------------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false)
          return;
        if (k === 'class') el.className = attrs[k];
        else el.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c))
        c.forEach(function (x) {
          if (x)
            el.appendChild(
              typeof x === 'string' ? document.createTextNode(x) : x,
            );
        });
      else
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function show() {
    main.textContent = '';
    for (var i = 0; i < arguments.length; i++)
      if (arguments[i]) main.appendChild(arguments[i]);
    window.scrollTo(0, 0);
  }

  // ---- dates: Nairobi days (UTC+3), as on the server ---------------------
  var DAY = 86400000;
  function today() {
    return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  }
  function between(a, b) {
    return Math.round(
      (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY,
    );
  }
  function addDays(d, n) {
    return new Date(Date.parse(d + 'T00:00:00Z') + n * DAY)
      .toISOString()
      .slice(0, 10);
  }
  function leap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }
  function nextBirthday(b, t) {
    var by = +b.slice(0, 4),
      bm = +b.slice(5, 7),
      bd = +b.slice(8, 10),
      y = +t.slice(0, 4);
    function on(yy) {
      var d = bm === 2 && bd === 29 && !leap(yy) ? 28 : bd;
      return (
        yy +
        '-' +
        String(bm).padStart(2, '0') +
        '-' +
        String(d).padStart(2, '0')
      );
    }
    var o = on(y);
    if (o < t) o = on(++y);
    return { on: o, daysAway: between(t, o), turning: y - by };
  }
  function fmtDay(d) {
    try {
      return new Intl.DateTimeFormat(INTL, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(new Date(d + 'T00:00:00Z'));
    } catch {
      return d;
    }
  }
  function rel(n) {
    return n === 0
      ? T.relToday
      : n === 1
        ? T.relTomorrow
        : n > 0
          ? tr('relIn', n)
          : tr('relLate', -n);
  }
  function ago(iso) {
    var m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 60) return m <= 1 ? T.justNow : tr('minAgo', m);
    var hrs = Math.round(m / 60);
    return hrs < 24 ? tr('hoursAgo', hrs) : tr('daysAgo', Math.round(hrs / 24));
  }

  // ---- search: every word must match, accents folded ---------------------
  function fold(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }
  function haystack(c) {
    return fold(
      [
        c.name,
        c.nickname,
        c.organization,
        c.jobTitle,
        c.area,
        c.metThrough,
        c.tags.join(' '),
        c.notes,
        c.emails
          .map(function (e) {
            return e[0];
          })
          .join(' '),
      ].join(' '),
    );
  }
  function digits(c) {
    return c.phones
      .map(function (p) {
        return p[0].replace(/\D/g, '') + ' ' + (p[1] || '').replace(/\D/g, '');
      })
      .join(' ');
  }
  function search(q) {
    var words = fold(q).split(/\s+/).filter(Boolean);
    var qd = /^[\d\s+().-]+$/.test(q) ? q.replace(/\D/g, '') : '';
    if (qd.charAt(0) === '0') qd = qd.slice(1);
    return data.contacts.filter(function (c) {
      if (!words.length) return true;
      if (qd.length >= 3 && digits(c).indexOf(qd) >= 0) return true;
      var hs = c._hs || (c._hs = haystack(c));
      return words.every(function (w) {
        return hs.indexOf(w) >= 0;
      });
    });
  }

  function byId(id) {
    return data.contacts.find(function (c) {
      return c.id === id;
    });
  }
  function dial(p) {
    return p[1] || String(p[0]).replace(/[^\d+]/g, '');
  }
  function callButtons(c) {
    var p = c.phones[0];
    if (!p) return null;
    return h(
      'span',
      { class: 'actions', style: null },
      h(
        'a',
        {
          class: 'btn',
          href: 'tel:' + dial(p),
          'aria-label': tr('callName', undefined, c.name),
        },
        T.call,
      ),
      h(
        'a',
        {
          class: 'btn',
          href: 'sms:' + dial(p),
          'aria-label': tr('smsName', undefined, c.name),
        },
        T.sms,
      ),
    );
  }
  function personRow(c, sub, extra) {
    return h(
      'li',
      null,
      h(
        'div',
        { class: 'row' },
        h(
          'a',
          { class: 'grow', href: '#/c/' + c.id },
          h('span', { class: 'name' }, c.name),
          h('span', { class: 'sub' }, sub || ''),
        ),
        callButtons(c),
        extra || null,
      ),
    );
  }

  // ---- screens -----------------------------------------------------------
  function contactsScreen(q) {
    var input = h('input', {
      type: 'search',
      placeholder: T.searchPlaceholder,
      'aria-label': T.searchLabel,
      value: q || '',
    });
    var list = h('ul', { class: 'list' });
    var count = h('p', { class: 'muted small' });
    function render() {
      var found = search(input.value.trim());
      list.textContent = '';
      found.slice(0, 100).forEach(function (c) {
        var p = c.phones[0];
        list.appendChild(
          personRow(
            c,
            [
              p ? p[0] : c.emails[0] ? c.emails[0][0] : '',
              c.organization,
              c.tags.slice(0, 2).join(', '),
              isPending(c.id) ? T.waitingShort : '',
            ]
              .filter(Boolean)
              .join(' · '),
          ),
        );
      });
      count.textContent =
        tr('count', found.length) + (found.length > 100 ? T.first100 : '');
    }
    input.addEventListener('input', render);
    render();
    show(
      h(
        'div',
        { class: 'titlebar' },
        h('h1', null, T.contacts),
        h('a', { class: 'btn primary', href: '#/new' }, T.newContact),
      ),
      input,
      count,
      list,
    );
  }

  function contactScreen(id) {
    var c = byId(id);
    if (!c)
      return show(
        h('h1', null, T.notInCopy),
        h('p', { class: 'muted' }, T.notInCopyBody),
      );
    var groups = data.groups.filter(function (g) {
      return g.members.some(function (m) {
        return m[0] === c.id;
      });
    });
    var follow = data.followUps.filter(function (f) {
      return f.contactId === c.id;
    });
    var t = today();
    show(
      h(
        'p',
        null,
        h('a', { href: '#/contacts', class: 'muted small' }, T.backContacts),
      ),
      h('h1', null, c.name),
      c.nickname ? h('p', { class: 'muted' }, '“' + c.nickname + '”') : null,
      c.jobTitle || c.organization
        ? h(
            'p',
            { class: 'muted' },
            [c.jobTitle, c.organization].filter(Boolean).join(' · '),
          )
        : null,
      c.tags.length
        ? h(
            'ul',
            { class: 'chips', 'aria-label': T.skills },
            c.tags.map(function (x) {
              return h('li', null, x);
            }),
          )
        : null,
      c.phones.length ? h('h2', null, T.phone) : null,
      c.phones.length
        ? h(
            'ul',
            { class: 'list' },
            c.phones.map(function (p, i) {
              return h(
                'li',
                null,
                h(
                  'div',
                  { class: 'row' },
                  h(
                    'span',
                    { class: 'grow' },
                    h('span', { class: 'name' }, p[0]),
                    h(
                      'span',
                      { class: 'sub' },
                      [p[2], i === 0 ? T.primary : '']
                        .filter(Boolean)
                        .join(' · '),
                    ),
                  ),
                  h(
                    'a',
                    {
                      class: 'btn primary',
                      href: 'tel:' + dial(p),
                      'aria-label': tr('callName', undefined, p[0]),
                    },
                    T.call,
                  ),
                  h(
                    'a',
                    {
                      class: 'btn',
                      href: 'sms:' + dial(p),
                      'aria-label': tr('smsName', undefined, p[0]),
                    },
                    T.sms,
                  ),
                ),
              );
            }),
          )
        : null,
      c.emails.length ? h('h2', null, T.email) : null,
      c.emails.length
        ? h(
            'ul',
            { class: 'list' },
            c.emails.map(function (e) {
              return h(
                'li',
                null,
                h(
                  'div',
                  { class: 'row' },
                  h('span', { class: 'grow pre' }, e[0]),
                ),
              );
            }),
          )
        : null,
      c.area || c.metThrough || c.birthday
        ? h(
            'div',
            { class: 'card', style: null },
            c.area
              ? h('p', null, h('span', { class: 'muted' }, T.area), c.area)
              : null,
            c.metThrough
              ? h(
                  'p',
                  null,
                  h('span', { class: 'muted' }, T.metThrough),
                  c.metThrough,
                )
              : null,
            c.birthday
              ? h(
                  'p',
                  null,
                  h('span', { class: 'muted' }, T.birthday),
                  fmtDay(c.birthday) + ' ' + c.birthday.slice(0, 4),
                )
              : null,
          )
        : null,
      groups.length ? h('h2', null, T.groups) : null,
      groups.length
        ? h(
            'ul',
            { class: 'chips' },
            groups.map(function (g) {
              var role = g.members.find(function (m) {
                return m[0] === c.id;
              })[1];
              return h('li', null, g.name + (role ? ' · ' + role : ''));
            }),
          )
        : null,
      follow.length ? h('h2', null, T.followUps) : null,
      follow.length
        ? h(
            'ul',
            { class: 'list' },
            follow.map(function (f) {
              var d = between(t, f.dueOn);
              return h(
                'li',
                null,
                h(
                  'div',
                  { class: 'row' },
                  h(
                    'span',
                    { class: 'grow' },
                    h('span', { class: 'name' }, f.note),
                    h(
                      'span',
                      { class: 'sub' + (d < 0 ? ' late' : '') },
                      fmtDay(f.dueOn) +
                        ' · ' +
                        rel(d) +
                        (isPending(f.id) ? ' · ' + T.waitingShort : ''),
                    ),
                  ),
                  doneButton(tr('doneWith', undefined, f.note), function () {
                    followDone(f);
                  }),
                ),
              );
            }),
          )
        : null,
      c.notes ? h('h2', null, T.notes) : null,
      c.notes ? h('p', { class: 'pre' }, c.notes) : null,
      isPending(c.id) ? waitingNote() : null,
      touchSection(c),
      followForm(c),
      h('p', { class: 'muted small' }, T.editNeedsData),
    );
  }

  function touchSection(c) {
    var b = h('button', { type: 'button', class: 'btn' }, T.inTouchToday);
    b.addEventListener('click', function () {
      markContacted(c);
    });
    return h(
      'div',
      { class: 'card' },
      h(
        'p',
        { class: 'small muted' },
        c.lastContactedOn
          ? tr('lastInTouch', undefined, fmtDay(c.lastContactedOn))
          : T.notContacted,
      ),
      b,
    );
  }

  function followForm(c) {
    var date = h('input', {
      type: 'date',
      required: 'required',
      'aria-label': T.followDate,
      value: today(),
    });
    var note = h('input', {
      type: 'text',
      required: 'required',
      maxlength: '200',
      placeholder: T.followPlaceholder,
      'aria-label': T.followNote,
    });
    var form = h(
      'form',
      { class: 'stack' },
      h('h2', null, T.addFollowTitle),
      date,
      note,
      h('button', { type: 'submit', class: 'btn primary' }, T.addFollow),
    );
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = note.value.trim().replace(/\s+/g, ' ');
      if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return;
      addFollow(c, date.value, n.slice(0, 200));
    });
    return form;
  }

  function newScreen() {
    var name = h('input', {
      type: 'text',
      required: 'required',
      maxlength: '200',
      'aria-label': T.name,
      placeholder: T.name,
    });
    var phone = h('input', {
      type: 'tel',
      inputmode: 'tel',
      maxlength: '64',
      'aria-label': T.phoneNumber,
      placeholder: T.phoneNumber,
    });
    var note = h('textarea', {
      rows: '3',
      maxlength: '2000',
      'aria-label': T.note,
      placeholder: T.noteOptional,
    });
    var form = h(
      'form',
      { class: 'stack' },
      name,
      phone,
      note,
      h('button', { type: 'submit', class: 'btn primary' }, T.saveContact),
    );
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = name.value.trim().replace(/\s+/g, ' ');
      if (!n) return;
      newContact(
        n.slice(0, 200),
        phone.value.trim().slice(0, 64),
        note.value.trim().slice(0, 2000),
      );
    });
    show(
      h(
        'p',
        null,
        h('a', { href: '#/contacts', class: 'muted small' }, T.backContacts),
      ),
      h('h1', null, T.newContact),
      h('p', { class: 'muted small' }, T.newContactNote),
      form,
    );
  }

  function todayScreen() {
    var t = today();
    var fu = data.followUps
      .map(function (f) {
        return { f: f, c: byId(f.contactId), d: between(t, f.dueOn) };
      })
      .filter(function (x) {
        return x.c && x.d <= 7;
      });
    var kit = data.contacts
      .filter(function (c) {
        return c.keepInTouchDays;
      })
      .map(function (c) {
        var due = addDays(c.lastContactedOn || c.createdOn, c.keepInTouchDays);
        return { c: c, over: between(due, t) };
      })
      .filter(function (x) {
        return x.over >= 0;
      })
      .sort(function (a, b) {
        return b.over - a.over;
      });
    var bd = data.contacts
      .filter(function (c) {
        return c.birthday;
      })
      .map(function (c) {
        return { c: c, b: nextBirthday(c.birthday, t) };
      })
      .filter(function (x) {
        return x.b.daysAway <= 14;
      })
      .sort(function (a, b) {
        return a.b.daysAway - b.b.daysAway;
      });
    var parts = [h('h1', null, T.today), h('p', { class: 'muted' }, fmtDay(t))];
    if (!fu.length && !kit.length && !bd.length)
      parts.push(h('div', { class: 'card' }, h('p', null, T.nothingDue)));
    if (fu.length)
      parts.push(
        h('h2', null, T.followUp),
        h(
          'ul',
          { class: 'list' },
          fu.map(function (x) {
            return personRow(
              x.c,
              x.f.note + ' · ' + rel(x.d),
              doneButton(tr('doneWith', undefined, x.f.note), function () {
                followDone(x.f);
              }),
            );
          }),
        ),
      );
    if (kit.length)
      parts.push(
        h('h2', null, T.keepInTouch),
        h(
          'ul',
          { class: 'list' },
          kit.map(function (x) {
            return personRow(
              x.c,
              x.over === 0 ? T.dueToday : tr('overdue', x.over),
              doneButton(tr('inTouchWith', undefined, x.c.name), function () {
                markContacted(x.c);
              }),
            );
          }),
        ),
      );
    if (bd.length)
      parts.push(
        h('h2', null, T.birthdays),
        h(
          'ul',
          { class: 'list' },
          bd.map(function (x) {
            return personRow(
              x.c,
              (x.b.daysAway === 0
                ? T.birthdayToday
                : fmtDay(x.b.on) + ' · ' + rel(x.b.daysAway)) +
                (x.b.turning > 0 && x.b.turning < 130
                  ? tr('turns', x.b.turning)
                  : ''),
            );
          }),
        ),
      );
    show.apply(null, parts);
  }

  function groupsScreen() {
    show(
      h('h1', null, T.groups),
      data.groups.length
        ? h(
            'ul',
            { class: 'list' },
            data.groups.map(function (g) {
              return h(
                'li',
                null,
                h(
                  'a',
                  { class: 'row', href: '#/g/' + g.id },
                  h(
                    'span',
                    { class: 'grow' },
                    h('span', { class: 'name' }, g.name),
                    h(
                      'span',
                      { class: 'sub' },
                      tr('members', g.members.length),
                    ),
                  ),
                ),
              );
            }),
          )
        : h('p', { class: 'muted' }, T.noGroups),
    );
  }

  function groupScreen(id) {
    var g = data.groups.find(function (x) {
      return x.id === id;
    });
    if (!g) return show(h('h1', null, T.notInCopy));
    var people = g.members
      .map(function (m) {
        return { c: byId(m[0]), role: m[1] };
      })
      .filter(function (x) {
        return x.c;
      });
    var nums = people
      .map(function (x) {
        return x.c.phones[0] ? dial(x.c.phones[0]) : null;
      })
      .filter(Boolean);
    show(
      h(
        'p',
        null,
        h('a', { href: '#/groups', class: 'muted small' }, T.backGroups),
      ),
      h('h1', null, g.name),
      h('p', { class: 'muted' }, tr('members', people.length)),
      nums.length
        ? h(
            'div',
            { class: 'actions' },
            h(
              'a',
              { class: 'btn primary', href: 'sms:' + nums.join(',') },
              T.textEveryone,
            ),
          )
        : null,
      h(
        'ul',
        { class: 'list' },
        people.map(function (x) {
          return personRow(
            x.c,
            [x.role, x.c.phones[0] && x.c.phones[0][0]]
              .filter(Boolean)
              .join(' · '),
          );
        }),
      ),
    );
  }

  function noCopy() {
    show(
      h('h1', null, T.offlineTitle),
      h('p', null, T.noCopy),
      h('p', { class: 'muted' }, T.noCopyHow),
      h(
        'p',
        null,
        h('a', { class: 'btn primary', href: '/today' }, T.tryAgain),
      ),
    );
    banner.textContent = T.noConnection;
    document.querySelector('.top nav').style.display = 'none';
  }

  // ---- routing -----------------------------------------------------------
  function route() {
    var hash = location.hash || '';
    if (!hash) {
      // Opened at a normal app address while offline: show the same place.
      var p = location.pathname;
      var m = p.match(/^\/contacts\/([0-9a-f-]{36})$/i);
      hash = m
        ? '#/c/' + m[1]
        : /^\/groups\/([0-9a-f-]{36})/i.test(p)
          ? '#/g/' + p.split('/')[2]
          : p.indexOf('/contacts') === 0
            ? '#/contacts'
            : p.indexOf('/groups') === 0
              ? '#/groups'
              : '#/today';
      history.replaceState(null, '', hash);
    }
    var parts = hash.slice(2).split('/');
    document.querySelectorAll('.top nav a').forEach(function (a) {
      var here =
        a.getAttribute('href').slice(2) ===
        (parts[0] === 'c' || parts[0] === 'new'
          ? 'contacts'
          : parts[0] === 'g'
            ? 'groups'
            : parts[0]);
      if (here) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (parts[0] === 'new') newScreen();
    else if (parts[0] === 'c') contactScreen(parts[1]);
    else if (parts[0] === 'contacts') contactsScreen('');
    else if (parts[0] === 'g') groupScreen(parts[1]);
    else if (parts[0] === 'groups') groupsScreen();
    else todayScreen();
  }

  // ---- load the copy -----------------------------------------------------
  function load(cb) {
    var on = false;
    try {
      on = localStorage.getItem(FLAG) === 'on';
    } catch {
      on = false;
    }
    if (!on || !window.indexedDB) return cb(null, null);
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () {
      req.result.createObjectStore('kv');
    };
    req.onerror = function () {
      cb(null, null);
    };
    req.onsuccess = function () {
      var db = req.result,
        store = db.transaction('kv').objectStore('kv');
      var s = store.get('snapshot'),
        i = store.get('info'),
        q = store.get('queue');
      q.onsuccess = function () {
        if (q.result && q.result.ops) queue = q.result;
      };
      s.onsuccess = function () {
        i.onsuccess = function () {
          db.close();
          cb(s.result || null, i.result || null);
        };
      };
      s.onerror = function () {
        db.close();
        cb(null, null);
      };
    };
  }

  load(function (snapshot, meta) {
    if (!snapshot || !snapshot.contacts) return noCopy();
    data = snapshot;
    info = meta;
    // Queued changes from another account never show or send here.
    if (queue.ownerId && queue.ownerId !== data.ownerId)
      queue = { ownerId: null, ops: [] };
    updateBanner();
    window.addEventListener('hashchange', route);
    route();
    if (navigator.onLine) sendChanges();
  });

  function updateBanner() {
    if (!data) return;
    banner.textContent = tr(
      'banner',
      undefined,
      info ? ago(info.savedAt) : T.earlier,
    );
    if (queue.ops.length) {
      banner.appendChild(h('strong', null, tr('queued', queue.ops.length)));
    }
    lastProblems.forEach(function (m) {
      banner.appendChild(
        h('span', { class: 'late' }, tr('notSaved', undefined, m)),
      );
    });
  }

  /** Back online: send waiting changes, refresh the copy, offer the full app. */
  var sending = false;
  function sendChanges() {
    if (sending || !data) return;
    sending = true;
    var sent = 0;
    var go = queue.ops.length
      ? fetch('/offline-sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ownerId: queue.ownerId, ops: queue.ops }),
        }).then(function (r) {
          if (r.status === 409) {
            queue = { ownerId: null, ops: [] };
            lastProblems = [T.otherAccount];
            return;
          }
          if (!r.ok) throw new Error('send ' + r.status);
          return r.json().then(function (body) {
            var keep = {};
            lastProblems = [];
            body.results.forEach(function (x) {
              if (x.status === 'retry') keep[x.opId] = true;
              if (x.status === 'ok') sent++;
              if (x.status === 'rejected')
                lastProblems.push(x.message || T.refused);
            });
            queue.ops = queue.ops.filter(function (o) {
              return keep[o.opId];
            });
          });
        })
      : Promise.resolve();
    go.then(function () {
      persist();
      return fetch('/offline-data', { cache: 'no-store' });
    })
      .then(function (r) {
        if (!r || !r.ok) return null;
        return r.text().then(function (t) {
          var fresh = JSON.parse(t);
          if (fresh.ownerId !== data.ownerId) return;
          data = fresh;
          info = {
            savedAt: new Date().toISOString(),
            bytes: t.length,
            contacts: fresh.contacts.length,
            etag: r.headers.get('etag') || undefined,
          };
          var req = indexedDB.open(DB_NAME, 1);
          req.onsuccess = function () {
            var db = req.result,
              tx = db.transaction('kv', 'readwrite');
            tx.objectStore('kv').put(data, 'snapshot');
            tx.objectStore('kv').put(info, 'info');
            tx.oncomplete = function () {
              db.close();
            };
          };
        });
      })
      .catch(function () {
        // Still offline, or the server is busy: try again next time.
      })
      .then(function () {
        sending = false;
        updateBanner();
        if (navigator.onLine) {
          banner.appendChild(document.createTextNode(' '));
          if (sent) banner.appendChild(h('strong', null, tr('sent', sent)));
          banner.appendChild(h('a', { href: '/today' }, T.backOnline));
        }
        route();
      });
  }

  window.addEventListener('online', sendChanges);
})();
