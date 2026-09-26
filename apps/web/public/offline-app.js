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

  var DB_NAME = 'cs-offline';
  var FLAG = 'cs-offline';
  var data = null;
  var info = null;
  var main = document.getElementById('main');
  var banner = document.getElementById('banner');

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
      return new Intl.DateTimeFormat('en-KE', {
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
      ? 'today'
      : n === 1
        ? 'tomorrow'
        : n > 0
          ? 'in ' + n + ' days'
          : -n + (n === -1 ? ' day' : ' days') + ' late';
  }
  function ago(iso) {
    var m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 60) return m <= 1 ? 'just now' : m + ' min ago';
    var hrs = Math.round(m / 60);
    return hrs < 24 ? hrs + ' h ago' : Math.round(hrs / 24) + ' days ago';
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
    return p[1] || p[0];
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
          'aria-label': 'Call ' + c.name,
        },
        'Call',
      ),
      h(
        'a',
        { class: 'btn', href: 'sms:' + dial(p), 'aria-label': 'SMS ' + c.name },
        'SMS',
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
        extra || callButtons(c),
      ),
    );
  }

  // ---- screens -----------------------------------------------------------
  function contactsScreen(q) {
    var input = h('input', {
      type: 'search',
      placeholder: 'Name, skill, area, number…',
      'aria-label': 'Search contacts',
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
            ]
              .filter(Boolean)
              .join(' · '),
          ),
        );
      });
      count.textContent =
        found.length +
        (found.length === 1 ? ' contact' : ' contacts') +
        (found.length > 100
          ? ' — showing the first 100, search to narrow'
          : '');
    }
    input.addEventListener('input', render);
    render();
    show(h('h1', null, 'Contacts'), input, count, list);
  }

  function contactScreen(id) {
    var c = byId(id);
    if (!c)
      return show(
        h('h1', null, 'Not in the offline copy'),
        h(
          'p',
          { class: 'muted' },
          'It may be archived, in the trash, or added after the copy was made.',
        ),
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
        h('a', { href: '#/contacts', class: 'muted small' }, '← Contacts'),
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
            { class: 'chips', 'aria-label': 'Skills and services' },
            c.tags.map(function (x) {
              return h('li', null, x);
            }),
          )
        : null,
      c.phones.length ? h('h2', null, 'Phone') : null,
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
                      [p[2], i === 0 ? 'primary' : '']
                        .filter(Boolean)
                        .join(' · '),
                    ),
                  ),
                  h(
                    'a',
                    {
                      class: 'btn primary',
                      href: 'tel:' + dial(p),
                      'aria-label': 'Call ' + p[0],
                    },
                    'Call',
                  ),
                  h(
                    'a',
                    {
                      class: 'btn',
                      href: 'sms:' + dial(p),
                      'aria-label': 'SMS ' + p[0],
                    },
                    'SMS',
                  ),
                ),
              );
            }),
          )
        : null,
      c.emails.length ? h('h2', null, 'Email') : null,
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
              ? h('p', null, h('span', { class: 'muted' }, 'Area: '), c.area)
              : null,
            c.metThrough
              ? h(
                  'p',
                  null,
                  h('span', { class: 'muted' }, 'Met through: '),
                  c.metThrough,
                )
              : null,
            c.birthday
              ? h(
                  'p',
                  null,
                  h('span', { class: 'muted' }, 'Birthday: '),
                  fmtDay(c.birthday) + ' ' + c.birthday.slice(0, 4),
                )
              : null,
          )
        : null,
      groups.length ? h('h2', null, 'Groups') : null,
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
      follow.length ? h('h2', null, 'Follow-ups') : null,
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
                      fmtDay(f.dueOn) + ' · ' + rel(d),
                    ),
                  ),
                ),
              );
            }),
          )
        : null,
      c.notes ? h('h2', null, 'Notes') : null,
      c.notes ? h('p', { class: 'pre' }, c.notes) : null,
      h(
        'p',
        { class: 'muted small' },
        'To change this contact, open the app when you have data.',
      ),
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
    var parts = [h('h1', null, 'Today'), h('p', { class: 'muted' }, fmtDay(t))];
    if (!fu.length && !kit.length && !bd.length)
      parts.push(
        h('div', { class: 'card' }, h('p', null, 'Nothing due today.')),
      );
    if (fu.length)
      parts.push(
        h('h2', null, 'Follow up'),
        h(
          'ul',
          { class: 'list' },
          fu.map(function (x) {
            return personRow(x.c, x.f.note + ' · ' + rel(x.d));
          }),
        ),
      );
    if (kit.length)
      parts.push(
        h('h2', null, 'Keep in touch'),
        h(
          'ul',
          { class: 'list' },
          kit.map(function (x) {
            return personRow(
              x.c,
              x.over === 0
                ? 'due today'
                : x.over + (x.over === 1 ? ' day' : ' days') + ' overdue',
            );
          }),
        ),
      );
    if (bd.length)
      parts.push(
        h('h2', null, 'Birthdays'),
        h(
          'ul',
          { class: 'list' },
          bd.map(function (x) {
            return personRow(
              x.c,
              (x.b.daysAway === 0
                ? 'Today 🎉'
                : fmtDay(x.b.on) + ' · ' + rel(x.b.daysAway)) +
                (x.b.turning > 0 && x.b.turning < 130
                  ? ' · turns ' + x.b.turning
                  : ''),
            );
          }),
        ),
      );
    show.apply(null, parts);
  }

  function groupsScreen() {
    show(
      h('h1', null, 'Groups'),
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
                      g.members.length +
                        (g.members.length === 1 ? ' member' : ' members'),
                    ),
                  ),
                ),
              );
            }),
          )
        : h('p', { class: 'muted' }, 'No groups in the offline copy.'),
    );
  }

  function groupScreen(id) {
    var g = data.groups.find(function (x) {
      return x.id === id;
    });
    if (!g) return show(h('h1', null, 'Not in the offline copy'));
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
        h('a', { href: '#/groups', class: 'muted small' }, '← Groups'),
      ),
      h('h1', null, g.name),
      h(
        'p',
        { class: 'muted' },
        people.length + (people.length === 1 ? ' member' : ' members'),
      ),
      nums.length
        ? h(
            'div',
            { class: 'actions' },
            h(
              'a',
              { class: 'btn primary', href: 'sms:' + nums.join(',') },
              'Text everyone (SMS)',
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
      h('h1', null, 'You’re offline'),
      h('p', null, 'There is no copy of your contacts on this phone yet.'),
      h(
        'p',
        { class: 'muted' },
        'When you have data or Wi-Fi: open Profile → “Use it without data” → Keep a copy on this phone. After that, your contacts open here even with no bundle.',
      ),
      h(
        'p',
        null,
        h('a', { class: 'btn primary', href: '/today' }, 'Try again'),
      ),
    );
    banner.textContent = 'No connection.';
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
        (parts[0] === 'c'
          ? 'contacts'
          : parts[0] === 'g'
            ? 'groups'
            : parts[0]);
      if (here) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (parts[0] === 'c') contactScreen(parts[1]);
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
        i = store.get('info');
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
    banner.textContent =
      'No connection — your copy from ' +
      (info ? ago(info.savedAt) : 'earlier') +
      '. Calls and SMS use airtime.';
    window.addEventListener('hashchange', route);
    route();
  });

  // Back online: go back to the full app.
  window.addEventListener('online', function () {
    banner.textContent = 'You’re back online. ';
    banner.appendChild(h('a', { href: '/today' }, 'Open the full app'));
  });
})();
