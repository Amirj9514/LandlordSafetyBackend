// Homepage coverage search. Read-only use of the Area Coverage page: its area cards are fetched from
// /area-coverage/ and matched with that page's own logic (window.AreaCoverage in /area-coverage.js),
// so there is one source of truth. Results open in a floating panel, so nothing in the section moves.
(function () {
  var AC = window.AreaCoverage;
  var form = document.getElementById('coverage-search-form');
  var input = document.getElementById('coverage-search-input');
  var clearBtn = document.getElementById('coverage-search-clear');
  var panel = document.getElementById('coverage-search-results');
  if (!form || !input || !panel) return;
  if (!AC) {
    console.error('Coverage search: /area-coverage.js did not load, so the search is unavailable.');
    return;
  }

  var list = panel.querySelector('.coverage-search__list');
  var FULL_POSTCODE = /^[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}$/i;
  var cards = null;
  var loading = null;

  function loadCoverage() {
    if (!loading) {
      loading = fetch('/area-coverage/', { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('Area coverage page returned ' + res.status);
          return res.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          cards = Array.prototype.slice.call(doc.querySelectorAll('[data-area-panel] .area-card'));
        })
        .catch(function (err) {
          console.error('Coverage search:', err);
          loading = null;
        });
    }
    return loading;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // The booking form pre-fills a full postcode from ?postcode=; otherwise it opens as it does now.
  function bookHref(raw) {
    var value = raw.trim();
    if (!FULL_POSTCODE.test(value)) return '/book-now/';
    var compact = value.replace(/\s+/g, '').toUpperCase();
    return '/book-now/?postcode=' + encodeURIComponent(compact.slice(0, -3) + ' ' + compact.slice(-3));
  }

  function resultRow(name, codes, raw) {
    var row = el('li', 'coverage-result');
    var info = el('div', 'coverage-result__info');
    info.appendChild(el('p', 'coverage-result__name', 'Yes, we cover ' + name));
    var chips = el('ul', 'area-card__codes coverage-result__codes');
    chips.setAttribute('aria-label', 'Postcodes covered in ' + name);
    codes.forEach(function (code) { chips.appendChild(el('li', '', code)); });
    info.appendChild(chips);
    row.appendChild(info);

    var cta = el('a', 'btn-primary btn-primary--header area-card__cta coverage-result__cta');
    cta.href = bookHref(raw);
    cta.appendChild(el('span', 'btn-primary__label', 'Book Now'));
    var arrow = el('span', 'btn-primary__arrow');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>';
    cta.appendChild(arrow);
    row.appendChild(cta);
    return row;
  }

  function notFoundRow() {
    var row = el('li', 'coverage-result coverage-result--none');
    var text = el('p', 'coverage-result__text');
    text.appendChild(document.createTextNode('We couldn’t find that area. Call us on '));
    var link = el('a', 'coverage-result__phone', '020 4581 8191');
    link.href = 'tel:+442045818191';
    text.appendChild(link);
    text.appendChild(document.createTextNode(' and we’ll confirm coverage for you.'));
    row.appendChild(text);
    return row;
  }

  function closePanel() {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function search() {
    var raw = input.value;
    var parsed = AC.parseQuery(raw);
    if (!parsed.query) {
      closePanel();
      return;
    }

    loadCoverage().then(function () {
      // Ignore a response for a query the user has since changed.
      if (!cards || input.value !== raw) return;

      // One row per area; the same area can sit in two Area Coverage groups (e.g. City of London).
      var areas = [];
      cards.filter(function (card) { return AC.cardMatches(card, parsed); }).forEach(function (card) {
        var name = ((card.querySelector('.area-card__name') || {}).textContent || '').trim();
        var area = areas.filter(function (a) { return a.name === name; })[0];
        if (!area) areas.push(area = { name: name, codes: [] });
        card.querySelectorAll('.area-card__codes li:not(.area-card__more-item)').forEach(function (li) {
          var code = li.textContent.trim();
          if (area.codes.indexOf(code) === -1) area.codes.push(code);
        });
      });

      list.innerHTML = '';
      if (areas.length) {
        areas.forEach(function (area) { list.appendChild(resultRow(area.name, area.codes, raw)); });
      } else {
        list.appendChild(notFoundRow());
      }
      panel.scrollTop = 0;
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    });
  }

  function syncClear() {
    if (clearBtn) clearBtn.hidden = !input.value;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    search();
  });

  // Searches on Enter or the Search button; clearing the field hides the result.
  input.addEventListener('input', function () {
    syncClear();
    if (!input.value.trim()) closePanel();
  });

  // Start loading as soon as the user shows interest, so the first answer appears without a wait.
  input.addEventListener('focus', loadCoverage);

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      // Keep the typed text; just close the panel (and stop the browser clearing the field).
      event.preventDefault();
      closePanel();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      syncClear();
      closePanel();
      input.focus();
    });
  }

  document.addEventListener('pointerdown', function (event) {
    if (!panel.hidden && !form.contains(event.target)) closePanel();
  });

  form.addEventListener('focusout', function () {
    setTimeout(function () {
      if (!form.contains(document.activeElement)) closePanel();
    }, 0);
  });

  syncClear();
})();
