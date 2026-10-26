(function () {
  // Shared with the homepage coverage search (home-area-search.js), so both pages match postcodes the same way.
  function parseQuery(value) {
    var query = (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    // Postcode queries match the exact district ("SW11 1AA" -> "sw11"), so "SE1" doesn't also match SE10-SE28.
    var postcodeMatch = query.match(/^([a-z]{1,2}\d[a-z\d]?)(\s|$)/);
    return { query: query, outward: postcodeMatch ? postcodeMatch[1] : null };
  }

  function cardMatches(card, parsed) {
    var haystack = card.getAttribute('data-area-search') || '';
    var outward = parsed.outward;
    // A district also matches its lettered sub-districts ("ec1" -> EC1A-EC1Y), but never other numbers ("se1" !-> SE10).
    return outward
      ? haystack.split(' ').some(function (code) {
        return code === outward || (code.length === outward.length + 1 && code.indexOf(outward) === 0 && /[a-z]$/.test(code) && /\d$/.test(outward));
      })
      : haystack.indexOf(parsed.query) !== -1;
  }

  function expandCodes(card) {
    var more = card.querySelector('.area-card__more-item');
    if (!more) return;
    card.querySelectorAll('.area-card__codes li[hidden]').forEach(function (li) { li.hidden = false; });
    more.remove();
  }

  // Wires the collapsible round search button: open, close, Escape, and collapse on blur when empty.
  function initSearchBox(searchBox, input, searchToggle, searchClose, onChange) {
    function openSearch() {
      if (!searchBox) return;
      searchBox.classList.add('is-open');
      searchToggle.setAttribute('aria-expanded', 'true');
      input.focus();
    }

    function closeSearch() {
      if (!searchBox) return;
      searchBox.classList.remove('is-open');
      searchToggle.setAttribute('aria-expanded', 'false');
    }

    function clearAndCloseSearch() {
      input.value = '';
      onChange();
      closeSearch();
      if (searchToggle) searchToggle.focus();
    }

    [searchToggle, searchClose].forEach(function (btn) {
      // Keep focus in the field while pressing these buttons, so blur doesn't close the search first.
      if (btn) btn.addEventListener('mousedown', function (event) { event.preventDefault(); });
    });

    if (searchToggle) {
      searchToggle.addEventListener('click', function () {
        openSearch();
        onChange();
      });
    }

    if (searchClose) searchClose.addEventListener('click', clearAndCloseSearch);

    if (input) {
      input.addEventListener('input', onChange);
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') clearAndCloseSearch();
        if (event.key === 'Enter') event.preventDefault();
      });
      // Collapse when focus leaves an empty field (but not when moving to the toggle itself).
      input.addEventListener('blur', function () {
        setTimeout(function () {
          if (!input.value && searchBox && !searchBox.contains(document.activeElement)) closeSearch();
        }, 0);
      });
    }

    return { close: closeSearch };
  }

  window.AreaCoverage = {
    parseQuery: parseQuery,
    cardMatches: cardMatches,
    expandCodes: expandCodes,
    initSearchBox: initSearchBox
  };

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-area-tab]'));
  // Panels flagged data-area-excluded (Central London) stay in the markup but are never shown or searched.
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-area-panel]:not([data-area-excluded])'));
  var input = document.getElementById('area-search-input');
  var empty = document.getElementById('area-empty');
  var searchBox = document.getElementById('area-search');
  var searchToggle = document.getElementById('area-search-toggle');
  var searchClose = document.getElementById('area-search-close');
  if (!tabs.length || !panels.length) return;

  var activeId = tabs[0].getAttribute('data-area-tab');

  // Header counts come from the cards: boroughs = cards, postcodes = distinct chips (incl. the collapsed ones).
  panels.forEach(function (panel) {
    var cards = panel.querySelectorAll('.area-card');
    var seen = {};
    panel.querySelectorAll('.area-card__codes li:not(.area-card__more-item)').forEach(function (li) {
      seen[li.textContent.trim().toUpperCase()] = true;
    });
    var count = panel.querySelector('.area-group__count');
    var codes = panel.querySelector('.area-group__postcodes');
    if (count && !count.hasAttribute('data-count-static')) count.textContent = panel.querySelectorAll('.area-card:not([data-not-borough])').length + ' Boroughs';
    if (codes) codes.textContent = Object.keys(seen).length + ' postcodes';
  });

  function setActive(id, focus) {
    activeId = id;
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-area-tab') === id;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    render();
  }

  function render() {
    var parsed = parseQuery(input ? input.value : '');
    var anyMatch = false;

    panels.forEach(function (panel) {
      var cards = panel.querySelectorAll('.area-card');
      if (!parsed.query) {
        cards.forEach(function (card) { card.hidden = false; });
        panel.hidden = panel.getAttribute('data-area-panel') !== activeId;
        return;
      }

      var matches = 0;
      cards.forEach(function (card) {
        var hit = cardMatches(card, parsed);
        card.hidden = !hit;
        if (hit && parsed.outward) expandCodes(card);
        if (hit) matches++;
      });
      panel.hidden = matches === 0;
      if (matches) anyMatch = true;
    });

    if (empty) empty.hidden = !parsed.query || anyMatch;
  }

  var search = initSearchBox(searchBox, input, searchToggle, searchClose, render);

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      if (input && input.value) input.value = '';
      search.close();
      setActive(tab.getAttribute('data-area-tab'));
    });

    tab.addEventListener('keydown', function (event) {
      var next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      if (input && input.value) input.value = '';
      search.close();
      setActive(next.getAttribute('data-area-tab'), true);
    });
  });

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('.area-card__more');
    if (btn) expandCodes(btn.closest('.area-card'));
  });

  var hash = window.location.hash.replace('#', '');
  if (hash && tabs.some(function (tab) { return tab.getAttribute('data-area-tab') === hash; })) {
    setActive(hash);
  } else {
    setActive(activeId);
  }
})();
