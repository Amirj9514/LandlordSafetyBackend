(function () {
  var header = document.querySelector('.site-header');
  var megaMenu = document.getElementById('nav-mega');
  var megaItems = document.querySelectorAll('.nav-item--mega');
  var megaPanels = document.querySelectorAll('.nav-mega__panel');
  var servicesTabItems = document.querySelectorAll('.services-tabs__item');
  var desktopQuery = window.matchMedia('(min-width: 64rem)');

  if (!header) return;

  var megaHideTimer = null;
  var servicesMenuHideTimer = null;

  function isDesktop() {
    return desktopQuery.matches;
  }

  function activateServicesTab(tabKey) {
    if (!tabKey) return;

    var tabsRoot = document.querySelector('.services-tabs');
    if (!tabsRoot) return;

    tabsRoot.querySelectorAll('.services-tabs__btn').forEach(function (tab) {
      var isActive = tab.getAttribute('data-services-tab') === tabKey;
      tab.classList.toggle('services-tabs__btn--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-services-panel]').forEach(function (panel) {
      var isActive = panel.getAttribute('data-services-panel') === tabKey;
      panel.hidden = !isActive;
      panel.classList.toggle('services-grid--active', isActive);
    });
  }

  function showMegaPanel(panelKey) {
    if (!megaMenu || !panelKey) return;

    megaPanels.forEach(function (panel) {
      var isActive = panel.getAttribute('data-mega-panel') === panelKey;
      panel.hidden = !isActive;
    });

    megaItems.forEach(function (item) {
      item.classList.toggle('is-active', item.getAttribute('data-mega') === panelKey);
    });

    header.classList.add('site-header--mega-open');
    megaMenu.setAttribute('aria-hidden', 'false');
  }

  function hideMegaMenu() {
    if (!megaMenu) return;

    header.classList.remove('site-header--mega-open');
    megaMenu.setAttribute('aria-hidden', 'true');
    megaItems.forEach(function (item) {
      item.classList.remove('is-active');
    });
  }

  function scheduleHideMegaMenu() {
    clearTimeout(megaHideTimer);
    megaHideTimer = setTimeout(hideMegaMenu, 120);
  }

  function cancelHideMegaMenu() {
    clearTimeout(megaHideTimer);
  }

  function showServicesTabMenu(item) {
    servicesTabItems.forEach(function (other) {
      other.classList.toggle('is-menu-open', other === item);
      var menu = other.querySelector('.services-tabs__menu');
      if (menu) {
        menu.setAttribute('aria-hidden', other === item ? 'false' : 'true');
      }
    });
  }

  function hideServicesTabMenus() {
    servicesTabItems.forEach(function (item) {
      item.classList.remove('is-menu-open');
      var menu = item.querySelector('.services-tabs__menu');
      if (menu) menu.setAttribute('aria-hidden', 'true');
    });
  }

  function scheduleHideServicesTabMenus() {
    clearTimeout(servicesMenuHideTimer);
    servicesMenuHideTimer = setTimeout(hideServicesTabMenus, 120);
  }

  if (megaMenu && megaItems.length) {
    megaItems.forEach(function (item) {
      var panelKey = item.getAttribute('data-mega');
      var trigger = item.querySelector('.nav-link--dropdown');

      item.addEventListener('mouseenter', function () {
        if (!isDesktop()) return;
        cancelHideMegaMenu();
        showMegaPanel(panelKey);
      });

      if (trigger) {
        trigger.addEventListener('click', function (event) {
          if (!isDesktop()) {
            event.preventDefault();
            var isOpen = item.classList.contains('is-open');
            megaItems.forEach(function (other) {
              other.classList.remove('is-open');
            });
            if (!isOpen) item.classList.add('is-open');
            return;
          }

          var tabKey = trigger.getAttribute('data-services-tab-link');
          if (tabKey) activateServicesTab(tabKey);
        });
      }
    });

    header.addEventListener('mouseleave', function () {
      if (!isDesktop()) return;
      scheduleHideMegaMenu();
    });

    megaMenu.addEventListener('mouseenter', cancelHideMegaMenu);
    megaMenu.addEventListener('mouseleave', scheduleHideMegaMenu);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') hideMegaMenu();
    });

    megaMenu.querySelectorAll('[data-services-tab-link]').forEach(function (link) {
      link.addEventListener('click', function () {
        activateServicesTab(link.getAttribute('data-services-tab-link'));
        hideMegaMenu();
      });
    });

    document.querySelectorAll('[data-services-tab-link]').forEach(function (link) {
      if (megaMenu.contains(link)) return;
      link.addEventListener('click', function () {
        activateServicesTab(link.getAttribute('data-services-tab-link'));
      });
    });
  }

  if (servicesTabItems.length) {
    servicesTabItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        if (!isDesktop()) return;
        clearTimeout(servicesMenuHideTimer);
        showServicesTabMenu(item);
      });

      item.addEventListener('mouseleave', function () {
        if (!isDesktop()) return;
        scheduleHideServicesTabMenus();
      });
    });

    document.querySelectorAll('.services-tabs__menu [data-services-tab-link]').forEach(function (link) {
      link.addEventListener('click', function () {
        activateServicesTab(link.getAttribute('data-services-tab-link'));
        hideServicesTabMenus();
      });
    });
  }

  desktopQuery.addEventListener('change', function () {
    hideMegaMenu();
    hideServicesTabMenus();
    megaItems.forEach(function (item) {
      item.classList.remove('is-open');
    });
  });
})();

(function () {
  var menuToggle = document.querySelector('.site-header__menu-toggle');
  var navDrawer = document.getElementById('site-nav-drawer');
  var navBackdrop = document.querySelector('.site-header__backdrop');
  var drawerClose = document.querySelector('.site-header__drawer-close');

  if (!menuToggle || !navDrawer || !navBackdrop) return;

  function closeNavDrawer() {
    navDrawer.classList.remove('is-open');
    navBackdrop.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    navBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openNavDrawer() {
    navDrawer.classList.add('is-open');
    navBackdrop.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    navBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  menuToggle.addEventListener('click', function () {
    if (menuToggle.getAttribute('aria-expanded') === 'true') {
      closeNavDrawer();
    } else {
      openNavDrawer();
    }
  });

  navBackdrop.addEventListener('click', closeNavDrawer);

  if (drawerClose) {
    drawerClose.addEventListener('click', closeNavDrawer);
  }

  navDrawer.querySelectorAll('.nav-link, .site-header__drawer-cta').forEach(function (link) {
    link.addEventListener('click', function () {
      if (link.classList.contains('nav-link--dropdown') && window.matchMedia('(max-width: 63.99rem)').matches) {
        return;
      }
      closeNavDrawer();
    });
  });

  navDrawer.querySelectorAll('.nav-item__mobile-list a, .nav-item__mobile-all').forEach(function (link) {
    link.addEventListener('click', closeNavDrawer);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      closeNavDrawer();
    }
  });

  window.matchMedia('(min-width: 64rem)').addEventListener('change', function (event) {
    if (event.matches) closeNavDrawer();
  });
})();
