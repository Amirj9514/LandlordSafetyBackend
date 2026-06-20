/**
 * Book-now UI: catalog from GET /api/catalog, quotes from POST /api/quotes/preview, bookings from POST /api/bookings.
 */
(function () {
  const API = '/api';
  let quoteLines = [];
  let lastQuote = null;
  let previewTimer = null;
  let previewInFlight = null;

  let catalog = null;
  let catalogPropertyType = null;
  let catalogPostcode = null;
  let catalogLoadPromise = null;
  const catalogServicesByCode = {};
  let regionPrices = null;
  let regionPricesPostcode = null;
  let quoteUpdateSeq = 0;

  function fmt(n) {
    return '£' + Number(n).toFixed(2);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fieldId(serviceCode, fieldKey) {
    return `q-${serviceCode}-${fieldKey}`;
  }

  function radioGroup(serviceCode, fieldKey) {
    return `q-${serviceCode}-${fieldKey}`;
  }

  function getPostcode() {
    return (
      document.getElementById('postcode')?.value?.trim() ||
      document.getElementById('b-postcode')?.value?.trim() ||
      ''
    );
  }

  function tierAmount(tierKey) {
    if (!regionPrices?.hasPricing || !tierKey) return null;
    if (!Object.prototype.hasOwnProperty.call(regionPrices.prices, tierKey)) return null;
    return regionPrices.prices[tierKey];
  }

  function priceSuffix(amount) {
    if (!regionPrices?.hasPricing) return '';
    if (amount === null || amount === undefined) return ' — TBC';
    return ` — ${fmt(amount)}`;
  }

  function formatOptionLabel(serviceCode, fieldKey, option) {
    if (serviceCode === 'boiler' && fieldKey === 'boilerType' && state.activeBundles.has('bundle-gsc-boiler')) {
      return option.displayLabelBundle || option.displayLabel || option.label || option.value;
    }
    return option.displayLabel || option.label || option.value;
  }

  function patPricingNote(q) {
    if (q?.pricingHint?.displayText) {
      return `<div class="addon-note" style="margin-top:8px">${escapeHtml(q.pricingHint.displayText)}</div>`;
    }
    return '';
  }

  function readFieldValue(serviceCode, fieldKey, inputType) {
    if (inputType === 'radio') {
      return state.radios[radioGroup(serviceCode, fieldKey)] || null;
    }
    const el = document.getElementById(fieldId(serviceCode, fieldKey));
    if (!el) return null;
    const v = el.value;
    return v === '' ? null : v;
  }

  function getAnswersForService(serviceCode) {
    const svc = catalogServicesByCode[serviceCode];
    const answers = {};
    if (!svc?.questions) return answers;

    for (const q of svc.questions) {
      const val = readFieldValue(serviceCode, q.fieldKey, q.inputType);
      if (val != null) answers[q.fieldKey] = val;
    }
    return answers;
  }

  function collectServiceAnswers(code) {
    return getAnswersForService(code);
  }

  function clearServiceAnswers(serviceCode) {
    const svc = catalogServicesByCode[serviceCode];
    if (!svc?.questions) return;
    for (const q of svc.questions) {
      if (q.inputType === 'radio') {
        delete state.radios[radioGroup(serviceCode, q.fieldKey)];
      } else {
        const el = document.getElementById(fieldId(serviceCode, q.fieldKey));
        if (el) el.value = '';
      }
    }
  }

  function clearSubqSlot(slotId) {
    const slot = document.getElementById('subq-' + slotId);
    if (slot) slot.innerHTML = '';
  }

  function showServiceRow(serviceCode) {
    const row = document.getElementById('svc-' + serviceCode);
    if (row) {
      row.classList.remove('selected');
      row.style.display = '';
    }
  }

  function resetQuoteIfEmpty() {
    if (state.services.size === 0 && state.activeBundles.size === 0) {
      quoteLines = [];
      lastQuote = null;
      renderQuotePanel([]);
      updateQuoteRegionLabel(null);
      updateFloatBar();
    }
  }

  function deactivateBundle(bundleId) {
    const bdef = window.BUNDLES[bundleId];
    if (!bdef) return;

    state.activeBundles.delete(bundleId);
    const bundleRow = document.getElementById('svc-' + bundleId);
    if (bundleRow) bundleRow.classList.remove('selected');

    bdef.services.forEach((id) => {
      state.services.delete(id);
      clearServiceAnswers(id);
      showServiceRow(id);
    });
    clearSubqSlot(bundleId);
  }

  function syncBundlesMap() {
    if (!catalog?.bundles) {
      window.BUNDLES = {};
      return;
    }
    window.BUNDLES = Object.fromEntries(
      catalog.bundles.map((b) => [
        b.bundleKey,
        {
          services: b.serviceCodes || [],
          discount: b.discountAmount,
          label: b.label,
        },
      ])
    );
  }

  function bundlesForCategory(serviceCodes) {
    const codes = new Set(serviceCodes);
    return (catalog?.bundles || [])
      .filter((b) => {
        const bundleCodes = b.serviceCodes || [];
        return bundleCodes.length && codes.has(bundleCodes[0]);
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  function renderCategoryBlock(cat, marginTop) {
    const services = (cat.services || [])
      .filter((s) => !s.children?.length)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    let html = `<div class="svc-cat-title" ${marginTop ? 'style="margin-top:20px"' : ''}>${escapeHtml(cat.name)}</div>`;

    for (const svc of services) {
      html += renderServiceRow(svc);
    }

    for (const bundle of bundlesForCategory(services.map((s) => s.code))) {
      html += renderBundleRow(bundle);
    }

    return html;
  }

  async function fetchCatalog(propertyType) {
    const pc = getPostcode();
    let url = `${API}/catalog?propertyType=${encodeURIComponent(propertyType)}`;
    if (pc) url += `&postcode=${encodeURIComponent(pc)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Failed to load catalog');
    }
    return json.data;
  }

  async function ensureCatalogLoaded(propertyType) {
    const pc = getPostcode() || '';
    if (catalog && catalogPropertyType === propertyType && catalogPostcode === pc) {
      return catalog;
    }

    if (catalogLoadPromise && catalogPropertyType === propertyType && catalogPostcode === pc) {
      return catalogLoadPromise;
    }

    catalogPropertyType = propertyType;
    catalogPostcode = pc;
    const container = document.getElementById('catalog-services');
    if (container) {
      container.innerHTML =
        '<p class="catalog-loading" style="grid-column:1/-1;text-align:center;color:var(--slate-light);padding:24px">Loading services…</p>';
    }

    catalogLoadPromise = fetchCatalog(propertyType)
      .then((data) => {
        catalog = data;
        Object.keys(catalogServicesByCode).forEach((k) => delete catalogServicesByCode[k]);
        for (const cat of catalog.categories || []) {
          for (const svc of cat.services || []) {
            catalogServicesByCode[svc.code] = svc;
          }
        }
        syncBundlesMap();
        if (catalog.hasPricing !== undefined) {
          regionPrices = {
            hasPricing: catalog.hasPricing,
            resolvedRegion: catalog.resolvedRegion,
            postcode: catalog.postcode,
            prices: {},
          };
          for (const cat of catalog.categories || []) {
            for (const svc of cat.services || []) {
              for (const q of svc.questions || []) {
                for (const opt of q.options || []) {
                  if (opt.tierKey && opt.price != null) {
                    regionPrices.prices[opt.tierKey] = opt.price;
                  }
                }
              }
            }
          }
          regionPricesPostcode = pc || null;
        }
        renderCatalogGrid();
        return catalog;
      })
      .catch((err) => {
        if (container) {
          container.innerHTML = `<p class="catalog-error" style="grid-column:1/-1;color:var(--red);padding:24px;text-align:center">${escapeHtml(err.message)}</p>`;
        }
        throw err;
      })
      .finally(() => {
        catalogLoadPromise = null;
      });

    return catalogLoadPromise;
  }

  function renderServiceRow(service) {
    const code = service.code;
    return `
      <div class="svc-row" id="svc-${escapeHtml(code)}" data-service-code="${escapeHtml(code)}" onclick="toggleService('${escapeHtml(code)}')">
        <div class="svc-cb" id="cb-${escapeHtml(code)}"></div>
        <span>${escapeHtml(service.name)}</span>
      </div>
      <div class="subq-slot" id="subq-${escapeHtml(code)}"></div>`;
  }

  function renderBundleRow(bundle) {
    const key = bundle.bundleKey;
    const services = JSON.stringify(bundle.serviceCodes || []);
    const save =
      bundle.metadata?.saveLabel ||
      (bundle.discountAmount ? `Save £${bundle.discountAmount}` : '');
    const ribbon = save ? `<div class="save-ribbon">${escapeHtml(save)}</div>` : '';
    return `
      <div class="svc-row bundle-row" id="svc-${escapeHtml(key)}"
        data-bundle-key="${escapeHtml(key)}"
        data-bundle-services='${escapeHtml(services)}'
        onclick="toggleBundleFromEl(this)">
        <div class="svc-cb" id="cb-${escapeHtml(key)}"></div>
        <span>${escapeHtml(bundle.label)}</span>
        ${ribbon}
      </div>
      <div class="subq-slot" id="subq-${escapeHtml(key)}"></div>`;
  }

  function renderCatalogGrid() {
    const container = document.getElementById('catalog-services');
    if (!container || !catalog) return;

    const categories = [...(catalog.categories || [])].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );
    const mid = Math.ceil(categories.length / 2);
    const left = categories.slice(0, mid);
    const right = categories.slice(mid);

    const colHtml = (cats, isRight) =>
      `<div class="svc-col">${cats.map((c, i) => renderCategoryBlock(c, isRight && i > 0)).join('')}</div>`;

    container.innerHTML = colHtml(left, false) + colHtml(right, true);

    restoreSelectionUi();
  }

  function restoreSelectionUi() {
    state.services.forEach((code) => {
      const row = document.getElementById('svc-' + code);
      if (row && !coveredByBundle(code)) row.classList.add('selected');
    });
    state.activeBundles.forEach((key) => {
      const row = document.getElementById('svc-' + key);
      if (row) row.classList.add('selected');
      const def = window.BUNDLES[key];
      if (def) {
        def.services.forEach((id) => {
          const r = document.getElementById('svc-' + id);
          if (r) r.style.display = 'none';
        });
      }
    });
    renderSubQuestions();
  }

  window.toggleBundleFromEl = function toggleBundleFromEl(el) {
    const bundleId = el.dataset.bundleKey;
    const svcIds = JSON.parse(el.dataset.bundleServices || '[]');
    toggleBundle(bundleId, svcIds);
  };

  function isQuestionVisible(serviceCode, q) {
    const logic = q.conditionalLogic;
    if (!logic) return true;

    if (logic.showWhen) {
      const dep =
        getAnswersForService(serviceCode)[logic.showWhen.field] ??
        readFieldValue(serviceCode, logic.showWhen.field, 'radio');
      return dep === logic.showWhen.equals;
    }

    if (logic.hideWhen) {
      const dep =
        getAnswersForService(serviceCode)[logic.hideWhen.field] ??
        readFieldValue(serviceCode, logic.hideWhen.field, 'select');
      return dep !== logic.hideWhen.equals;
    }

    return true;
  }

  function normalizeOptions(options) {
    if (!options) return [];
    return options.map((o) => {
      if (typeof o === 'string') return { value: o, label: o };
      return { ...o, value: o.value, label: o.label ?? o.value };
    });
  }

  function renderQuestion(serviceCode, q) {
    const id = fieldId(serviceCode, q.fieldKey);
    const req = q.validation?.required ? '<span class="req">*</span>' : '';
    let note = q.conditionalLogic?.note
      ? `<div class="addon-note" style="margin-top:8px">${escapeHtml(q.conditionalLogic.note)}</div>`
      : '';
    if (serviceCode === 'pat' && q.fieldKey === 'applianceCount') {
      note = patPricingNote(q) + note;
    }
    const hidden = isQuestionVisible(serviceCode, q) ? '' : ' hidden';
    const opts = normalizeOptions(q.options);

    switch (q.inputType) {
      case 'select': {
        const placeholder =
          serviceCode === 'gsc' && q.fieldKey === 'applianceCount'
            ? 'Select appliance count'
            : 'Select…';
        const optionsHtml = opts
          .map((o) => {
            const display = formatOptionLabel(serviceCode, q.fieldKey, o);
            return `<option value="${escapeHtml(o.value)}">${escapeHtml(display)}</option>`;
          })
          .join('');
        return `
        <div class="subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label>${escapeHtml(q.label)} ${req}</label>
          <select id="${id}" data-field-key="${escapeHtml(q.fieldKey)}" onchange="onQuestionChange('${escapeHtml(serviceCode)}')">
            <option value="">${escapeHtml(placeholder)}</option>
            ${optionsHtml}
          </select>
          ${note}
        </div>`;
      }
      case 'radio': {
        const group = radioGroup(serviceCode, q.fieldKey);
        const radios = opts
          .map((o) => {
            const display = formatOptionLabel(serviceCode, q.fieldKey, o);
            return `<div class="radio-opt" data-radio-group="${escapeHtml(group)}" data-radio-value="${escapeHtml(o.value)}" onclick="selectRadio('${escapeHtml(group)}','${escapeHtml(o.value)}',calcAll)"><div class="radio-dot"></div> ${escapeHtml(display)}</div>`;
          })
          .join('');
        return `
        <div class="subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}" id="row-${id}">
          <label>${escapeHtml(q.label)} ${req}</label>
          <div class="radio-group">${radios}</div>
          ${note}
        </div>`;
      }
      case 'number': {
        const min = q.validation?.min != null ? ` min="${q.validation.min}"` : '';
        const max = q.validation?.max != null ? ` max="${q.validation.max}"` : '';
        return `
        <div class="subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label>${escapeHtml(q.label)} ${req}</label>
          <input type="number" id="${id}" data-field-key="${escapeHtml(q.fieldKey)}" placeholder="e.g. 8"${min}${max} oninput="calcAll()">
        </div>`;
      }
      case 'textarea':
        return `
        <div class="subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label>${escapeHtml(q.label)} ${req}</label>
          <textarea id="${id}" data-field-key="${escapeHtml(q.fieldKey)}" oninput="calcAll()"></textarea>
        </div>`;
      case 'text':
      default:
        return `
        <div class="subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label>${escapeHtml(q.label)} ${req}</label>
          <input type="text" id="${id}" data-field-key="${escapeHtml(q.fieldKey)}" oninput="calcAll()">
        </div>`;
    }
  }

  function renderServiceQuestionsPanel(serviceCode, title) {
    const svc = catalogServicesByCode[serviceCode];
    if (!svc?.questions?.length) return '';
    const questions = [...svc.questions].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const body = questions.map((q) => renderQuestion(serviceCode, q)).join('');
    return `
      <div class="subq-section">
        <div class="subq-section-title">${escapeHtml(title || svc.name)}</div>
        ${body}
      </div>`;
  }

  window.onQuestionChange = function onQuestionChange(serviceCode) {
    applyConditionalVisibility(serviceCode);
    if (serviceCode === 'fsc' || serviceCode === 'elc') {
      renderSubQuestions();
    } else {
      calcAll();
    }
  };

  function applyConditionalVisibility(serviceCode) {
    const svc = catalogServicesByCode[serviceCode];
    if (!svc?.questions) return;

    for (const q of svc.questions) {
      const row = document.querySelector(
        `[data-q-row][data-service="${serviceCode}"][data-field="${q.fieldKey}"]`
      );
      if (!row) continue;
      row.classList.toggle('hidden', !isQuestionVisible(serviceCode, q));
    }
  }

  function serviceCodeFromRadioGroup(group) {
    for (const code of Object.keys(catalogServicesByCode)) {
      if (group.startsWith(`q-${code}-`)) return code;
    }
    return null;
  }

  window.renderSubQuestions = function renderSubQuestionsFromCatalog() {
    const saved = {};
    document.querySelectorAll('.subq-slot input, .subq-slot select, .subq-slot textarea').forEach((el) => {
      if (el.id && el.value !== '') saved[el.id] = el.value;
    });
    const savedRadios = { ...state.radios };

    document.querySelectorAll('.subq-slot').forEach((s) => {
      s.innerHTML = '';
    });

    for (const bundleKey of state.activeBundles) {
      const slot = document.getElementById('subq-' + bundleKey);
      const def = window.BUNDLES[bundleKey];
      if (!slot || !def) continue;

      let combined = '';
      for (const code of def.services) {
        combined += renderServiceQuestionsPanel(code);
      }
      if (combined) {
        slot.innerHTML = `<div class="subq-panel">${combined}</div>`;
      }
    }

    const serviceOrder = Object.keys(catalogServicesByCode).sort((a, b) => {
      const ao = catalogServicesByCode[a].displayOrder || 0;
      const bo = catalogServicesByCode[b].displayOrder || 0;
      return ao - bo;
    });

    for (const code of serviceOrder) {
      if (!state.services.has(code)) continue;
      if (coveredByBundle(code)) continue;

      const slot = document.getElementById('subq-' + code);
      const svc = catalogServicesByCode[code];
      if (!slot || !svc) continue;

      const panel = renderServiceQuestionsPanel(code);
      if (panel) {
        slot.innerHTML = `<div class="subq-panel"><div class="subq-panel-title">${escapeHtml(svc.name)}</div>${panel}</div>`;
      }
    }

    Object.entries(saved).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val != null) el.value = val;
    });
    state.radios = savedRadios;
    Object.entries(state.radios).forEach(([group, val]) => {
      if (!val) return;
      document.querySelectorAll(`[data-radio-group="${group}"]`).forEach((el) => {
        el.classList.toggle('checked', el.dataset.radioValue === val);
      });
    });

    for (const code of state.services) {
      applyConditionalVisibility(code);
    }

    calcAll();
    updateFloatBar();
  };

  window.selectRadio = function selectRadioCatalog(group, val, cb) {
    state.radios[group] = val;
    document.querySelectorAll(`[data-radio-group="${group}"]`).forEach((el) => {
      el.classList.toggle('checked', el.dataset.radioValue === val);
    });

    const svcCode = serviceCodeFromRadioGroup(group);
    if (svcCode) applyConditionalVisibility(svcCode);

    if (cb) cb();
    else calcAll();
  };

  const originalSelectPropType = window.selectPropType;
  window.selectPropType = function selectPropTypeCatalog(type) {
    const changed = state.propType !== type;
    if (originalSelectPropType) originalSelectPropType(type);

    if (changed) {
      state.services.clear();
      state.activeBundles.clear();
      catalog = null;
      catalogPropertyType = null;
      catalogPostcode = null;
    }

    updateSubmitCta(lastQuote);
    updateQuoteRegionLabel(lastQuote);
  };

  function buildQuotePayload() {
    const services = Array.from(state.services).map((code) => ({
      code,
      answers: collectServiceAnswers(code),
    }));

    return {
      propertyType: state.propType || 'residential',
      postcode: getPostcode(),
      services,
      activeBundleKeys: [...state.activeBundles],
      congestionZone: !!state.congestion,
      parkingAvailable: !!state.parking,
    };
  }

  function mapApiLines(lines) {
    return (lines || []).map((l) => {
      const selectionSummary = l.serviceDetails?.summary || '';
      const selectionDetails = formatLineSelectionDetails(l.serviceDetails);
      return {
        name: l.name,
        sub: l.sub || selectionSummary || '',
        selectionDetails,
        serviceDetails: l.serviceDetails || null,
        price: l.total,
        id: l.serviceCode,
        serviceCode: l.serviceCode,
        serviceName: l.serviceName,
        discount: l.isDiscount,
        quoteOnly: l.quoteOnly || l.isTbc,
      };
    });
  }

  function formatLineSelectionDetails(serviceDetails) {
    if (!serviceDetails?.selections?.length) return '';
    return serviceDetails.selections
      .map((s) => `${s.label}: ${s.displayValue}`)
      .join(' · ');
  }

  function formatLineDetailsHtml(line) {
    if (line.selectionDetails) {
      return `<div class="line-sub line-details">${escapeHtml(line.selectionDetails)}</div>`;
    }
    if (line.sub) {
      return `<div class="line-sub">${escapeHtml(line.sub)}</div>`;
    }
    return '';
  }

  window.renderQuotePanel = function renderQuotePanelApi(lines) {
    const linesEl = document.getElementById('quote-lines');
    const totalsEl = document.getElementById('quote-totals');
    const emptyEl = document.getElementById('quote-empty');

    const validLines = lines.filter((l) => l.price !== 0 || l.quoteOnly);

    if (validLines.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      if (linesEl) linesEl.innerHTML = '';
      if (totalsEl) totalsEl.classList.add('hidden');
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (totalsEl) totalsEl.classList.remove('hidden');

    if (linesEl) {
      linesEl.innerHTML = validLines
        .map(
          (l) => `
    <div class="quote-line ${l.discount ? 'quote-discount' : ''}">
      <div class="quote-line-name">
        ${escapeHtml(l.name)}
        ${formatLineDetailsHtml(l)}
      </div>
      <div class="quote-line-price">${l.quoteOnly ? 'TBC' : l.price == null || l.price === undefined ? 'TBC' : l.price < 0 ? '−' + fmt(Math.abs(l.price)) : fmt(l.price)}</div>
    </div>
  `
        )
        .join('');
    }

    const subtotal = lastQuote?.subtotal ?? validLines.reduce((s, l) => s + (l.quoteOnly ? 0 : l.price), 0);
    const total = lastQuote?.total ?? subtotal;
    const subEl = document.getElementById('q-subtotal');
    const totalEl = document.getElementById('q-total');
    if (subEl) subEl.textContent = fmt(subtotal);
    if (totalEl) totalEl.textContent = fmt(total);
  };

  function quoteNeedsQuotation(quote) {
    if (state.propType && state.propType !== 'residential') return true;
    if (!quote?.lines) return false;
    return quote.lines.some((l) => !l.isDiscount && !l.quoteOnly && l.isTbc);
  }

  function updateSubmitCta(quote) {
    const btn = document.getElementById('btn-submit-booking');
    if (!btn) return;
    const needsQuote = quoteNeedsQuotation(quote);
    if (needsQuote) {
      btn.innerHTML = '📋 Request Quote — Submit for Pricing';
      btn.dataset.submitMode = 'quotation';
    } else {
      btn.innerHTML = '🏠 Book Now — Confirm Appointment';
      btn.dataset.submitMode = 'booking';
    }
  }

  function setButtonLoading(btn, loading, loadingText) {
    if (!btn) return;
    if (loading) {
      if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.innerHTML = `<span class="btn-spinner"></span><span>${escapeHtml(loadingText)}</span>`;
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btn.dataset.origHtml) {
        btn.innerHTML = btn.dataset.origHtml;
        delete btn.dataset.origHtml;
      }
    }
  }

  function setQuoteUpdating(updating) {
    const card = document.querySelector('.quote-card');
    const bar = document.getElementById('quote-loading');
    const region = document.getElementById('quote-region');
    const floatTotal = document.getElementById('float-total');

    if (card) card.classList.toggle('is-updating', updating);
    if (bar) bar.classList.toggle('visible', updating);
    if (updating && region) {
      region.dataset.prevText = region.textContent;
      region.textContent = 'Updating your quote…';
    } else if (region?.dataset.prevText) {
      delete region.dataset.prevText;
    }
    if (updating && floatTotal) floatTotal.classList.add('is-pending');
    else if (floatTotal) floatTotal.classList.remove('is-pending');
  }

  function updateQuoteRegionLabel(quote) {
    const el = document.getElementById('quote-region');
    if (!el) return;

    const pc = getPostcode();
    if (!pc) {
      el.textContent = 'Enter postcode in step 1, then select services';
      return;
    }
    if (state.propType && state.propType !== 'residential') {
      el.textContent = `Custom quote for ${pc} — team will confirm pricing`;
      return;
    }
    if (!quote) {
      el.textContent = `Postcode ${pc} — select services for your quote`;
      return;
    }
    if (quote.pricingStatus === 'all_tbc') {
      el.textContent = `${pc} is outside our price list — team will quote (TBC)`;
      return;
    }
    if (quote.resolvedRegion?.name) {
      el.textContent = `Prices for ${quote.resolvedRegion.name} · ${pc}`;
      return;
    }
    el.textContent = `Live quote for ${pc}`;
  }

  function applyQuoteToUi(quote) {
    lastQuote = quote;
    quoteLines = mapApiLines(quote.lines);
    renderQuotePanel(quoteLines);
    updateQuoteRegionLabel(quote);

    const subtotal = quote.subtotal ?? 0;
    const total = quote.total ?? subtotal;
    const vat = quote.vat ?? 0;

    const subEl = document.getElementById('q-subtotal');
    const totalEl = document.getElementById('q-total');
    if (subEl) subEl.textContent = fmt(subtotal);
    if (totalEl) totalEl.textContent = fmt(total);

    const vatRow = document.querySelector('.quote-vat span:last-child');
    if (vatRow) vatRow.textContent = fmt(vat);

    updateFloatBar();
    updateSubmitCta(quote);
  }

  async function refreshQuote() {
    const seq = ++quoteUpdateSeq;
    const payload = buildQuotePayload();

    if (!payload.postcode) {
      setQuoteUpdating(false);
      quoteLines = [];
      lastQuote = null;
      renderQuotePanel([]);
      updateQuoteRegionLabel(null);
      return [];
    }

    if (payload.services.length === 0) {
      setQuoteUpdating(false);
      quoteLines = [];
      lastQuote = null;
      renderQuotePanel([]);
      updateQuoteRegionLabel(null);
      return [];
    }

    setQuoteUpdating(true);

    try {
      const res = await fetch(`${API}/quotes/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Quote preview failed');
      }

      if (seq === quoteUpdateSeq) {
        applyQuoteToUi(json.data);
      }
      return quoteLines;
    } finally {
      if (seq === quoteUpdateSeq) {
        setQuoteUpdating(false);
      }
    }
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    if (state.services.size > 0 || state.activeBundles.size > 0) {
      setQuoteUpdating(true);
    }
    previewTimer = setTimeout(() => {
      previewInFlight = refreshQuote().catch((err) => {
        console.error(err);
        setQuoteUpdating(false);
        const region = document.getElementById('quote-region');
        if (region) region.textContent = 'Could not update quote';
      });
    }, 280);
  }

  function buildBookingPayload() {
    const quotePayload = buildQuotePayload();
    const firstName =
      document.getElementById('b-firstName')?.value?.trim() ||
      document.getElementById('firstName')?.value?.trim();
    const lastName =
      document.getElementById('b-lastName')?.value?.trim() ||
      document.getElementById('lastName')?.value?.trim();

    return {
      ...quotePayload,
      firstName,
      lastName,
      email:
        document.getElementById('b-email')?.value?.trim() ||
        document.getElementById('email')?.value?.trim(),
      phone:
        document.getElementById('b-phone')?.value?.trim() ||
        document.getElementById('phone')?.value?.trim(),
      secondaryPhone: document.getElementById('b-phone2')?.value?.trim() || undefined,
      postcode:
        document.getElementById('b-postcode')?.value?.trim() ||
        document.getElementById('postcode')?.value?.trim(),
      appointmentAddress: document.getElementById('b-address')?.value?.trim(),
      preferredDate: document.getElementById('b-date')?.value || undefined,
      preferredTimeSlot: state.slot || undefined,
      accessProvider: document.getElementById('access-provider')?.value,
      accessArrangements:
        document.getElementById('access-arrangements')?.value?.trim() || undefined,
      comment: document.getElementById('b-comment')?.value?.trim() || undefined,
    };
  }

  function clearValidationErrors() {
    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));
  }

  function getMissingRequiredServiceFields() {
    const missing = [];
    clearValidationErrors();

    for (const code of state.services) {
      const svc = catalogServicesByCode[code];
      if (!svc?.questions) continue;

      for (const q of svc.questions) {
        if (!q.validation?.required) continue;
        if (!isQuestionVisible(code, q)) continue;

        let val = null;
        if (q.inputType === 'radio') {
          val = state.radios[radioGroup(code, q.fieldKey)] || null;
        } else {
          const el = document.getElementById(fieldId(code, q.fieldKey));
          val = el?.value?.trim() || null;
        }

        if (!val) {
          missing.push({
            serviceCode: code,
            fieldKey: q.fieldKey,
            serviceName: svc.name,
            label: q.label,
          });
          const el = document.getElementById(fieldId(code, q.fieldKey));
          if (el) el.classList.add('field-error');
          const row = document.querySelector(
            `[data-q-row][data-service="${code}"][data-field="${q.fieldKey}"]`
          );
          if (row) row.classList.add('field-error');
          if (q.inputType === 'radio') {
            document
              .querySelectorAll(`[data-radio-group="${radioGroup(code, q.fieldKey)}"]`)
              .forEach((r) => r.classList.add('field-error'));
          }
        }
      }
    }

    return missing;
  }

  function alertMissingFields(missing, title) {
    if (!missing.length) return true;
    const msg = missing.map((m) => `• ${m.serviceName}: ${m.label}`).join('\n');
    alert(`${title}\n\n${msg}`);
    const first = missing[0];
    const target = document.getElementById(fieldId(first.serviceCode, first.fieldKey));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof target.focus === 'function') target.focus();
    }
    return false;
  }

  function validateSelectedServices() {
    return alertMissingFields(
      getMissingRequiredServiceFields(),
      'Please complete all required fields for your selected services:'
    );
  }

  function validateBookingForm() {
    clearValidationErrors();
    const missing = [];

    const required = [
      ['b-firstName', 'firstName', 'First name'],
      ['b-lastName', 'lastName', 'Last name'],
      ['b-phone', 'phone', 'Phone'],
      ['b-email', 'email', 'Email'],
      ['b-address', null, 'Appointment address'],
      ['b-postcode', 'postcode', 'Postcode'],
      ['b-date', null, 'Preferred date'],
    ];

    for (const [bid, sid, label] of required) {
      const el = document.getElementById(bid) || (sid ? document.getElementById(sid) : null);
      if (!el?.value?.trim()) {
        if (el) el.classList.add('field-error');
        missing.push({ serviceName: 'Booking details', label });
      }
    }

    if (!state.slot) {
      missing.push({ serviceName: 'Booking details', label: 'Preferred time slot' });
      document.querySelectorAll('.time-slot').forEach((t) => t.classList.add('field-error'));
    }

    const access = document.getElementById('access-provider')?.value;
    if (access && access !== 'me') {
      const arr = document.getElementById('access-arrangements')?.value?.trim();
      if (!arr) {
        const arrEl = document.getElementById('access-arrangements');
        if (arrEl) arrEl.classList.add('field-error');
        missing.push({ serviceName: 'Booking details', label: 'Access arrangements' });
      }
    }

    const serviceMissing = getMissingRequiredServiceFields();
    const allMissing = [...serviceMissing, ...missing];

    return alertMissingFields(
      allMissing,
      'Please complete all required fields before booking:'
    );
  }

  window.calcAll = function calcAllApi() {
    schedulePreview();
    return quoteLines;
  };

  window.buildBillingTable = function buildBillingTableApi() {
    const tbody = document.getElementById('billing-tbody');
    const lines = quoteLines;

    tbody.innerHTML = lines
      .map(
        (l) => `
    <tr class="${l.discount ? 'discount-row' : l.id === 'congestion' || l.id === 'parking' ? 'charge-row' : ''}">
      <td class="desc-cell">
        ${escapeHtml(l.name)}
        ${formatLineDetailsHtml(l)}
      </td>
      <td class="qty-cell" style="text-align:center">1</td>
      <td class="price-cell" style="text-align:right">${l.quoteOnly ? 'TBC' : fmt(l.price < 0 ? Math.abs(l.price) : l.price)}</td>
      <td style="text-align:right">${l.quoteOnly ? 'TBC' : l.price < 0 ? '−' + fmt(Math.abs(l.price)) : fmt(l.price)}</td>
      <td><button class="edit-btn" onclick="goToStep(2)">✎ Edit</button></td>
    </tr>
  `
      )
      .join('');

    const subtotal = lastQuote?.subtotal ?? lines.reduce((s, l) => s + (l.quoteOnly ? 0 : l.price), 0);
    const total = lastQuote?.total ?? subtotal;
    document.getElementById('summary-subtotal').textContent = fmt(subtotal);
    document.getElementById('summary-total').textContent = fmt(total);
  };

  const originalUpdateFloatBar = window.updateFloatBar;
  window.updateFloatBar = function updateFloatBarCatalog() {
    if (!originalUpdateFloatBar) return;

    const names = [];
    state.activeBundles.forEach((bid) => {
      const b = window.BUNDLES[bid];
      if (b) names.push(b.label);
    });
    state.services.forEach((id) => {
      if (!coveredByBundle(id)) {
        names.push(catalogServicesByCode[id]?.name || id);
      }
    });

    originalUpdateFloatBar();
    const floatServices = document.getElementById('float-services');
    if (floatServices && names.length) {
      floatServices.textContent = names.join(' · ');
    }
  };

  window.goToStep = async function goToStepApi(n) {
    if (n === 2 && !validateStep1()) return;

    if (n === 2) {
      if (!getPostcode()) {
        alert('Please enter your postcode in step 1 before selecting services.');
        return;
      }
      const continueBtn = document.querySelector('#step1 .btn-primary');
      setButtonLoading(continueBtn, true, 'Loading services…');
      try {
        const pc = getPostcode();
        const propType = state.propType || 'residential';
        const needsCatalog =
          !catalog || catalogPropertyType !== propType || catalogPostcode !== pc;
        if (needsCatalog) {
          catalog = null;
          catalogPropertyType = null;
          catalogPostcode = null;
          await ensureCatalogLoaded(propType);
        }
        if (propType === 'residential' && catalog && catalog.hasPricing === false) {
          alert(
            'This postcode is outside our London & M25 price area. You can continue, but prices will show as TBC until our team confirms.'
          );
        }
        updateSubmitCta(lastQuote);
        updateQuoteRegionLabel(lastQuote);
        renderSubQuestions();
      } catch (err) {
        alert(err.message || 'Could not load services and prices for your postcode.');
        return;
      } finally {
        setButtonLoading(continueBtn, false);
      }
    }

    if (n === 3) {
      if (state.services.size === 0 && state.activeBundles.size === 0) {
        alert('Please select at least one service to continue.');
        return;
      }
      if (!validateSelectedServices()) return;
    }
    if (n === 4) {
      if (!validateSelectedServices()) return;
      const reviewBtn = document.querySelector('#step3 .btn-primary');
      setButtonLoading(reviewBtn, true, 'Updating quote…');
      try {
        await refreshQuote();
      } catch (err) {
        alert(err.message || 'Could not load quote. Check postcode and service answers.');
        return;
      } finally {
        setButtonLoading(reviewBtn, false);
      }
      buildBillingTable();
      fillBookingDetails();
    }

    document.querySelectorAll('.step-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById('step' + n).classList.add('active');

    document.querySelectorAll('.step-tab').forEach((t, i) => {
      t.classList.remove('active', 'done');
      const sn = i + 1;
      if (sn < n) t.classList.add('done');
      if (sn === n) t.classList.add('active');
    });

    if (n === 3) syncBookingFields();

    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.submitBooking = async function submitBookingApi() {
    if (!validateBookingForm()) return;

    const btn = document.getElementById('btn-submit-booking') || document.querySelector('.btn-book');
    const isQuotation = btn?.dataset.submitMode === 'quotation';

    setButtonLoading(btn, true, isQuotation ? 'Submitting quote request…' : 'Submitting booking…');

    try {
      if (previewInFlight) await previewInFlight;
      await refreshQuote();

      const endpoint = isQuotation ? `${API}/quotations` : `${API}/bookings`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBookingPayload()),
      });
      const json = await res.json();
      let submittedAsQuotation = isQuotation;
      let submittedReference = json.data?.reference || null;
      if (!json.success) {
        if (json.data?.code === 'REQUIRES_QUOTATION') {
          const retry = await fetch(`${API}/quotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildBookingPayload()),
          });
          const retryJson = await retry.json();
          if (!retryJson.success) throw new Error(retryJson.message || 'Quote request failed');
          submittedAsQuotation = true;
          submittedReference = retryJson.data?.reference || submittedReference;
        } else {
          throw new Error(json.message || 'Submission failed');
        }
      } else {
        submittedReference = json.data?.reference || submittedReference;
        if (endpoint.includes('/quotations')) {
          submittedAsQuotation = true;
        }
      }

      document.querySelectorAll('.step-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById('step-confirm').classList.add('active');
      document.querySelectorAll('.step-tab').forEach((t) => {
        t.classList.remove('active');
        t.classList.add('done');
      });
      document.getElementById('float-quote').classList.add('hidden');

      const firstName =
        document.getElementById('b-firstName')?.value || document.getElementById('firstName')?.value;
      const lastName =
        document.getElementById('b-lastName')?.value || document.getElementById('lastName')?.value;
      const email = document.getElementById('b-email')?.value || document.getElementById('email')?.value;
      const address = document.getElementById('b-address')?.value || '';
      const postcode =
        document.getElementById('b-postcode')?.value || document.getElementById('postcode')?.value;
      const date = document.getElementById('b-date')?.value;
      const slot = state.slot;
      const total =
        document.getElementById('summary-total')?.textContent || fmt(lastQuote?.total || 0);

      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      const fullAddress = [address, postcode].filter(Boolean).join(', ');
      const dateStr = date
        ? new Date(date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Date to be confirmed';
      const slotStr =
        slot === 'morning'
          ? 'Morning slot: 8:00am – 1:00pm'
          : slot === 'afternoon'
            ? 'Afternoon slot: 1:00pm – 6:00pm'
            : 'Time slot to be confirmed';

      submittedAsQuotation =
        submittedAsQuotation || quoteNeedsQuotation(lastQuote);
      const titleEl = document.getElementById('confirm-title');
      const leadEl = document.getElementById('confirm-lead');
      if (titleEl) {
        titleEl.textContent = submittedAsQuotation
          ? 'Quote Request Submitted!'
          : 'Booking Request Submitted!';
      }
      if (leadEl) {
        leadEl.innerHTML = submittedAsQuotation
          ? `Thank you. Our team will review your services and email a <strong>custom quote</strong> to <strong id="confirm-email">${escapeHtml(email || 'your email')}</strong> shortly.`
          : `Your booking request has been received. We have sent a <strong>confirmation email</strong> to <strong id="confirm-email">${escapeHtml(email || 'your email')}</strong>.`;
      } else {
        document.getElementById('confirm-email').textContent = email || 'your email';
      }
      const refEl = document.getElementById('confirm-reference');
      if (refEl) {
        if (submittedReference) {
          refEl.textContent = `Reference: ${submittedReference}`;
          refEl.parentElement.style.display = '';
        } else {
          refEl.parentElement.style.display = 'none';
        }
      }
      document.getElementById('confirm-name').textContent = fullName;
      document.getElementById('confirm-address').textContent = fullAddress || '—';
      document.getElementById('confirm-date').textContent = 'Date: ' + dateStr;
      document.getElementById('confirm-slot').textContent = 'Time: ' + slotStr;
      document.getElementById('confirm-total').textContent = submittedAsQuotation
        ? 'Pricing: To be confirmed — our team will send your quote by email'
        : 'Estimated Total: ' + total + ' — invoice to follow by bank transfer';

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(err.message || 'Could not submit booking. Please try again.');
    } finally {
      setButtonLoading(btn, false);
    }
  };

  window.toggleService = function toggleServiceApi(serviceCode) {
    if (coveredByBundle(serviceCode)) return;

    const row = document.getElementById('svc-' + serviceCode);
    const isOn = state.services.has(serviceCode);

    if (isOn) {
      state.services.delete(serviceCode);
      clearServiceAnswers(serviceCode);
      if (row) row.classList.remove('selected');
      clearSubqSlot(serviceCode);

      for (const bundleId of [...state.activeBundles]) {
        const bdef = window.BUNDLES[bundleId];
        if (bdef?.services.includes(serviceCode)) {
          deactivateBundle(bundleId);
        }
      }
    } else {
      state.services.add(serviceCode);
      if (row) row.classList.add('selected');
    }

    renderSubQuestions();
    resetQuoteIfEmpty();
    calcAll();
  };

  window.toggleBundle = function toggleBundleApi(bundleId, svcIds) {
    const bundleRow = document.getElementById('svc-' + bundleId);
    const isOn = state.activeBundles.has(bundleId);

    if (isOn) {
      deactivateBundle(bundleId);
    } else {
      for (const [bid, bdef] of Object.entries(window.BUNDLES)) {
        if (bid === bundleId) continue;
        if (!state.activeBundles.has(bid)) continue;
        const overlap = bdef.services.some((s) => svcIds.includes(s));
        if (overlap) deactivateBundle(bid);
      }

      svcIds.forEach((id) => {
        if (state.services.has(id)) {
          clearServiceAnswers(id);
        }
        const row = document.getElementById('svc-' + id);
        if (row) row.classList.remove('selected');
      });

      state.activeBundles.add(bundleId);
      if (bundleRow) bundleRow.classList.add('selected');

      svcIds.forEach((id) => {
        state.services.add(id);
        const row = document.getElementById('svc-' + id);
        if (row) {
          row.classList.remove('selected');
          row.style.display = 'none';
        }
        clearSubqSlot(id);
      });
    }

    renderSubQuestions();
    resetQuoteIfEmpty();
    calcAll();
  };

  const originalSyncField = window.syncField;
  window.syncField = function syncFieldApi(field) {
    if (originalSyncField) originalSyncField(field);
    if (field === 'postcode') {
      const bpc = document.getElementById('b-postcode');
      const pc = document.getElementById('postcode');
      if (bpc && pc) bpc.value = pc.value;
      if (catalogPostcode && catalogPostcode !== getPostcode()) {
        catalog = null;
        catalogPropertyType = null;
        catalogPostcode = null;
      }
    }
  };

  renderQuotePanel([]);
  updateQuoteRegionLabel(null);
})();
