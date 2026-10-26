/**
 * Terms & Conditions Contents: built from the page's section headings (.legal__heading), so it follows any
 * added, removed or renamed section. Headings keep an id (generated from the title if missing). The link for
 * the section in view is highlighted; the mobile dropdown closes after a link is tapped.
 */
(function () {
  var headings = Array.prototype.slice.call(document.querySelectorAll('.legal--toc .legal__heading'));
  var lists = Array.prototype.slice.call(document.querySelectorAll('[data-legal-toc]'));
  if (!headings.length || !lists.length) return;

  function slug(text) {
    return text.replace(/^\s*\d+\.\s*/, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  var used = {};
  headings.forEach(function (h) {
    if (!h.id) {
      var id = slug(h.textContent) || 'section';
      var unique = id, n = 2;
      while (used[unique] || document.getElementById(unique)) unique = id + '-' + n++;
      h.id = unique;
    }
    used[h.id] = true;
  });

  lists.forEach(function (list) {
    headings.forEach(function (h) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + h.id;
      link.textContent = h.textContent.trim();
      link.setAttribute('data-target', h.id);
      item.appendChild(link);
      list.appendChild(item);
    });
  });

  var links = Array.prototype.slice.call(document.querySelectorAll('[data-legal-toc] a'));

  function setActive(id) {
    links.forEach(function (link) {
      var on = link.getAttribute('data-target') === id;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
  }

  var ticking = false;
  function update() {
    ticking = false;
    var current = headings[0].id;
    headings.forEach(function (h) {
      if (h.getBoundingClientRect().top <= 160) current = h.id;
    });
    // Bottom of the page: the last section may be too short to reach the threshold.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = headings[headings.length - 1].id;
    setActive(current);
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();

  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-legal-toc] a');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('data-target'));
    if (!target) return;
    event.preventDefault();
    // In the mobile dropdown, close first and then scroll: closing the list moves the page content up, so
    // scrolling to the heading before it closes would overshoot.
    var details = link.closest('details');
    if (details) details.removeAttribute('open');
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.history && history.replaceState) history.replaceState(null, '', link.getAttribute('href'));
    });
  });
})();
