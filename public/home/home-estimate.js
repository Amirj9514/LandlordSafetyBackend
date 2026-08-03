/**
 * Instant Estimate: catalog from GET /api/catalog, price from POST /api/quotes/preview.
 */
(function () {
  const API = '/api';
  const PROPERTY_TYPE = 'residential';
  const DEFAULT_POSTCODE = 'SW1A 1AA';

  const els = {
    categories: document.getElementById('estimate-categories'),
    selectedName: document.getElementById('estimate-selected-name'),
    postcode: document.getElementById('estimate-postcode'),
    coverage: document.getElementById('estimate-coverage'),
    questions: document.getElementById('estimate-questions'),
    priceDetail: document.getElementById('estimate-price-detail'),
    priceAmount: document.getElementById('estimate-price-amount'),
    bookCta: document.getElementById('estimate-book-cta'),
  };

  if (!els.categories || !els.postcode) return;

  let catalog = null;
  let selectedCategoryCode = null;
  let selectedServiceCode = null;
  let answers = {};
  let previewTimer = null;
  let previewSeq = 0;

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

  function getPostcode() {
    return normalizePostcode(els.postcode.value) || DEFAULT_POSTCODE;
  }

  function listLeafServices(category) {
    return (category.services || [])
      .filter((svc) => !svc.children?.length)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
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

  function optionLabel(opt) {
    if (!opt) return '';
    const raw = opt.displayLabel || opt.label || opt.value;
    return String(raw).replace(/\s*[—–-]\s*£[\d,.]+.*$/i, '').trim();
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
    if (anyTbc || service.pricingMode === 'quote_only') return { text: 'Quote on request', amount: null };
    return { text: 'from TBC', amount: null };
  }

  function serviceDescription(service) {
    const meta = service.metadata || {};
    return (
      meta.shortDescription ||
      meta.description ||
      meta.tagline ||
      meta.subtitle ||
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
        if (showWhen) {
          return answers[showWhen.field] === showWhen.equals;
        }
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
        // Prefer values that keep the estimate simple (e.g. CO alarm already present).
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
    return question.options.every((opt) => String(optionLabel(opt) || opt.value).length <= 12);
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

  function setCoverage(state, message) {
    if (!els.coverage) return;
    if (!message) {
      els.coverage.hidden = true;
      els.coverage.textContent = '';
      els.coverage.className = 'estimate-field__status';
      return;
    }
    els.coverage.hidden = false;
    els.coverage.className = 'estimate-field__status estimate-field__status--' + state;
    els.coverage.innerHTML =
      state === 'success'
        ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${escapeHtml(message)}`
        : escapeHtml(message);
  }

  function updateBookLink() {
    if (!els.bookCta) return;
    const params = new URLSearchParams();
    if (selectedServiceCode) params.set('service', selectedServiceCode);
    const pc = getPostcode();
    if (pc) params.set('postcode', pc);
    const qs = params.toString();
    els.bookCta.href = qs ? `/book-now/?${qs}` : '/book-now/';
  }

  function renderQuestions() {
    const service = findService(selectedServiceCode);
    if (!els.questions || !service) {
      if (els.questions) els.questions.innerHTML = '';
      return;
    }

    const questions = visibleQuestions(service).filter((q) => {
      // Keep the right panel light: show option-based pricing questions + short selects/radios/numbers.
      return ['select', 'radio', 'number'].includes(q.inputType);
    });

    els.questions.innerHTML = questions
      .map((q) => {
        const current = answers[q.fieldKey];
        if (q.inputType === 'number') {
          return `
            <div class="estimate-field">
              <label class="field-label" for="estimate-q-${escapeHtml(q.fieldKey)}">${escapeHtml(q.label)}</label>
              <input class="field-input estimate-select-input" type="number" id="estimate-q-${escapeHtml(q.fieldKey)}"
                data-field="${escapeHtml(q.fieldKey)}" min="${q.validation?.min ?? 1}" max="${q.validation?.max ?? 100}"
                value="${escapeHtml(current ?? '')}">
            </div>`;
        }

        if (useChipUi(q)) {
          return `
            <fieldset class="estimate-field">
              <legend class="field-label">${escapeHtml(q.label)}</legend>
              <div class="estimate-chips">
                ${q.options
                  .map((opt) => {
                    const checked = String(current) === String(opt.value) ? ' checked' : '';
                    return `
                      <label class="estimate-chip">
                        <input type="radio" name="estimate-${escapeHtml(q.fieldKey)}" value="${escapeHtml(opt.value)}" data-field="${escapeHtml(q.fieldKey)}"${checked}>
                        <span>${escapeHtml(optionLabel(opt) || opt.value)}</span>
                      </label>`;
                  })
                  .join('')}
              </div>
            </fieldset>`;
        }

        return `
          <div class="estimate-field">
            <label class="field-label" for="estimate-q-${escapeHtml(q.fieldKey)}">${escapeHtml(q.label)}</label>
            <select class="field-input estimate-select-input" id="estimate-q-${escapeHtml(q.fieldKey)}" data-field="${escapeHtml(q.fieldKey)}">
              ${q.options
                .map((opt) => {
                  const selected = String(current) === String(opt.value) ? ' selected' : '';
                  return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(optionLabel(opt) || opt.value)}</option>`;
                })
                .join('')}
            </select>
          </div>`;
      })
      .join('');
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
                    const from = serviceFromPrice(svc);
                    const desc = serviceDescription(svc);
                    return `
                      <li>
                        <button type="button" class="estimate-service${selected ? ' estimate-service--selected' : ''}"
                          data-service="${escapeHtml(svc.code)}" aria-pressed="${selected ? 'true' : 'false'}">
                          <span class="estimate-service__name">${escapeHtml(svc.name)}</span>
                          <span class="estimate-service__price">${escapeHtml(from.text)}</span>
                          ${desc ? `<span class="estimate-service__desc">${escapeHtml(desc)}</span>` : '<span class="estimate-service__desc"></span>'}
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

  function applyQuote(quote) {
    if (!quote) {
      els.priceAmount.textContent = '—';
      els.priceDetail.textContent = '';
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

    els.priceAmount.textContent = isTbc && !(amount > 0) ? 'TBC' : fmtMoney(amount);

    const primary = (quote.lines || []).find((line) => line.serviceCode === selectedServiceCode);
    const detailBits = [];
    if (primary?.sub) detailBits.push('• ' + primary.sub);
    else if (answers) {
      const service = findService(selectedServiceCode);
      const firstQ = visibleQuestions(service || {})[0];
      if (firstQ && answers[firstQ.fieldKey] != null) {
        const opt = (firstQ.options || []).find((o) => String(o.value) === String(answers[firstQ.fieldKey]));
        detailBits.push('• ' + (optionLabel(opt) || answers[firstQ.fieldKey]));
      }
    }
    els.priceDetail.textContent = detailBits.join(' ');
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    els.priceAmount.classList.add('is-loading');
    previewTimer = setTimeout(() => {
      refreshPreview().catch((err) => {
        console.error(err);
        els.priceAmount.classList.remove('is-loading');
        els.priceAmount.textContent = '—';
        els.priceDetail.textContent = 'Could not calculate price';
      });
    }, 280);
  }

  async function refreshPreview() {
    const seq = ++previewSeq;
    if (!selectedServiceCode) {
      applyQuote(null);
      els.priceAmount.classList.remove('is-loading');
      return;
    }

    const quote = await fetchPreview();
    if (seq !== previewSeq) return;
    applyQuote(quote);
    els.priceAmount.classList.remove('is-loading');
  }

  function selectService(code, { skipPreview } = {}) {
    const service = findService(code);
    if (!service) return;
    const category = findCategoryForService(code);
    selectedServiceCode = code;
    selectedCategoryCode = category?.code || selectedCategoryCode;
    answers = defaultAnswersForService(service);
    if (els.selectedName) els.selectedName.textContent = service.name;
    renderCategories();
    renderQuestions();
    updateBookLink();
    if (!skipPreview) schedulePreview();
  }

  function toggleCategory(code) {
    selectedCategoryCode = selectedCategoryCode === code ? null : code;
    renderCategories();
    if (selectedCategoryCode && !selectedServiceCode) {
      const cat = (catalog.categories || []).find((c) => c.code === selectedCategoryCode);
      const first = cat ? listLeafServices(cat)[0] : null;
      if (first) selectService(first.code);
    }
  }

  async function loadCatalog({ keepSelection } = {}) {
    const previousService = keepSelection ? selectedServiceCode : null;
    els.categories.innerHTML = '<p class="estimate-accordion__status">Loading services…</p>';
    setCoverage('muted', 'Checking coverage…');

    try {
      catalog = await fetchCatalog(getPostcode());

      if (catalog.hasPricing && catalog.resolvedRegion?.name) {
        setCoverage('success', `Covered (${catalog.resolvedRegion.name})`);
      } else if (catalog.hasPricing === false) {
        setCoverage('error', 'Postcode not covered for instant pricing');
      } else {
        setCoverage('muted', 'Enter a postcode to check coverage');
      }

      const categories = [...(catalog.categories || [])].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );

      let nextService = previousService && findService(previousService) ? previousService : null;
      if (!nextService) {
        const firstCat = categories[0];
        nextService = firstCat ? listLeafServices(firstCat)[0]?.code : null;
      }

      if (nextService) {
        selectService(nextService, { skipPreview: true });
      } else {
        renderCategories();
      }

      schedulePreview();
    } catch (err) {
      console.error(err);
      els.categories.innerHTML = `<p class="estimate-accordion__status estimate-accordion__status--error">${escapeHtml(err.message || 'Failed to load services')}</p>`;
      setCoverage('error', 'Could not check coverage');
    }
  }

  els.categories.addEventListener('click', (event) => {
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

  els.questions.addEventListener('change', (event) => {
    const field = event.target.getAttribute('data-field');
    if (!field) return;
    const service = findService(selectedServiceCode);
    const beforeKeys = service ? visibleQuestions(service).map((q) => q.fieldKey).join('|') : '';
    answers[field] = event.target.value;
    const afterKeys = service ? visibleQuestions(service).map((q) => q.fieldKey).join('|') : '';
    if (beforeKeys !== afterKeys) renderQuestions();
    updateBookLink();
    schedulePreview();
  });

  let postcodeTimer = null;
  els.postcode.addEventListener('input', () => {
    clearTimeout(postcodeTimer);
    updateBookLink();
    postcodeTimer = setTimeout(() => {
      loadCatalog({ keepSelection: true });
    }, 450);
  });

  els.postcode.addEventListener('blur', () => {
    els.postcode.value = getPostcode();
  });

  loadCatalog();
})();
