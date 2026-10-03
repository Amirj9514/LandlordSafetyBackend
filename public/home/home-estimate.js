/**
 * Instant Estimate: catalog from GET /api/catalog, price from POST /api/quotes/preview.
 * Desktop: category accordion + side calculator.
 * Mobile/tablet: per-service cards with Get Estimate / Hide Calculator accordion.
 */
(function () {
  const API = '/api';
  const PROPERTY_TYPE = 'residential';
  // Used only to fetch indicative "from" prices while the postcode field is empty; never shown in the field.
  const DEFAULT_POSTCODE = 'SW1A 1AA';
  const MOBILE_MQ = '(max-width: 63.99rem)';
  const CACHE_KEY = 'lsi-estimate-catalog-v1';
  const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

  // Residential services (mirrors src/scripts/seed/catalogData.js) so the list renders instantly
  // on a first visit; the live catalog replaces it as soon as it loads.
  const FALLBACK_CATALOG = {
    categories: [
      { code: 'res_gas', name: 'Gas', displayOrder: 1, services: [
        { code: 'gsc', name: 'Gas Safety Certificate (CP12)', displayOrder: 1 },
        { code: 'boiler', name: 'Boiler Service', displayOrder: 2 },
      ] },
      { code: 'res_fire', name: 'Fire Safety', displayOrder: 2, services: [
        { code: 'fsc', name: 'Fire Alarm Certificate (FSC)', displayOrder: 1 },
        { code: 'elc', name: 'Emergency Light Certificate (ELC)', displayOrder: 2 },
        { code: 'fra', name: 'Fire Safety Risk Assessment (FRA)', displayOrder: 3 },
      ] },
      { code: 'res_electrical', name: 'Electrical', displayOrder: 3, services: [
        { code: 'eicr', name: 'Electrical Installation Condition Report (EICR)', displayOrder: 1 },
        { code: 'pat', name: 'Portable Appliance Test (PAT)', displayOrder: 2 },
      ] },
      { code: 'res_epc', name: 'EPC & Survey', displayOrder: 4, services: [
        { code: 'epc', name: 'Energy Performance Certificate (EPC)', displayOrder: 1 },
        { code: 'floorplan', name: 'Floor Plan', displayOrder: 2 },
      ] },
      { code: 'res_other', name: 'Other', displayOrder: 5, services: [
        { code: 'asbestos', name: 'Asbestos Survey', displayOrder: 1 },
      ] },
    ],
  };

  const SERVICE_BLURBS = {
    gsc: 'Annual landlord requirement',
    boiler: 'Certificate plus boiler health check',
    eicr: 'Electrical safety for rentals',
    pat: 'Portable appliance testing',
    fsc: 'Fire alarm certification',
    elc: 'Emergency lighting certificate',
    fra: 'Fire risk assessment for landlords',
    epc: 'Energy performance certificate',
    floorplan: 'Measured floor plan',
    asbestos: 'Asbestos survey',
  };

  const FIELD_LABELS = {
    applianceCount: 'Gas appliances',
    bedrooms: 'Number of bedrooms',
    communalAreas: 'Number of communal areas',
    fuseBoards: 'Number of fuse boards',
    floors: 'Number of floors',
    boilerType: 'Service type',
  };

  const els = {
    layout: document.querySelector('.estimate-layout'),
    categories: document.getElementById('estimate-categories'),
    selectedName: document.getElementById('estimate-selected-name'),
    postcode: document.getElementById('estimate-postcode'),
    coverage: document.getElementById('estimate-coverage'),
    questions: document.getElementById('estimate-questions'),
    priceDetail: document.getElementById('estimate-price-detail'),
    priceAmount: document.getElementById('estimate-price-amount'),
    bookCta: document.getElementById('estimate-book-cta'),
    calc: document.querySelector('.estimate-calc'),
  };

  if (!els.categories || !els.postcode) return;

  let catalog = null;
  // catalogReady: questions are known (live or cached catalog), so previews can run.
  let catalogReady = false;
  // pricesLoading: live prices for the current postcode haven't arrived yet.
  let pricesLoading = true;
  let catalogSeq = 0;
  let selectedCategoryCode = null;
  let selectedServiceCode = null;
  let expandedMobileCode = null;
  let answers = {};
  let previewTimer = null;
  let previewSeq = 0;
  let postcodeTimer = null;
  const media = window.matchMedia(MOBILE_MQ);

  function isMobileLayout() {
    return media.matches;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtMoney(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return '—';
    return '£' + (Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, ''));
  }

  function normalizePostcode(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
  }

  // What the user actually typed (may be empty).
  function typedPostcode() {
    const mobileInput = document.getElementById('estimate-postcode-mobile');
    if (isMobileLayout() && mobileInput) return normalizePostcode(mobileInput.value);
    return normalizePostcode(els.postcode.value);
  }

  // Postcode used for pricing: the typed one when complete, otherwise the indicative default.
  function getPostcode() {
    const typed = typedPostcode();
    return UK_POSTCODE.test(typed) ? typed : DEFAULT_POSTCODE;
  }

  function readCachedCatalog() {
    try {
      const data = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return Array.isArray(data?.categories) && data.categories.length ? data : null;
    } catch {
      return null;
    }
  }

  function writeCachedCatalog(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked: the fallback list still works.
    }
  }

  function listLeafServices(category) {
    return (category.services || [])
      .filter((svc) => !svc.children?.length)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  function allLeafServices() {
    if (!catalog) return [];
    const list = [];
    const categories = [...(catalog.categories || [])].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );
    for (const cat of categories) {
      for (const svc of listLeafServices(cat)) list.push(svc);
    }
    return list;
  }

  function findService(code) {
    if (!catalog || !code) return null;
    for (const cat of catalog.categories || []) {
      for (const svc of cat.services || []) {
        if (svc.code === code) return svc;
      }
    }
    return null;
  }

  function findCategoryForService(code) {
    if (!catalog || !code) return null;
    for (const cat of catalog.categories || []) {
      if ((cat.services || []).some((svc) => svc.code === code)) return cat;
    }
    return null;
  }

  function optionLabel(opt, fieldKey) {
    if (!opt) return '';
    if (fieldKey === 'communalAreas') {
      const value = String(opt.value ?? '');
      if (value === '5') return '5+';
      return value || String(opt.label || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
    }
    if (fieldKey === 'bedrooms') {
      const value = String(opt.value ?? '');
      if (value === 'studio') return 'Studio';
      if (value === '7+') return '7+';
      const cleaned = String(opt.label || opt.displayLabel || value)
        .replace(/\s*[—–-]\s*£[\d,.]+.*$/i, '')
        .replace(/\s*\([^)]*\)\s*/g, '')
        .replace(/\s*bedrooms?\s*/gi, '')
        .trim();
      return cleaned || value;
    }
    if (fieldKey === 'applianceCount') {
      return String(opt.value ?? opt.label ?? '');
    }
    const raw = opt.displayLabel || opt.label || opt.value;
    return String(raw).replace(/\s*[—–-]\s*£[\d,.]+.*$/i, '').trim();
  }

  function questionLabel(q) {
    return FIELD_LABELS[q.fieldKey] || q.label || q.fieldKey;
  }

  function serviceFromPrice(service) {
    let lowest = null;
    let anyTbc = false;
    for (const q of service.questions || []) {
      for (const opt of q.options || []) {
        if (opt.isTbc) anyTbc = true;
        if (opt.price != null && opt.price !== '' && Number(opt.price) > 0) {
          const amount = Number(opt.price);
          if (lowest == null || amount < lowest) lowest = amount;
        }
      }
    }
    if (lowest != null) return { text: 'from ' + fmtMoney(lowest), amount: lowest };
    if (service.metadata?.startsFrom != null) {
      return { text: 'from ' + fmtMoney(service.metadata.startsFrom), amount: Number(service.metadata.startsFrom) };
    }
    if (anyTbc || service.pricingMode === 'quote_only') return { text: 'Quote', amount: null };
    return { text: 'from TBC', amount: null };
  }

  function priceHtml(service, className) {
    if (pricesLoading) {
      return `<span class="${className} estimate-price--loading" aria-hidden="true"></span>`;
    }
    return `<span class="${className}">${escapeHtml(serviceFromPrice(service).text)}</span>`;
  }

  // Update every "from £…" label without re-rendering (keeps focus, open panels and answers).
  function updatePricesInPlace() {
    els.categories
      .querySelectorAll('.estimate-service__price, .estimate-mcard__from')
      .forEach((el) => {
        const code = el.closest('[data-service]')?.getAttribute('data-service');
        const service = findService(code);
        if (!service) return;
        el.classList.toggle('estimate-price--loading', pricesLoading);
        el.toggleAttribute('aria-hidden', pricesLoading);
        el.textContent = pricesLoading ? '' : serviceFromPrice(service).text;
      });
  }

  function questionsSkeletonHtml() {
    return `
      <div class="estimate-questions__skeleton" aria-hidden="true">
        <span class="estimate-price--loading"></span>
        <span class="estimate-price--loading"></span>
      </div>`;
  }

  function serviceDescription(service) {
    const meta = service.metadata || {};
    return (
      meta.shortDescription ||
      meta.description ||
      meta.tagline ||
      meta.subtitle ||
      SERVICE_BLURBS[service.code] ||
      ''
    );
  }

  function visibleQuestions(service) {
    return (service.questions || [])
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .filter((q) => {
        if (q.inputType === 'textarea') return false;
        const showWhen = q.conditionalLogic?.showWhen;
        if (showWhen) return answers[showWhen.field] === showWhen.equals;
        const hideWhen = q.conditionalLogic?.hideWhen;
        if (hideWhen && answers[hideWhen.field] === hideWhen.equals) return false;
        return true;
      });
  }

  function defaultAnswersForService(service) {
    const next = {};
    for (const q of service.questions || []) {
      if (q.inputType === 'number') {
        const min = q.validation?.min ?? 1;
        next[q.fieldKey] = String(min);
        continue;
      }
      if (q.options?.length) {
        if (q.fieldKey === 'coAlarmPresent') {
          const yes = q.options.find((o) => o.value === 'yes');
          next[q.fieldKey] = (yes || q.options[0]).value;
          continue;
        }
        if (q.fieldKey === 'coAlarmInstall') {
          const no = q.options.find((o) => o.value === 'no');
          next[q.fieldKey] = (no || q.options[0]).value;
          continue;
        }
        next[q.fieldKey] = q.options[0].value;
      }
    }
    return next;
  }

  function useChipUi(question) {
    if (!question?.options?.length) return false;
    if (question.options.length > 8) return false;
    return question.options.every(
      (opt) => String(optionLabel(opt, question.fieldKey) || opt.value).length <= 12
    );
  }

  async function fetchCatalog(postcode) {
    let url = `${API}/catalog?propertyType=${encodeURIComponent(PROPERTY_TYPE)}`;
    if (postcode) url += `&postcode=${encodeURIComponent(postcode)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to load services');
    return json.data;
  }

  async function fetchPreview() {
    const service = findService(selectedServiceCode);
    if (!service) return null;

    const payload = {
      propertyType: PROPERTY_TYPE,
      postcode: getPostcode(),
      services: [{ code: service.code, answers: { ...answers } }],
      parkingAvailable: true,
      congestionZone: false,
    };

    const res = await fetch(`${API}/quotes/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Could not calculate price');
    return json.data;
  }

  function setCoverage(state, message, targetEl) {
    const targets = targetEl
      ? [targetEl]
      : [els.coverage, document.getElementById('estimate-coverage-mobile')].filter(Boolean);

    targets.forEach((el) => {
      if (!message) {
        el.hidden = true;
        el.textContent = '';
        el.className = 'estimate-field__status';
        return;
      }
      el.hidden = false;
      el.className = 'estimate-field__status estimate-field__status--' + state;
      if (state === 'success') {
        el.innerHTML =
          `<span class="estimate-field__status-icon" aria-hidden="true">` +
          `<img src="icons/circle_tick.svg" alt="" width="14" height="14">` +
          `</span>` +
          `<span class="estimate-field__status-text">${escapeHtml(message)}</span>`;
      } else {
        el.innerHTML = `<span class="estimate-field__status-text">${escapeHtml(message)}</span>`;
      }
    });
  }

  function bookHref() {
    const params = new URLSearchParams();
    params.set('propertyType', PROPERTY_TYPE);
    if (selectedServiceCode) params.set('service', selectedServiceCode);
    // Only pass on a postcode the user actually entered.
    const pc = typedPostcode();
    if (UK_POSTCODE.test(pc)) params.set('postcode', pc);
    const qs = params.toString();
    return qs ? `/book-now/?${qs}` : '/book-now/';
  }

  function updateBookLink() {
    const href = bookHref();
    if (els.bookCta) els.bookCta.href = href;
    document.querySelectorAll('.estimate-mcard__book').forEach((el) => {
      el.href = href;
    });
  }

  function questionsHtml(service) {
    const questions = visibleQuestions(service).filter((q) =>
      ['select', 'radio', 'number'].includes(q.inputType)
    );

    return questions
      .map((q) => {
        const current = answers[q.fieldKey];
        const label = questionLabel(q);
        if (q.inputType === 'number') {
          return `
            <div class="estimate-field">
              <label class="field-label" for="estimate-q-${escapeHtml(q.fieldKey)}">${escapeHtml(label)}</label>
              <input class="field-input estimate-select-input" type="number" id="estimate-q-${escapeHtml(q.fieldKey)}"
                data-field="${escapeHtml(q.fieldKey)}" min="${q.validation?.min ?? 1}" max="${q.validation?.max ?? 100}"
                value="${escapeHtml(current ?? '')}">
            </div>`;
        }

        if (useChipUi(q)) {
          return `
            <fieldset class="estimate-field">
              <legend class="field-label">${escapeHtml(label)}</legend>
              <div class="estimate-chips">
                ${q.options
                  .map((opt) => {
                    const checked = String(current) === String(opt.value) ? ' checked' : '';
                    return `
                      <label class="estimate-chip">
                        <input type="radio" name="estimate-${escapeHtml(q.fieldKey)}" value="${escapeHtml(opt.value)}" data-field="${escapeHtml(q.fieldKey)}"${checked}>
                        <span>${escapeHtml(optionLabel(opt, q.fieldKey) || opt.value)}</span>
                      </label>`;
                  })
                  .join('')}
              </div>
            </fieldset>`;
        }

        return `
          <div class="estimate-field">
            <label class="field-label" for="estimate-q-${escapeHtml(q.fieldKey)}">${escapeHtml(label)}</label>
            <select class="field-input estimate-select-input" id="estimate-q-${escapeHtml(q.fieldKey)}" data-field="${escapeHtml(q.fieldKey)}">
              ${q.options
                .map((opt) => {
                  const selected = String(current) === String(opt.value) ? ' selected' : '';
                  return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(optionLabel(opt, q.fieldKey) || opt.value)}</option>`;
                })
                .join('')}
            </select>
          </div>`;
      })
      .join('');
  }

  function renderDesktopQuestions() {
    const service = findService(selectedServiceCode);
    if (!els.questions) return;
    if (!service) {
      els.questions.innerHTML = '';
      return;
    }
    els.questions.innerHTML = catalogReady ? questionsHtml(service) : questionsSkeletonHtml();
  }

  function renderCategories() {
    if (!catalog) return;
    const categories = [...(catalog.categories || [])].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );

    if (!categories.length) {
      els.categories.innerHTML =
        '<p class="estimate-accordion__status estimate-accordion__status--error">No services available right now.</p>';
      return;
    }

    els.categories.innerHTML = categories
      .map((cat) => {
        const services = listLeafServices(cat);
        const open = cat.code === selectedCategoryCode;
        const countLabel = `${services.length} Service${services.length === 1 ? '' : 's'}`;
        return `
          <div class="estimate-cat${open ? ' estimate-cat--open' : ''}" data-category="${escapeHtml(cat.code)}">
            <button type="button" class="estimate-cat__header" aria-expanded="${open ? 'true' : 'false'}">
              <span class="estimate-cat__meta">
                <span class="estimate-cat__name">${escapeHtml(cat.name)}</span>
                <span class="estimate-cat__count">${escapeHtml(countLabel)}</span>
              </span>
              <span class="estimate-cat__chevron" aria-hidden="true">
                <svg class="estimate-cat__chevron-closed" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 7H10.5M10.5 7L7.5 4M10.5 7L7.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg class="estimate-cat__chevron-open" viewBox="0 0 14 14" fill="none">
                  <path d="M4.5 9.5L9.5 4.5M9.5 4.5H5.5M9.5 4.5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </button>
            <div class="estimate-cat__body">
              <ul class="estimate-service-grid">
                ${services
                  .map((svc) => {
                    const selected = svc.code === selectedServiceCode;
                    const desc = serviceDescription(svc);
                    return `
                      <li>
                        <button type="button" class="estimate-service${selected ? ' estimate-service--selected' : ''}"
                          data-service="${escapeHtml(svc.code)}" aria-pressed="${selected ? 'true' : 'false'}">
                          <span class="estimate-service__name">${escapeHtml(svc.name)}</span>
                          ${priceHtml(svc, 'estimate-service__price')}
                          <span class="estimate-service__desc">${escapeHtml(desc)}</span>
                        </button>
                      </li>`;
                  })
                  .join('')}
              </ul>
            </div>
          </div>`;
      })
      .join('');
  }

  function mobilePanelHtml(service) {
    const pc = normalizePostcode(els.postcode.value);
    return `
      <div class="estimate-mcard__fields">
        <div class="estimate-field">
          <label class="field-label" for="estimate-postcode-mobile">Your postcode</label>
          <input class="field-input" type="text" id="estimate-postcode-mobile" name="estimate-postcode"
            value="${escapeHtml(pc)}" autocomplete="off" autocapitalize="characters" spellcheck="false"
            placeholder="e.g. SW1A 1AA">
          <p id="estimate-coverage-mobile" class="estimate-field__status" hidden></p>
        </div>
        <div class="estimate-mcard__questions">
          ${catalogReady ? questionsHtml(service) : questionsSkeletonHtml()}
        </div>
        <div class="estimate-mcard__price">
          <p class="estimate-mcard__price-label">Estimated price</p>
          <p class="estimate-mcard__price-amount" data-mobile-price>—</p>
          <p class="estimate-mcard__price-note">Final price may vary based on property access.</p>
          <a class="btn-primary btn-primary--block estimate-mcard__book" href="${escapeHtml(bookHref())}">Book Now</a>
        </div>
      </div>`;
  }

  function renderMobileCards() {
    if (!catalog) return;
    const services = allLeafServices();
    if (!services.length) {
      els.categories.innerHTML =
        '<p class="estimate-accordion__status estimate-accordion__status--error">No services available right now.</p>';
      return;
    }

    els.categories.innerHTML = `
      <div class="estimate-mobile-list">
        ${services
          .map((svc) => {
            const open = svc.code === expandedMobileCode;
            const desc = serviceDescription(svc);
            return `
              <article class="estimate-mcard${open ? ' estimate-mcard--open' : ''}" data-service="${escapeHtml(svc.code)}">
                <div class="estimate-mcard__summary">
                  <div class="estimate-mcard__copy">
                    <h4 class="estimate-mcard__name">${escapeHtml(svc.name)}</h4>
                    <p class="estimate-mcard__desc">${escapeHtml(desc)}</p>
                  </div>
                  ${priceHtml(svc, 'estimate-mcard__from')}
                </div>
                <button type="button" class="estimate-mcard__toggle" aria-expanded="${open ? 'true' : 'false'}">
                  <span>${open ? 'Hide Calculator' : 'Get Estimate'}</span>
                  <svg class="estimate-mcard__toggle-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <div class="estimate-mcard__panel">
                  <div class="estimate-mcard__panel-inner">
                    ${open && selectedServiceCode === svc.code ? mobilePanelHtml(svc) : ''}
                  </div>
                </div>
              </article>`;
          })
          .join('')}
      </div>`;

    if (expandedMobileCode && selectedServiceCode === expandedMobileCode) {
      syncMobileCoverage();
      const amountEl = document.querySelector('[data-mobile-price]');
      if (amountEl && els.priceAmount) amountEl.textContent = els.priceAmount.textContent;
    }
  }

  function syncMobileCoverage() {
    const mobileCoverage = document.getElementById('estimate-coverage-mobile');
    if (!mobileCoverage || !els.coverage) return;
    mobileCoverage.hidden = els.coverage.hidden;
    mobileCoverage.className = els.coverage.className;
    mobileCoverage.innerHTML = els.coverage.innerHTML;
  }

  function renderLayout() {
    if (els.layout) {
      els.layout.classList.toggle('estimate-layout--mobile', isMobileLayout());
    }
    if (isMobileLayout()) {
      // The mobile postcode box lives inside the re-rendered list; keep the user's cursor in it.
      const active = document.activeElement;
      const refocus = active && active.id === 'estimate-postcode-mobile'
        ? { start: active.selectionStart, end: active.selectionEnd }
        : null;
      renderMobileCards();
      if (refocus) {
        const input = document.getElementById('estimate-postcode-mobile');
        if (input) {
          input.focus();
          input.setSelectionRange(refocus.start, refocus.end);
        }
      }
    } else {
      expandedMobileCode = null;
      renderCategories();
      renderDesktopQuestions();
    }
  }

  function applyQuote(quote) {
    const setAmount = (text) => {
      if (els.priceAmount) els.priceAmount.textContent = text;
      document.querySelectorAll('[data-mobile-price]').forEach((el) => {
        el.textContent = text;
      });
    };

    if (!quote) {
      setAmount('—');
      if (els.priceDetail) els.priceDetail.textContent = '';
      return;
    }

    const serviceLines = (quote.lines || []).filter(
      (line) => line.serviceCode === selectedServiceCode || line.isDiscount
    );
    const amount =
      serviceLines.length > 0
        ? serviceLines.reduce((sum, line) => sum + Number(line.total || 0), 0)
        : Number(quote.total);
    const isTbc =
      quote.pricingStatus === 'tbc' ||
      serviceLines.some((line) => line.isTbc || line.quoteOnly);

    setAmount(isTbc && !(amount > 0) ? 'TBC' : fmtMoney(amount));

    const primary = (quote.lines || []).find((line) => line.serviceCode === selectedServiceCode);
    const detailBits = [];
    if (primary?.sub) detailBits.push('• ' + primary.sub);
    else if (answers) {
      const service = findService(selectedServiceCode);
      const firstQ = visibleQuestions(service || {})[0];
      if (firstQ && answers[firstQ.fieldKey] != null) {
        const opt = (firstQ.options || []).find((o) => String(o.value) === String(answers[firstQ.fieldKey]));
        detailBits.push('• ' + (optionLabel(opt, firstQ.fieldKey) || answers[firstQ.fieldKey]));
      }
    }
    if (els.priceDetail) els.priceDetail.textContent = detailBits.join(' ');
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    if (els.priceAmount) els.priceAmount.classList.add('is-loading');
    document.querySelectorAll('[data-mobile-price]').forEach((el) => el.classList.add('is-loading'));
    previewTimer = setTimeout(() => {
      refreshPreview().catch((err) => {
        console.error(err);
        if (els.priceAmount) els.priceAmount.classList.remove('is-loading');
        document.querySelectorAll('[data-mobile-price]').forEach((el) => el.classList.remove('is-loading'));
        applyQuote(null);
        if (els.priceDetail) els.priceDetail.textContent = 'Could not calculate price';
      });
    }, 280);
  }

  async function refreshPreview() {
    const seq = ++previewSeq;
    if (!selectedServiceCode) {
      applyQuote(null);
      if (els.priceAmount) els.priceAmount.classList.remove('is-loading');
      document.querySelectorAll('[data-mobile-price]').forEach((el) => el.classList.remove('is-loading'));
      return;
    }

    const quote = await fetchPreview();
    if (seq !== previewSeq) return;
    applyQuote(quote);
    if (els.priceAmount) els.priceAmount.classList.remove('is-loading');
    document.querySelectorAll('[data-mobile-price]').forEach((el) => el.classList.remove('is-loading'));
  }

  function syncDesktopAccordion() {
    if (!els.categories) return;
    els.categories.querySelectorAll('.estimate-cat').forEach((el) => {
      const isOpen = el.getAttribute('data-category') === selectedCategoryCode;
      el.classList.toggle('estimate-cat--open', isOpen);
      const header = el.querySelector('.estimate-cat__header');
      if (header) header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    els.categories.querySelectorAll('.estimate-service').forEach((btn) => {
      const selected = btn.getAttribute('data-service') === selectedServiceCode;
      btn.classList.toggle('estimate-service--selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function selectService(code, { skipPreview, expandMobile } = {}) {
    const service = findService(code);
    if (!service) return;
    const category = findCategoryForService(code);
    selectedServiceCode = code;
    selectedCategoryCode = category?.code || selectedCategoryCode;
    answers = defaultAnswersForService(service);
    if (els.selectedName) els.selectedName.textContent = service.name;
    if (expandMobile) expandedMobileCode = code;
    if (isMobileLayout() || expandMobile || !els.categories?.querySelector('.estimate-cat')) {
      renderLayout();
    } else {
      syncDesktopAccordion();
      renderDesktopQuestions();
    }
    updateBookLink();
    if (!skipPreview && catalogReady) schedulePreview();
  }

  function toggleCategory(code) {
    selectedCategoryCode = selectedCategoryCode === code ? null : code;
    if (els.categories?.querySelector('.estimate-cat')) {
      syncDesktopAccordion();
    } else {
      renderCategories();
    }
    if (selectedCategoryCode && !selectedServiceCode) {
      const cat = (catalog.categories || []).find((c) => c.code === selectedCategoryCode);
      const first = cat ? listLeafServices(cat)[0] : null;
      if (first) selectService(first.code);
    }
  }

  function toggleMobileCard(code) {
    if (expandedMobileCode === code) {
      expandedMobileCode = null;
      renderMobileCards();
      return;
    }
    selectService(code, { expandMobile: true });
  }

  function firstServiceCode() {
    const categories = [...(catalog?.categories || [])].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );
    return categories[0] ? listLeafServices(categories[0])[0]?.code || null : null;
  }

  // Same categories and services in the same order => prices can be swapped in place.
  function catalogShape(data) {
    return [...(data?.categories || [])]
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((cat) => `${cat.code}:${cat.name}:${listLeafServices(cat).map((s) => `${s.code}=${s.name}`).join(',')}`)
      .join('|');
  }

  function showCoverage(data) {
    if (!UK_POSTCODE.test(typedPostcode())) {
      setCoverage('muted', 'Enter your postcode to check coverage');
    } else if (data.hasPricing && data.resolvedRegion?.name) {
      setCoverage('success', `Covered (${data.resolvedRegion.name})`);
    } else if (data.hasPricing === false) {
      setCoverage('error', 'Postcode not covered for instant pricing');
    } else {
      setCoverage('muted', 'Enter your postcode to check coverage');
    }
  }

  // Services stay on screen the whole time; only the prices show a placeholder while loading.
  async function loadCatalog() {
    const seq = ++catalogSeq;
    pricesLoading = true;
    updatePricesInPlace();
    if (UK_POSTCODE.test(typedPostcode())) setCoverage('muted', 'Checking coverage…');

    let data;
    try {
      data = await fetchCatalog(getPostcode());
    } catch (err) {
      if (seq !== catalogSeq) return;
      console.error(err);
      pricesLoading = false;
      updatePricesInPlace();
      setCoverage('error', 'Could not load prices right now. Please try again.');
      return;
    }
    if (seq !== catalogSeq) return;

    const wasReady = catalogReady;
    const sameShape = catalogShape(data) === catalogShape(catalog);
    catalog = data;
    catalogReady = true;
    pricesLoading = false;
    writeCachedCatalog(data);
    showCoverage(data);

    if (selectedServiceCode && !findService(selectedServiceCode)) selectedServiceCode = null;
    if (expandedMobileCode && !findService(expandedMobileCode)) expandedMobileCode = null;

    if (!selectedServiceCode && !isMobileLayout()) {
      const first = firstServiceCode();
      if (first) selectService(first, { skipPreview: true });
    } else if (selectedServiceCode && !wasReady) {
      // Questions only became known now: start from their defaults.
      answers = defaultAnswersForService(findService(selectedServiceCode));
    }

    if (sameShape && wasReady) {
      updatePricesInPlace();
    } else {
      renderLayout();
    }

    syncMobileCoverage();
    updateBookLink();
    if (selectedServiceCode) schedulePreview();
  }

  function onFieldChange(event) {
    const field = event.target.getAttribute('data-field');
    if (!field) return;
    const service = findService(selectedServiceCode);
    const beforeKeys = service ? visibleQuestions(service).map((q) => q.fieldKey).join('|') : '';
    answers[field] = event.target.value;
    const afterKeys = service ? visibleQuestions(service).map((q) => q.fieldKey).join('|') : '';
    if (beforeKeys !== afterKeys) {
      if (isMobileLayout()) renderMobileCards();
      else renderDesktopQuestions();
    }
    updateBookLink();
    schedulePreview();
  }

  function onPostcodeInput(event) {
    clearTimeout(postcodeTimer);
    const target = event && event.target;
    const mobileInput = document.getElementById('estimate-postcode-mobile');
    if (target && target.id === 'estimate-postcode-mobile') {
      els.postcode.value = target.value;
    } else if (mobileInput && target === els.postcode) {
      mobileInput.value = els.postcode.value;
    }
    updateBookLink();

    // Only re-price for a complete postcode (or when cleared back to the default),
    // not on every keystroke of a partial one.
    const typed = typedPostcode();
    if (typed && !UK_POSTCODE.test(typed)) {
      setCoverage('muted', 'Enter a full postcode, e.g. SW1A 1AA');
      return;
    }
    postcodeTimer = setTimeout(loadCatalog, 450);
  }

  els.categories.addEventListener('click', (event) => {
    const toggle = event.target.closest('.estimate-mcard__toggle');
    if (toggle) {
      const card = toggle.closest('.estimate-mcard');
      if (card) toggleMobileCard(card.getAttribute('data-service'));
      return;
    }

    const header = event.target.closest('.estimate-cat__header');
    if (header) {
      const cat = header.closest('.estimate-cat');
      if (cat) toggleCategory(cat.getAttribute('data-category'));
      return;
    }

    const serviceBtn = event.target.closest('.estimate-service');
    if (serviceBtn) {
      selectService(serviceBtn.getAttribute('data-service'));
    }
  });

  els.categories.addEventListener('change', onFieldChange);
  if (els.questions) els.questions.addEventListener('change', onFieldChange);

  els.categories.addEventListener('input', (event) => {
    if (event.target.id === 'estimate-postcode-mobile') onPostcodeInput(event);
  });

  els.postcode.addEventListener('input', onPostcodeInput);
  els.postcode.addEventListener('blur', () => {
    els.postcode.value = normalizePostcode(els.postcode.value);
  });

  els.categories.addEventListener('focusout', (event) => {
    if (event.target.id === 'estimate-postcode-mobile') {
      event.target.value = normalizePostcode(event.target.value);
      els.postcode.value = event.target.value;
    }
  });

  function onViewportChange() {
    renderLayout();
    if (selectedServiceCode) schedulePreview();
  }

  if (media.addEventListener) media.addEventListener('change', onViewportChange);
  else media.addListener(onViewportChange);

  // Render the services immediately (last-seen catalog, or the built-in list), then load prices.
  const cached = readCachedCatalog();
  catalog = cached || FALLBACK_CATALOG;
  catalogReady = Boolean(cached);
  if (!isMobileLayout()) {
    const first = firstServiceCode();
    if (first) selectService(first, { skipPreview: true });
  } else {
    renderLayout();
  }
  setCoverage('muted', 'Enter your postcode to check coverage');
  if (els.priceAmount) els.priceAmount.classList.add('is-loading');
  loadCatalog();
})();
