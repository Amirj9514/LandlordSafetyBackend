/**
 * Book-now UI helpers: UK phone / postcode formatting + validation, congestion-zone detection,
 * the preferred-date calendar, info tooltips and the review-step terms checkbox.
 * Loaded after book-now-api.js; everything is exposed on window.BN.
 */
(function () {
  'use strict';

  const BN = (window.BN = window.BN || {});
  const $ = (id) => document.getElementById(id);

  // ═══════════════════════════════════════════════════
  // FIELD ERRORS
  // ═══════════════════════════════════════════════════
  function setError(inputEl, errId, message) {
    if (inputEl) inputEl.classList.add('field-error');
    const err = $(errId);
    if (err) {
      if (message) err.textContent = message;
      err.style.display = 'block';
    }
  }

  function clearError(inputEl, errId) {
    if (inputEl) inputEl.classList.remove('field-error');
    const err = $(errId);
    if (err) err.style.display = 'none';
  }

  BN.setError = setError;
  BN.clearError = clearError;

  // ═══════════════════════════════════════════════════
  // UK PHONE NUMBERS
  // ═══════════════════════════════════════════════════
  // Returns the number in national form (07… / 01… / 02… / 03…) and whether it was typed as +44.
  function toNational(raw) {
    let s = String(raw || '').replace(/[^\d+]/g, '');
    let intl = false;
    if (s.startsWith('+44')) {
      s = '0' + s.slice(3).replace(/^0/, '');
      intl = true;
    } else if (s.startsWith('0044')) {
      s = '0' + s.slice(4).replace(/^0/, '');
      intl = true;
    }
    return { national: s.replace(/\+/g, ''), intl };
  }

  function group(digits, sizes) {
    const out = [];
    let i = 0;
    for (const n of sizes) {
      if (i >= digits.length) break;
      out.push(digits.slice(i, i + n));
      i += n;
    }
    if (i < digits.length) out.push(digits.slice(i));
    return out.join(' ');
  }

  function formatPhone(raw, kind) {
    const text = String(raw || '').trim();
    if (!text) return '';
    // Still typing the "+44" prefix.
    if (/^\+(4(4)?)?$/.test(text)) return text;

    const { national, intl } = toNational(text);
    if (!national) return text;
    const isMobile = kind === 'mobile' || (kind === 'any' && /^07/.test(national));
    const rest = national.slice(1);

    let sizes;
    if (isMobile) sizes = intl ? [4, 6] : [5, 6];
    else if (/^02/.test(national)) sizes = intl ? [2, 4, 4] : [3, 4, 4];
    else if (/^03/.test(national)) sizes = intl ? [3, 3, 4] : [4, 3, 4];
    else sizes = intl ? [4, 6] : [5, 6];

    return intl ? ('+44 ' + group(rest, sizes)).trim() : group(national, sizes);
  }

  function isValidMobile(raw) {
    return /^07\d{9}$/.test(toNational(raw).national);
  }

  function isValidLandline(raw) {
    return /^0[123]\d{8,9}$/.test(toNational(raw).national);
  }

  BN.formatPhone = formatPhone;
  BN.isValidMobile = isValidMobile;
  BN.isValidLandline = isValidLandline;
  BN.isValidAnyPhone = (raw) => isValidMobile(raw) || isValidLandline(raw);

  const MOBILE_MSG = 'Enter a valid UK mobile number (07… or +44 7…).';
  const LANDLINE_MSG = 'Landline must be a UK number starting 01, 02 or 03.';

  function attachPhone(el) {
    const kind = el.dataset.phoneType;
    el.addEventListener('input', () => {
      if (el.selectionStart !== el.value.length) return;
      const next = formatPhone(el.value, kind);
      if (next !== el.value) el.value = next;
    });
    el.addEventListener('blur', () => {
      el.value = formatPhone(el.value, kind);
    });
  }

  // prefix: '' for step 1 (phone / phone2), 'b-' for step 3.
  BN.validatePhones = function validatePhones(prefix) {
    const mobile = $(prefix + 'phone');
    const landline = $(prefix + 'phone2');
    const mv = mobile?.value.trim() || '';
    const lv = landline?.value.trim() || '';
    clearError(mobile, prefix + 'phone-error');
    clearError(landline, prefix + 'phone2-error');

    let ok = true;
    if (!mv && !lv) {
      setError(mobile, prefix + 'phone-error', 'Enter a mobile or landline number.');
      ok = false;
    } else {
      if (mv && !isValidMobile(mv)) {
        setError(mobile, prefix + 'phone-error', MOBILE_MSG);
        ok = false;
      }
      if (lv && !isValidLandline(lv)) {
        setError(landline, prefix + 'phone2-error', LANDLINE_MSG);
        ok = false;
      }
    }
    return ok;
  };

  function setPhone2Visible(prefix, visible) {
    $(prefix + 'phone2-row')?.classList.toggle('hidden', !visible);
    $(prefix + 'add-phone-btn')?.classList.toggle('hidden', visible);
    if (!visible) {
      const land = $(prefix + 'phone2');
      if (land) land.value = '';
      clearError(land, prefix + 'phone2-error');
      if ($(prefix + 'pref-mobile')) $(prefix + 'pref-mobile').checked = true;
    }
    updatePhoneStar(prefix);
  }

  BN.showPhone2 = function showPhone2(prefix) {
    setPhone2Visible(prefix, true);
    $(prefix + 'phone2')?.focus();
  };

  BN.hidePhone2 = function hidePhone2(prefix) {
    setPhone2Visible(prefix, false);
    if (prefix === '' && typeof window.updateStep1NextState === 'function') window.updateStep1NextState();
  };

  // Mobile is only required while no landline has been entered.
  function updatePhoneStar(prefix) {
    const star = $(prefix + 'phone-star');
    const lv = $(prefix + 'phone2')?.value.trim();
    if (star) star.classList.toggle('hidden', Boolean(lv));
  }

  BN.onPhoneInput = function onPhoneInput(prefix) {
    updatePhoneStar(prefix);
  };

  // Reveal the landline field when it already holds a value (e.g. copied from step 1).
  BN.syncPhone2Visibility = function syncPhone2Visibility(prefix) {
    const hasValue = Boolean($(prefix + 'phone2')?.value.trim());
    const open = hasValue || !$(prefix + 'phone2-row')?.classList.contains('hidden');
    setPhone2Visible(prefix, open);
  };

  // Step 3 inherits the preferred-contact choice made in step 1.
  BN.copyPreferred = function copyPreferred() {
    const landline = $('pref-landline')?.checked && !$('phone2-row')?.classList.contains('hidden');
    const target = $(landline ? 'b-pref-landline' : 'b-pref-mobile');
    if (target) target.checked = true;
  };

  // One-line appointment address: Line 1, Line 2, Town/City, County/State/Region, Postcode, Country.
  BN.fullAddress = function fullAddress() {
    const v = (id) => $(id)?.value?.trim() || '';
    return [v('b-address'), v('b-address2'), v('b-city'), v('b-county'), v('b-postcode') || v('postcode'), v('b-country')]
      .filter(Boolean)
      .join(', ');
  };

  // ═══════════════════════════════════════════════════
  // UK POSTCODES
  // ═══════════════════════════════════════════════════
  const POSTCODE_RE = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2})$/;

  function compactPostcode(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function formatPostcode(raw) {
    const s = compactPostcode(raw);
    if (s.length < 5) return String(raw || '').toUpperCase();
    return s.slice(0, -3) + ' ' + s.slice(-3);
  }

  BN.formatPostcode = formatPostcode;
  BN.isValidPostcode = (raw) => POSTCODE_RE.test(formatPostcode(raw));

  function attachPostcode(el) {
    el.addEventListener('input', () => {
      const atEnd = el.selectionStart === el.value.length;
      const start = el.selectionStart;
      const upper = el.value.toUpperCase();
      if (upper !== el.value) {
        el.value = upper;
        if (!atEnd) el.setSelectionRange(start, start);
      }
      // Only auto-space once it is a complete postcode, so "SW18" is never split mid-typing.
      if (atEnd && BN.isValidPostcode(el.value)) {
        const next = formatPostcode(el.value);
        if (next !== el.value) el.value = next;
      }
      if (typeof window.syncField === 'function') window.syncField('postcode');
    });
    el.addEventListener('blur', () => {
      el.value = formatPostcode(el.value);
      if (typeof window.syncField === 'function') window.syncField('postcode');
    });
  }

  // ═══════════════════════════════════════════════════
  // LONDON CONGESTION CHARGE ZONE (EC, WC and central W1, SW1, SE1, N1, NW1, E1)
  // ═══════════════════════════════════════════════════
  const CONGESTION_RE = /^(EC\d[A-Z]?|WC\d[A-Z]?|W1[A-Z]|SW1[A-Z]?|SE1[A-Z]?|N1[A-Z]?|NW1[A-Z]?|E1[A-Z]?)$/;

  BN.inCongestionZone = function inCongestionZone(postcode) {
    const compact = compactPostcode(postcode);
    if (compact.length < 5) return false;
    return CONGESTION_RE.test(compact.slice(0, -3));
  };

  BN.zoneClick = function zoneClick(val) {
    state.zoneManualFor = formatPostcode($('postcode')?.value || '');
    window.selectZone(val);
  };

  // ═══════════════════════════════════════════════════
  // DATES
  // ═══════════════════════════════════════════════════
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toIso(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function fromIso(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  // "Fri 23 Oct 2026"
  BN.fmtDateUK = function fmtDateUK(iso) {
    const d = fromIso(iso);
    if (!d) return '';
    return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  };

  function startOfToday() {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }

  // Last bookable day: two months from today.
  function maxDate() {
    const t = startOfToday();
    const d = new Date(t.getFullYear(), t.getMonth() + 2, t.getDate());
    // e.g. 31 Dec + 2 months overflowing a short month -> clamp to the month's last day
    if (d.getDate() !== t.getDate()) d.setDate(0);
    return d;
  }

  // Weekends, today, past dates and dates beyond the limit cannot be chosen. Bank holidays stay available.
  function isSelectable(d) {
    const day = d.getDay();
    return day !== 0 && day !== 6 && d > startOfToday() && d <= maxDate();
  }

  const calendar = { viewYear: 0, viewMonth: 0 };

  function renderCalendar() {
    const pop = $('date-pop');
    if (!pop) return;
    const today = startOfToday();
    const selected = $('b-date')?.value || '';
    const first = new Date(calendar.viewYear, calendar.viewMonth, 1);
    const daysInMonth = new Date(calendar.viewYear, calendar.viewMonth + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday-first grid
    const atCurrentMonth = calendar.viewYear === today.getFullYear() && calendar.viewMonth === today.getMonth();
    const limit = maxDate();
    const atLastMonth = calendar.viewYear === limit.getFullYear() && calendar.viewMonth === limit.getMonth();

    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="date-cal__blank"></span>';
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calendar.viewYear, calendar.viewMonth, day);
      const iso = toIso(d);
      const ok = isSelectable(d);
      cells += `<button type="button" class="date-cal__day${iso === selected ? ' is-selected' : ''}" data-date="${iso}"${ok ? '' : ' disabled'} aria-label="${BN.fmtDateUK(iso)}">${day}</button>`;
    }

    pop.innerHTML = `
      <div class="date-cal__head">
        <button type="button" class="date-cal__nav" data-nav="-1" aria-label="Previous month"${atCurrentMonth ? ' disabled' : ''}>&lsaquo;</button>
        <div class="date-cal__title">${MONTH_LONG[calendar.viewMonth]} ${calendar.viewYear}</div>
        <button type="button" class="date-cal__nav" data-nav="1" aria-label="Next month"${atLastMonth ? ' disabled' : ''}>&rsaquo;</button>
      </div>
      <div class="date-cal__dow"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
      <div class="date-cal__grid">${cells}</div>`;
  }

  function openCalendar() {
    const pop = $('date-pop');
    if (!pop) return;
    const base = fromIso($('b-date')?.value) || startOfToday();
    calendar.viewYear = base.getFullYear();
    calendar.viewMonth = base.getMonth();
    renderCalendar();
    pop.classList.remove('hidden');
    $('b-date-display')?.setAttribute('aria-expanded', 'true');
  }

  function closeCalendar() {
    $('date-pop')?.classList.add('hidden');
    $('b-date-display')?.setAttribute('aria-expanded', 'false');
  }

  BN.setDate = function setDate(iso) {
    const hidden = $('b-date');
    const display = $('b-date-display');
    if (hidden) hidden.value = iso || '';
    if (display) display.value = iso ? BN.fmtDateUK(iso) : '';
    if (iso) clearError(display, 'b-date-error');
  };

  function initDatePicker() {
    const display = $('b-date-display');
    const pop = $('date-pop');
    if (!display || !pop) return;

    display.addEventListener('click', () => (pop.classList.contains('hidden') ? openCalendar() : closeCalendar()));
    display.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openCalendar();
      } else if (e.key === 'Escape') {
        closeCalendar();
      }
    });

    pop.addEventListener('click', (e) => {
      // Re-rendering detaches the clicked button, so stop the document handler from treating it as an outside click.
      e.stopPropagation();
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        if (nav.disabled) return;
        const m = calendar.viewMonth + Number(nav.dataset.nav);
        const d = new Date(calendar.viewYear, m, 1);
        calendar.viewYear = d.getFullYear();
        calendar.viewMonth = d.getMonth();
        renderCalendar();
        return;
      }
      const dayBtn = e.target.closest('[data-date]');
      if (dayBtn && !dayBtn.disabled) {
        BN.setDate(dayBtn.dataset.date);
        closeCalendar();
        display.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#date-field')) closeCalendar();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCalendar();
    });
  }

  // ═══════════════════════════════════════════════════
  // INFO TOOLTIPS
  // ═══════════════════════════════════════════════════
  // Keep the tooltip inside the viewport (it is centred on the icon by default).
  function positionTip(tip) {
    const text = tip?.querySelector('.info-tip__text');
    if (!text || tip.closest('.corner')) return;
    text.style.transform = '';
    const rect = text.getBoundingClientRect();
    const margin = 12;
    let dx = 0;
    if (rect.right > window.innerWidth - margin) dx = window.innerWidth - margin - rect.right;
    if (rect.left + dx < margin) dx = margin - rect.left;
    if (dx) text.style.transform = 'translateX(calc(-50% + ' + dx + 'px))';
  }

  function initTips() {
    document.addEventListener('click', (e) => {
      const tip = e.target.closest('.info-tip');
      document.querySelectorAll('.info-tip.is-open').forEach((el) => {
        if (el !== tip) el.classList.remove('is-open');
      });
      if (tip) {
        e.preventDefault();
        tip.classList.toggle('is-open');
        positionTip(tip);
      }
    });
    document.addEventListener('mouseover', (e) => positionTip(e.target.closest?.('.info-tip')));
    document.addEventListener('focusin', (e) => positionTip(e.target.closest?.('.info-tip')));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.info-tip.is-open').forEach((el) => el.classList.remove('is-open'));
    });
  }

  // ═══════════════════════════════════════════════════
  // STEP 3 NAME (single field kept in sync with the hidden first / last name inputs)
  // ═══════════════════════════════════════════════════
  BN.syncBookingName = function syncBookingName() {
    const full = $('b-fullName')?.value.trim() || '';
    const parts = full.split(/\s+/).filter(Boolean);
    if ($('b-firstName')) $('b-firstName').value = parts[0] || '';
    if ($('b-lastName')) $('b-lastName').value = parts.slice(1).join(' ');
    if (full) clearError($('b-fullName'), 'b-fullName-error');
  };

  // ═══════════════════════════════════════════════════
  // REVIEW STEP
  // ═══════════════════════════════════════════════════
  BN.onTermsChange = function onTermsChange() {
    const box = $('terms-agree');
    const btn = $('btn-submit-booking');
    const err = $('terms-error');
    if (err) err.style.display = 'none';
    if (btn && !btn.classList.contains('is-loading')) btn.disabled = !box?.checked;
  };

  BN.editLine = function editLine(code) {
    if (typeof window.editSelection === 'function') window.editSelection('service', code);
  };

  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    document.querySelectorAll('input[data-phone-type]').forEach(attachPhone);
    const pc = $('postcode');
    if (pc) {
      attachPostcode(pc);
      if (pc.value) pc.value = formatPostcode(pc.value);
    }
    const mobile = $('phone');
    if (mobile && mobile.value) mobile.value = formatPhone(mobile.value, 'mobile');
    initDatePicker();
    initTips();
    BN.syncPhone2Visibility('');
    BN.syncPhone2Visibility('b-');
    BN.onTermsChange();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
