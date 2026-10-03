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

  function removeStoredQuestions(code) {
    const stored = document.getElementById('stored-q-' + code);
    if (stored) stored.remove();
  }

  let modalContext = null;

  function serviceHasQuestions(code) {
    const svc = catalogServicesByCode[code];
    return Boolean(svc?.questions?.length);
  }

  function bundleHasQuestions(svcIds) {
    return (svcIds || []).some((code) => serviceHasQuestions(code));
  }

  function getServiceModalTitle(code) {
    if (SERVICE_UI[code]?.title) return SERVICE_UI[code].title;
    const svc = catalogServicesByCode[code];
    if (!svc) return code;
    if (svc.code === 'eicr') return 'EICR';
    return svc.name;
  }

  function getModalServiceCodes() {
    if (!modalContext) return [];
    if (modalContext.type === 'service') return [modalContext.serviceCode];
    return (modalContext.svcIds || []).filter((code) => serviceHasQuestions(code));
  }

  function renderQuestionsOnly(serviceCode) {
    const svc = catalogServicesByCode[serviceCode];
    if (!svc?.questions?.length) return '';
    const questions = [...svc.questions].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return questions.map((q) => renderQuestion(serviceCode, q)).join('');
  }

  function loadQuestionsIntoModalBody(codes) {
    const body = document.getElementById('service-modal-body');
    if (!body) return;
    body.innerHTML = '';

    codes.forEach((code) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'service-modal__section';
      wrapper.dataset.storedService = code;

      const stored = document.getElementById('stored-q-' + code);
      if (stored && stored.childNodes.length) {
        while (stored.firstChild) wrapper.appendChild(stored.firstChild);
      } else {
        const questionsHtml = renderQuestionsOnly(code);
        if (!questionsHtml) return;
        if (codes.length > 1) {
          const heading = document.createElement('h3');
          heading.className = 'service-modal__section-title';
          heading.textContent = getServiceModalTitle(code);
          wrapper.appendChild(heading);
        }
        wrapper.insertAdjacentHTML('beforeend', questionsHtml);
      }

      body.appendChild(wrapper);
      applyConditionalVisibility(code);
    });
  }

  function persistModalToStore(codes) {
    const body = document.getElementById('service-modal-body');
    const store = document.getElementById('service-questions-store');
    if (!body || !store) return;

    codes.forEach((code) => {
      const section = body.querySelector(`[data-stored-service="${code}"]`);
      if (!section) return;

      let holder = document.getElementById('stored-q-' + code);
      if (!holder) {
        holder = document.createElement('div');
        holder.id = 'stored-q-' + code;
        store.appendChild(holder);
      }
      holder.innerHTML = '';
      while (section.firstChild) holder.appendChild(section.firstChild);
    });

    body.innerHTML = '';
  }

  function getMissingRequiredForCodes(codes) {
    const missing = [];
    for (const code of codes) {
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

  function openServiceModal(type, ctx) {
    modalContext = { type, ...ctx };
    const modal = document.getElementById('service-modal');
    const titleEl = document.getElementById('service-modal-title');
    if (!modal || !titleEl) return;

    if (type === 'service') {
      titleEl.textContent = getServiceModalTitle(ctx.serviceCode);
      loadQuestionsIntoModalBody([ctx.serviceCode]);
    } else {
      const bundle = (catalog?.bundles || []).find((b) => b.bundleKey === ctx.bundleId);
      titleEl.textContent = getBundleCardTitle(bundle || { bundleKey: ctx.bundleId, label: ctx.bundleId });
      loadQuestionsIntoModalBody(getModalServiceCodes());
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const body = document.getElementById('service-modal-body');
    if (body) body.scrollTop = 0;
  }

  // ── Selected-card summary (answers grid + Edit / Delete) ──

  const SMALL_WORDS = new Set(['of', 'and', 'or', 'the', 'a', 'an', 'per', 'to', 'in']);

  function shortQuestionLabel(label) {
    return String(label || '')
      .replace(/^number of\s+/i, 'No of ')
      .split(' ')
      .map((word, i) => (i > 0 && SMALL_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' ');
  }

  function displayAnswer(q, value) {
    const option = normalizeOptions(q.options).find((o) => String(o.value) === String(value));
    let text = String(option ? option.label ?? option.value : value)
      .replace(/\s*[—–-]\s*£[\d,.]+.*$/, '') // price suffix
      .replace(/\s+[—–]\s+.*$/, '') // notes like "— per unit"
      .trim();
    // "No of Bedrooms: 5 bedrooms" -> "05": the label already names the unit.
    const count = text.match(/^(\d+(?:\s*[-–]\s*\d+)?\+?)\s+[a-z][\w\s]*$/i);
    if (count && /^No of /.test(shortQuestionLabel(q.label))) text = count[1];
    if (/^\d$/.test(text)) text = '0' + text;
    return text;
  }

  function answersGridHtml(codes) {
    const items = [];
    for (const code of codes) {
      const svc = catalogServicesByCode[code];
      for (const q of [...(svc?.questions || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))) {
        if (q.inputType === 'textarea' || !isQuestionVisible(code, q)) continue;
        const value = readFieldValue(code, q.fieldKey, q.inputType);
        if (value == null || value === '') continue;
        items.push(`
          <div class="svc-answer">
            <div class="svc-answer__label">${escapeHtml(shortQuestionLabel(q.label))}</div>
            <div class="svc-answer__value">${escapeHtml(displayAnswer(q, value))}</div>
          </div>`);
      }
    }
    return items.length ? `<div class="svc-card__answers">${items.join('')}</div>` : '';
  }

  const TRASH_ICON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.667 4h10.666M6.667 7.333v4M9.333 7.333v4M3.333 4l.667 8.667A1.333 1.333 0 0 0 5.333 14h5.334A1.333 1.333 0 0 0 12 12.667L12.667 4M6 4V2.667A.667.667 0 0 1 6.667 2h2.666a.667.667 0 0 1 .667.667V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function selectionFor(card) {
    const bundleKey = card.dataset.bundleKey;
    if (bundleKey) {
      return {
        kind: 'bundle',
        key: bundleKey,
        selected: state.activeBundles.has(bundleKey),
        codes: window.BUNDLES[bundleKey]?.services || [],
      };
    }
    const code = card.dataset.serviceCode;
    return { kind: 'service', key: code, selected: state.services.has(code) && !coveredByBundle(code), codes: [code] };
  }

  // Selected cards show their answers and Edit / Delete buttons instead of the price.
  function refreshSelectedCards() {
    document.querySelectorAll('.svc-card[data-service-code], .svc-card[data-bundle-key]').forEach((card) => {
      card.querySelector('.svc-card__actions')?.remove();
      card.querySelector('.svc-card__answers')?.remove();
      card.classList.remove('svc-card--summary');

      const sel = selectionFor(card);
      if (!sel.selected) return;

      const name = card.querySelector('.svc-card__title')?.textContent.trim() || sel.key;
      const editable = sel.codes.some((code) => serviceHasQuestions(code));
      const actions = `
        <div class="svc-card__actions">
          <button type="button" class="svc-card__icon-btn" aria-label="Remove ${escapeHtml(name)}"
            onclick="event.stopPropagation(); removeSelection('${sel.kind}', '${escapeHtml(sel.key)}')">${TRASH_ICON}</button>
          ${editable ? `<button type="button" class="svc-card__edit-btn" aria-label="Edit ${escapeHtml(name)}"
            onclick="event.stopPropagation(); editSelection('${sel.kind}', '${escapeHtml(sel.key)}')">Edit</button>` : ''}
        </div>`;
      card.querySelector('.svc-card__body')?.insertAdjacentHTML('beforeend', actions);

      const answers = answersGridHtml(sel.codes);
      if (answers) {
        card.insertAdjacentHTML('beforeend', answers);
        card.classList.add('svc-card--summary');
      }
    });
  }

  window.removeSelection = function removeSelection(kind, key) {
    if (kind === 'bundle') window.toggleBundle(key, window.BUNDLES[key]?.services || []);
    else window.toggleService(key);
  };

  function snapshotAnswers(codes) {
    const values = {};
    for (const code of codes) {
      for (const q of catalogServicesByCode[code]?.questions || []) {
        if (q.inputType === 'radio') continue;
        const el = document.getElementById(fieldId(code, q.fieldKey));
        if (el) values[fieldId(code, q.fieldKey)] = el.value;
      }
    }
    return { radios: { ...state.radios }, values };
  }

  function restoreAnswers(snapshot) {
    Object.keys(state.radios).forEach((k) => delete state.radios[k]);
    Object.assign(state.radios, snapshot.radios);
    Object.entries(snapshot.values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
  }

  window.editSelection = function editSelection(kind, key) {
    const codes = kind === 'bundle' ? window.BUNDLES[key]?.services || [] : [key];
    const snapshot = snapshotAnswers(codes);
    if (kind === 'bundle') openServiceModal('bundle', { bundleId: key, svcIds: codes, isEdit: true, snapshot });
    else openServiceModal('service', { serviceCode: key, isEdit: true, snapshot });
  };

  window.onSvcCardClick = function onSvcCardClick(card) {
    const sel = selectionFor(card);
    // A selected card with answers opens Edit; removing is the bin button's job.
    if (sel.selected && card.classList.contains('svc-card--summary')) {
      window.editSelection(sel.kind, sel.key);
      return;
    }
    if (sel.kind === 'bundle') window.toggleBundleFromEl(card);
    else window.toggleService(sel.key);
  };

  window.closeServiceModal = function closeServiceModal() {
    // Cancelling an edit: put the answer inputs back in the store and undo any changes.
    if (modalContext?.isEdit && !modalContext.confirmed) {
      const ctx = modalContext;
      persistModalToStore(getModalServiceCodes());
      restoreAnswers(ctx.snapshot);
      modalContext = null;
      window.closeServiceModal();
      renderSubQuestions();
      return;
    }
    const modal = document.getElementById('service-modal');
    const body = document.getElementById('service-modal-body');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
    if (body) body.innerHTML = '';
    modalContext = null;
    document.body.style.overflow = '';
  };

  function finalizeBundleSelection(bundleId, svcIds) {
    const bundleRow = document.getElementById('svc-' + bundleId);

    for (const [bid, bdef] of Object.entries(window.BUNDLES)) {
      if (bid === bundleId) continue;
      if (!state.activeBundles.has(bid)) continue;
      const overlap = bdef.services.some((s) => svcIds.includes(s));
      if (overlap) deactivateBundle(bid);
    }

    svcIds.forEach((id) => {
      if (state.services.has(id)) clearServiceAnswers(id);
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

  window.confirmServiceModal = function confirmServiceModal() {
    if (!modalContext) return;

    const codes = getModalServiceCodes();
    const missing = getMissingRequiredForCodes(codes);
    if (missing.length) {
      if (typeof showToast === 'function') {
        showToast('Please complete all required fields before adding this service.');
      }
      const first = document.querySelector('#service-modal-body .field-error');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    persistModalToStore(codes);

    if (modalContext.isEdit) {
      // Already selected: just keep the new answers (re-finalizing a bundle would clear them).
      modalContext.confirmed = true;
      closeServiceModal();
      renderSubQuestions();
      return;
    }

    if (modalContext.type === 'service') {
      const serviceCode = modalContext.serviceCode;
      state.services.add(serviceCode);
      const row = document.getElementById('svc-' + serviceCode);
      if (row) row.classList.add('selected');
    } else {
      finalizeBundleSelection(modalContext.bundleId, modalContext.svcIds);
    }

    closeServiceModal();
    renderSubQuestions();
    resetQuoteIfEmpty();
    calcAll();
    if (typeof updateStep2NextState === 'function') updateStep2NextState();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalContext) closeServiceModal();
  });

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
      clearSubqSlot(id);
      removeStoredQuestions(id);
      showServiceRow(id);
    });
    clearSubqSlot(bundleId);
    removeStoredQuestions(bundleId);
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

  const CATEGORY_TAB_LABELS = {
    'EPC & Survey': 'Energy Rating',
    'Commercial EPC & Survey': 'Energy Rating',
    'Commercial Gas': 'Gas',
    'Commercial Electrical': 'Electrical',
    'Commercial Fire Safety': 'Fire Safety',
    'Electrical Installation & Repair': 'Electrical',
    'Gas Installation & Repair': 'Gas',
    'Fire Installation & Repair': 'Fire Safety',
  };

  const CATEGORY_SORT_ORDER = ['Gas', 'Electrical', 'Fire Safety', 'Energy Rating', 'Other'];

  const BUNDLE_UI = {
    'bundle-gsc-boiler': { title: 'Gas Bundle', popular: true },
    'bundle-eicr-pat': { title: 'Electrical Bundle', popular: true },
    'bundle-fsc-elc': { title: 'Fire Safety Bundle 1', popular: true },
    'bundle-fsc-elc-fra': { title: 'Fire Safety Bundle 2', popular: true },
    'bundle-epc-fp': { title: 'Energy Bundle', popular: true },
  };

  const SERVICE_UI = {
    gsc: { title: 'CP12 Gas Safety Certificate', desc: 'Annual Landlord Requirement' },
    boiler: { title: 'Annual Boiler Service', desc: 'Certificate Plus Boiler Health Check' },
    eicr: { title: 'EICR', desc: 'Annual Landlord Requirement' },
    pat: { title: 'PAT Testing', desc: 'Portable Appliance Testing' },
    fsc: { title: 'Fire Alarm Certificate', desc: 'Annual Landlord Requirement' },
    elc: { title: 'Emergency Light Certificate', desc: 'Annual Compliance Check' },
    fra: { title: 'Fire Risk Assessment', desc: 'Commercial & HMO Requirement' },
    epc: { title: 'Energy Performance Certificate', desc: 'Valid for 10 Years' },
    floorplan: { title: 'Floor Plan', desc: 'Professional Property Survey' },
    asbestos: { title: 'Asbestos Survey', desc: 'Pre-Renovation Assessment' },
  };

  function categoryTabLabel(name) {
    return CATEGORY_TAB_LABELS[name] || name.replace(/^Commercial /, '');
  }

  function categorySectionTitle(name) {
    return categoryTabLabel(name);
  }

  function sortCategories(categories) {
    return [...categories].sort((a, b) => {
      const ai = CATEGORY_SORT_ORDER.indexOf(categoryTabLabel(a.name));
      const bi = CATEGORY_SORT_ORDER.indexOf(categoryTabLabel(b.name));
      const aRank = ai === -1 ? 99 : ai;
      const bRank = bi === -1 ? 99 : bi;
      return aRank - bRank || (a.displayOrder || 0) - (b.displayOrder || 0);
    });
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

  function minOptionPrice(service) {
    let min = null;
    for (const q of service.questions || []) {
      for (const opt of q.options || []) {
        const amount =
          opt.price != null ? opt.price : tierAmount(typeof opt === 'string' ? null : opt.tierKey);
        if (amount != null && (min === null || amount < min)) min = amount;
      }
    }
    return min;
  }

  function getServicePriceLabel(service) {
    const meta = service.metadata || {};
    if (meta.startsFrom != null) {
      return `from £${Math.round(Number(meta.startsFrom))}`;
    }
    if (meta.startsFromTierKey) {
      const amount = tierAmount(meta.startsFromTierKey);
      if (amount != null) return `from £${Math.round(amount)}`;
    }
    const min = minOptionPrice(service);
    if (min != null) return `from £${Math.round(min)}`;
    if (service.pricingMode === 'quote_only') return 'Quote';
    return '';
  }

  function getServiceCardTitle(service) {
    return SERVICE_UI[service.code]?.title || service.name;
  }

  function getServiceCardDesc(service) {
    return SERVICE_UI[service.code]?.desc || service.metadata?.cardDescription || '';
  }

  function getBundleCardTitle(bundle) {
    return BUNDLE_UI[bundle.bundleKey]?.title || bundle.label;
  }

  function getBundleCardDesc(bundle) {
    if (BUNDLE_UI[bundle.bundleKey]?.title) return bundle.label;
    return bundle.metadata?.subtitle || bundle.label;
  }

  function renderSubqSlot(id) {
    return `<div class="subq-slot" id="subq-${escapeHtml(id)}"></div>`;
  }

  function renderServiceCard(service) {
    const code = service.code;
    const price = getServicePriceLabel(service);
    const desc = getServiceCardDesc(service);
    return `
      <div class="svc-card" id="svc-${escapeHtml(code)}" data-service-code="${escapeHtml(code)}" onclick="onSvcCardClick(this)">
        <div class="svc-card__body">
          <div class="svc-card__main">
            <div class="svc-card__title">${escapeHtml(getServiceCardTitle(service))}</div>
            ${desc ? `<div class="svc-card__desc">${escapeHtml(desc)}</div>` : ''}
          </div>
          ${price ? `<div class="svc-card__price">${escapeHtml(price)}</div>` : ''}
        </div>
      </div>`;
  }

  function renderBundleCard(bundle, layout) {
    const key = bundle.bundleKey;
    const services = JSON.stringify(bundle.serviceCodes || []);
    const save =
      bundle.metadata?.saveLabel ||
      (bundle.discountAmount ? `Save £${bundle.discountAmount}` : '');
    const popular = BUNDLE_UI[key]?.popular || bundle.metadata?.popular;
    const widthClass = layout === 'full' ? ' svc-card--full' : '';
    const popularClass = popular ? ' svc-card--popular' : '';
    return `
      <div class="svc-card svc-card--bundle${widthClass}${popularClass}" id="svc-${escapeHtml(key)}"
        data-bundle-key="${escapeHtml(key)}"
        data-bundle-services='${escapeHtml(services)}'
        onclick="onSvcCardClick(this)">
        ${popular ? '<span class="svc-card__badge">Popular</span>' : ''}
        <div class="svc-card__body">
          <div class="svc-card__main">
            <div class="svc-card__title">${escapeHtml(getBundleCardTitle(bundle))}</div>
            <div class="svc-card__desc">${escapeHtml(getBundleCardDesc(bundle))}</div>
          </div>
          ${save ? `<div class="svc-card__save">${escapeHtml(save)}</div>` : ''}
        </div>
      </div>`;
  }

  function renderCategorySection(cat) {
    const services = (cat.services || [])
      .filter((s) => !s.children?.length)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const bundles = bundlesForCategory(services.map((s) => s.code));

    let cardsHtml = '';

    if (bundles.length === 1) {
      cardsHtml += renderBundleCard(bundles[0], 'full');
      cardsHtml += renderSubqSlot(bundles[0].bundleKey);
    } else if (bundles.length > 1) {
      cardsHtml += `<div class="svc-cards-row">${bundles.map((b) => renderBundleCard(b, 'half')).join('')}</div>`;
      cardsHtml += bundles.map((b) => renderSubqSlot(b.bundleKey)).join('');
    }

    if (services.length) {
      cardsHtml += `<div class="svc-cards-row">${services.map((s) => renderServiceCard(s)).join('')}</div>`;
      cardsHtml += services.map((s) => renderSubqSlot(s.code)).join('');
    }

    return `
      <section class="svc-section" id="svc-section-${escapeHtml(cat.code)}" data-category="${escapeHtml(cat.code)}">
        <h3 class="svc-section__title">${escapeHtml(categorySectionTitle(cat.name))}</h3>
        <div class="svc-section__cards">${cardsHtml}</div>
      </section>`;
  }

  function bindSvcTabs() {
    document.querySelectorAll('.svc-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.svc-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
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
      container.innerHTML = '<p class="catalog-loading">Loading services…</p>';
    }
    const tabsContainer = document.getElementById('svc-tabs');
    if (tabsContainer) tabsContainer.innerHTML = '';

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
        applyPendingServiceCode();
        return catalog;
      })
      .catch((err) => {
        if (container) {
          container.innerHTML = `<p class="catalog-error">${escapeHtml(err.message)}</p>`;
        }
        throw err;
      })
      .finally(() => {
        catalogLoadPromise = null;
      });

    return catalogLoadPromise;
  }

  // Applies a service code requested via ?service=<code> on the booking URL,
  // once its card actually exists in the freshly-rendered catalog (Step 2 loads
  // the catalog lazily, so this can't run any earlier than this point).
  function applyPendingServiceCode() {
    const code = window.__pendingServiceCode;
    if (!code) return;
    window.__pendingServiceCode = null;
    if (document.getElementById('svc-' + code) && typeof window.toggleService === 'function' && !state.services.has(code)) {
      window.toggleService(code);
    }
  }

  function renderCatalogGrid() {
    const container = document.getElementById('catalog-services');
    const tabsContainer = document.getElementById('svc-tabs');
    if (!container || !catalog) return;

    const categories = sortCategories(catalog.categories || []);

    if (tabsContainer) {
      tabsContainer.innerHTML = categories
        .map(
          (cat, index) => `
        <button type="button" class="svc-tab${index === 0 ? ' active' : ''}"
          data-target="svc-section-${escapeHtml(cat.code)}"
          role="tab"
          aria-selected="${index === 0 ? 'true' : 'false'}">
          ${escapeHtml(categoryTabLabel(cat.name))}
        </button>`
        )
        .join('');
      bindSvcTabs();
    }

    container.innerHTML = categories.map((cat) => renderCategorySection(cat)).join('');

    restoreSelectionUi();
    if (typeof updateStep2NextState === 'function') updateStep2NextState();
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
        <div class="service-modal__field subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label for="${id}">${escapeHtml(q.label)} ${req}</label>
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
        <div class="service-modal__field subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}" id="row-${id}">
          <label>${escapeHtml(q.label)} ${req}</label>
          <div class="radio-group">${radios}</div>
          ${note}
        </div>`;
      }
      case 'number': {
        const min = q.validation?.min != null ? ` min="${q.validation.min}"` : '';
        const max = q.validation?.max != null ? ` max="${q.validation.max}"` : '';
        return `
        <div class="service-modal__field subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label for="${id}">${escapeHtml(q.label)} ${req}</label>
          <input type="number" id="${id}" data-field-key="${escapeHtml(q.fieldKey)}" placeholder="e.g. 8"${min}${max} oninput="calcAll()">
        </div>`;
      }
      case 'textarea':
        return `
        <div class="service-modal__field subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label for="${id}">${escapeHtml(q.label)} ${req}</label>
          <textarea id="${id}" data-field-key="${escapeHtml(q.fieldKey)}" oninput="calcAll()"></textarea>
        </div>`;
      case 'text':
      default:
        return `
        <div class="service-modal__field subq-row${hidden}" data-q-row data-service="${escapeHtml(serviceCode)}" data-field="${escapeHtml(q.fieldKey)}">
          <label for="${id}">${escapeHtml(q.label)} ${req}</label>
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
    calcAll();
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
    document.querySelectorAll('.subq-slot').forEach((slot) => {
      slot.innerHTML = '';
    });

    for (const code of state.services) {
      applyConditionalVisibility(code);
    }

    Object.entries(state.radios).forEach(([group, val]) => {
      if (!val) return;
      document.querySelectorAll(`[data-radio-group="${group}"]`).forEach((el) => {
        el.classList.toggle('checked', el.dataset.radioValue === val);
      });
    });

    refreshSelectedCards();
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
      const store = document.getElementById('service-questions-store');
      if (store) store.innerHTML = '';
      closeServiceModal();
    }

    updateSubmitCta(lastQuote);
    updateQuoteRegionLabel(lastQuote);
  };

  function getCurrentStep() {
    if (typeof currentStep === 'number') return currentStep;
    if (typeof window.currentStep === 'number') return window.currentStep;
    const active = document.querySelector('.step-panel.active');
    if (active?.id?.startsWith('step')) {
      const stepNum = parseInt(active.id.replace('step', ''), 10);
      if (!Number.isNaN(stepNum)) return stepNum;
    }
    return 1;
  }

  function shouldIncludeSurcharges() {
    return getCurrentStep() >= 3;
  }

  function isSurchargeApiLine(line) {
    const name = line?.name || '';
    return name === 'Congestion Charge' || name === 'Parking Charge';
  }

  function isSurchargeDisplayLine(line) {
    return (
      line.id === 'congestion' ||
      line.id === 'parking' ||
      line.name === 'Congestion Charge' ||
      line.name === 'Parking Charge'
    );
  }

  function recalcQuoteSummary(lines, quote) {
    const subtotal = round2(
      lines.reduce((sum, line) => {
        if (line.isTbc || line.quoteOnly || line.total === null || line.total === undefined) return sum;
        return sum + line.total;
      }, 0)
    );
    const origSubtotal = quote?.subtotal ?? 0;
    const origVat = quote?.vat ?? 0;
    const origTotal = quote?.total ?? origSubtotal;
    if (!origSubtotal || origSubtotal === subtotal) {
      return { subtotal, vat: origVat, total: origTotal };
    }
    const ratio = subtotal / origSubtotal;
    const vat = round2(origVat * ratio);
    const total = round2(subtotal + vat);
    return { subtotal, vat, total };
  }

  function filterQuoteForCurrentStep(quote) {
    if (!quote || shouldIncludeSurcharges()) return quote;
    const lines = (quote.lines || []).filter((line) => !isSurchargeApiLine(line));
    const summary = recalcQuoteSummary(lines, quote);
    return { ...quote, lines, ...summary };
  }

  function applyZoneDefaultsForDetails() {
    const regionName =
      lastQuote?.resolvedRegion?.name ||
      catalog?.resolvedRegion?.name ||
      regionPrices?.resolvedRegion?.name ||
      '';
    if (!/Zone 1/i.test(regionName)) return;
    if (typeof window.selectZone === 'function') window.selectZone(true);
    if (typeof window.selectParking === 'function') window.selectParking(false);
  }

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
      congestionZone: shouldIncludeSurcharges() ? !!state.congestion : false,
      parkingAvailable: shouldIncludeSurcharges() ? !!state.parking : true,
    };
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function mapApiLines(lines) {
    return (lines || []).map((l) => {
      const mapped = {
        name: l.name,
        sub: l.sub || '',
        selectionDetails: '',
        serviceDetails: l.serviceDetails || null,
        price: l.total,
        id: l.serviceCode,
        serviceCode: l.serviceCode,
        serviceName: l.serviceName,
        discount: l.isDiscount,
        isAddon: !!l.isAddon,
        componentFieldKey: l.componentFieldKey || null,
        pricingFieldKeys: l.pricingFieldKeys || null,
        quoteOnly: l.quoteOnly || l.isTbc,
      };
      mapped.selectionDetails = formatLineSelectionDetails(mapped.serviceDetails, mapped);
      return mapped;
    });
  }

  function formatLineSelectionDetails(serviceDetails, line = {}) {
    if (!serviceDetails?.selections?.length || line.isAddon || line.componentFieldKey) return '';
    let selections = serviceDetails.selections;
    for (const fieldKey of line.pricingFieldKeys || []) {
      selections = selections.filter((entry) => entry.fieldKey !== fieldKey);
    }
    if (line.serviceCode === 'gsc') {
      selections = selections.filter(
        (entry) => !['applianceCount', 'coAlarmInstall'].includes(entry.fieldKey)
      );
    }
    return selections.map((s) => `${s.label}: ${s.displayValue}`).join(' · ');
  }

  function formatLineDetailsHtml(line) {
    if (line.isAddon || line.componentFieldKey) {
      return line.sub
        ? `<div class="line-sub line-details">${escapeHtml(line.sub)}</div>`
        : '';
    }
    const parts = [];
    if (line.sub?.trim()) parts.push(line.sub.trim());
    if (line.selectionDetails?.trim()) {
      const subText = line.sub?.trim() || '';
      if (!subText || !line.selectionDetails.includes(subText)) {
        parts.push(line.selectionDetails.trim());
      }
    }
    if (!parts.length) return '';
    return `<div class="line-sub line-details">${escapeHtml(parts.join(' · '))}</div>`;
  }

  function formatQuoteLinePrice(line) {
    if (line.quoteOnly) return 'TBC';
    if (line.price == null || line.price === undefined) return 'TBC';
    return fmt(line.price);
  }

  function updateQuoteTotals(serviceLines, discountLines, quoteTotal) {
    const grossSubtotal = round2(
      serviceLines.reduce((sum, line) => {
        if (line.quoteOnly || line.price == null || line.price === undefined) return sum;
        return sum + line.price;
      }, 0)
    );
    const discountTotal = round2(
      discountLines.reduce((sum, line) => {
        if (line.price == null || line.price === undefined) return sum;
        return sum + Math.abs(line.price);
      }, 0)
    );
    const finalTotal =
      quoteTotal != null && quoteTotal !== undefined ? quoteTotal : round2(grossSubtotal - discountTotal);

    const subEl = document.getElementById('q-subtotal');
    const totalEl = document.getElementById('q-total');
    const wasEl = document.getElementById('q-was');
    const discountRow = document.getElementById('q-discount-row');
    const discountEl = document.getElementById('q-discount');
    const discountLabelEl = document.getElementById('q-discount-label');

    if (subEl) subEl.textContent = fmt(grossSubtotal);
    if (totalEl) totalEl.textContent = fmt(finalTotal);

    if (discountTotal > 0.001) {
      discountRow?.classList.remove('hidden');
      if (discountEl) discountEl.textContent = `−${fmt(discountTotal)}`;
      if (discountLabelEl) {
        const label = discountLines.find((line) => line.name)?.name || 'Bundle Discount';
        discountLabelEl.textContent = label;
      }
      if (wasEl) {
        wasEl.textContent = fmt(grossSubtotal);
        wasEl.classList.remove('hidden');
      }
    } else {
      discountRow?.classList.add('hidden');
      wasEl?.classList.add('hidden');
    }
  }

  window.renderQuotePanel = function renderQuotePanelApi(lines) {
    const linesEl = document.getElementById('quote-lines');
    const totalsEl = document.getElementById('quote-totals');
    const emptyEl = document.getElementById('quote-empty');

    const validLines = lines.filter((l) => l.discount || l.price !== 0 || l.quoteOnly);
    const serviceLines = validLines.filter((l) => !l.discount);

    if (serviceLines.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      if (linesEl) linesEl.innerHTML = '';
      if (totalsEl) totalsEl.classList.add('hidden');
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (totalsEl) totalsEl.classList.remove('hidden');

    if (linesEl) {
      linesEl.innerHTML = serviceLines
        .map(
          (l) => `
    <div class="quote-line">
      <div class="quote-line-name">
        ${escapeHtml(l.name)}
        ${formatLineDetailsHtml(l)}
      </div>
      <div class="quote-line-price">${formatQuoteLinePrice(l)}</div>
    </div>
  `
        )
        .join('');
    }

    const discountLines = validLines.filter((l) => l.discount);
    updateQuoteTotals(serviceLines, discountLines, lastQuote?.total ?? null);
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
      btn.innerHTML = 'Request Quote';
      btn.dataset.submitMode = 'quotation';
    } else {
      btn.innerHTML = 'Confirm Booking';
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
      el.textContent = '';
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
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
    const displayQuote = filterQuoteForCurrentStep(quote);
    quoteLines = mapApiLines(displayQuote.lines).filter((line) =>
      shouldIncludeSurcharges() ? true : !isSurchargeDisplayLine(line)
    );
    renderQuotePanel(quoteLines);
    updateQuoteRegionLabel(displayQuote);
    updateFloatBar();
    updateSubmitCta(displayQuote);
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
    if (typeof syncFullName === 'function') syncFullName();
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
    document.querySelectorAll('.form-error-msg').forEach((el) => { el.style.display = 'none'; });
  }

  function getMissingRequiredServiceFields() {
    const missing = [];

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
    if (typeof showToast === 'function') {
      showToast(title);
    }
    const first = missing[0];
    if (first.serviceCode) {
      const target = document.getElementById(fieldId(first.serviceCode, first.fieldKey));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof target.focus === 'function') target.focus();
      }
    }
    return false;
  }

  function validateSelectedServices() {
    clearValidationErrors();
    return alertMissingFields(
      getMissingRequiredServiceFields(),
      'Please answer all required service questions. Required fields are highlighted in red.'
    );
  }

  function showFieldError(elementId, errorId, message) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('field-error');
    const errEl = document.getElementById(errorId);
    if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
  }

  function validateBookingForm() {
    clearValidationErrors();
    const missing = [];

    const required = [
      ['b-firstName', 'firstName', 'b-firstName-error', 'First name is required.'],
      ['b-lastName',  'lastName',  'b-lastName-error',  'Last name is required.'],
      ['b-phone',     'phone',     'b-phone-error',     'Phone number is required.'],
      ['b-email',     'email',     'b-email-error',     'Email address is required.'],
      ['b-address',   null,        'b-address-error',   'Appointment address is required.'],
      ['b-date',      null,        'b-date-error',      'Preferred date is required.'],
    ];

    for (const [bid, sid, errId, errMsg] of required) {
      const el = document.getElementById(bid) || (sid ? document.getElementById(sid) : null);
      if (!el?.value?.trim()) {
        if (el) el.classList.add('field-error');
        const errEl = document.getElementById(errId);
        if (errEl) { errEl.textContent = errMsg; errEl.style.display = 'block'; }
        missing.push({ serviceName: 'Booking details', label: errMsg });
      }
    }

    if (!state.slot) {
      missing.push({ serviceName: 'Booking details', label: 'Preferred time slot' });
      document.querySelectorAll('.time-slot').forEach((t) => t.classList.add('field-error'));
      const slotErr = document.getElementById('b-slot-error');
      if (slotErr) { slotErr.textContent = 'Please select a preferred time slot.'; slotErr.style.display = 'block'; }
    }

    const access = document.getElementById('access-provider')?.value;
    if (access && access !== 'me') {
      const arr = document.getElementById('access-arrangements')?.value?.trim();
      if (!arr) {
        const arrEl = document.getElementById('access-arrangements');
        if (arrEl) arrEl.classList.add('field-error');
        const arrErrEl = document.getElementById('access-arrangements-error');
        if (arrErrEl) { arrErrEl.textContent = 'Please describe the access arrangements.'; arrErrEl.style.display = 'block'; }
        missing.push({ serviceName: 'Booking details', label: 'Access arrangements' });
      }
    }

    const serviceMissing = getMissingRequiredServiceFields();
    const allMissing = [...missing, ...serviceMissing];

    if (allMissing.length) {
      const firstField = document.querySelector('.field-error');
      if (firstField) firstField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof showToast === 'function') {
        showToast('Please complete all required fields before booking.');
      }
      return false;
    }
    return true;
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
        if (typeof showToast === 'function') showToast('Please enter your postcode in Step 1 before selecting services.');
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
          if (typeof showToast === 'function') showToast('This postcode is outside our London &amp; M25 price area. Prices will show as TBC until our team confirms.', 'warning');
        }
        updateSubmitCta(lastQuote);
        updateQuoteRegionLabel(lastQuote);
        renderSubQuestions();
      } catch (err) {
        if (typeof showToast === 'function') showToast(err.message || 'Could not load services and prices for your postcode.');
        return;
      } finally {
        setButtonLoading(continueBtn, false);
      }
    }

    if (n === 3) {
      if (state.services.size === 0 && state.activeBundles.size === 0) {
        if (typeof showToast === 'function') showToast('Please select at least one service to continue.');
        return;
      }
      if (!validateSelectedServices()) return;
    }
    if (n === 4) {
      if (!validateBookingForm()) return;
      const reviewBtn = document.querySelector('#step3 .btn-primary');
      setButtonLoading(reviewBtn, true, 'Updating quote…');
      try {
        await refreshQuote();
      } catch (err) {
        if (typeof showToast === 'function') showToast(err.message || 'Could not load quote. Check your postcode and service answers.');
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

    if (typeof updateStepProgress === 'function') updateStepProgress(n);
    currentStep = n;
    window.currentStep = n;

    if (n === 3) {
      syncBookingFields();
      applyZoneDefaultsForDetails();
    }

    if ((n === 2 || n === 3) && (state.services.size > 0 || state.activeBundles.size > 0)) {
      try {
        await refreshQuote();
      } catch (err) {
        console.error(err);
      }
    }

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
      if (typeof showToast === 'function') showToast(err.message || 'Could not submit booking. Please try again.');
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
      removeStoredQuestions(serviceCode);

      for (const bundleId of [...state.activeBundles]) {
        const bdef = window.BUNDLES[bundleId];
        if (bdef?.services.includes(serviceCode)) {
          deactivateBundle(bundleId);
        }
      }

      renderSubQuestions();
      resetQuoteIfEmpty();
      calcAll();
      if (typeof updateStep2NextState === 'function') updateStep2NextState();
      return;
    }

    if (serviceHasQuestions(serviceCode)) {
      openServiceModal('service', { serviceCode });
      return;
    }

    state.services.add(serviceCode);
    if (row) row.classList.add('selected');

    renderSubQuestions();
    resetQuoteIfEmpty();
    calcAll();
    if (typeof updateStep2NextState === 'function') updateStep2NextState();
  };

  window.toggleBundle = function toggleBundleApi(bundleId, svcIds) {
    const bundleRow = document.getElementById('svc-' + bundleId);
    const isOn = state.activeBundles.has(bundleId);

    if (isOn) {
      deactivateBundle(bundleId);
      renderSubQuestions();
      resetQuoteIfEmpty();
      calcAll();
      if (typeof updateStep2NextState === 'function') updateStep2NextState();
      return;
    }

    if (bundleHasQuestions(svcIds)) {
      openServiceModal('bundle', { bundleId, svcIds });
      return;
    }

    finalizeBundleSelection(bundleId, svcIds);
    renderSubQuestions();
    resetQuoteIfEmpty();
    calcAll();
    if (typeof updateStep2NextState === 'function') updateStep2NextState();
  };

  const originalSelectZone = window.selectZone;
  window.selectZone = function selectZoneApi(val) {
    if (originalSelectZone) originalSelectZone(val);
    else {
      state.congestion = val;
      document.getElementById('congestion-yes')?.classList.toggle('selected', val);
      document.getElementById('congestion-no')?.classList.toggle('selected', !val);
    }
    if (shouldIncludeSurcharges()) calcAll();
  };

  const originalSelectParking = window.selectParking;
  window.selectParking = function selectParkingApi(val) {
    if (originalSelectParking) originalSelectParking(val);
    else {
      state.parking = val;
      document.getElementById('parking-yes')?.classList.toggle('selected', val);
      document.getElementById('parking-no')?.classList.toggle('selected', !val);
    }
    if (shouldIncludeSurcharges()) calcAll();
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
