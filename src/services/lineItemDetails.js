const findOptionDisplay = (question, value) => {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) {
    return value.map((v) => findOptionDisplay(question, v)).filter(Boolean).join(', ');
  }
  if (!question?.options?.length) return String(value);
  const option = question.options.find((o) => String(o.value) === String(value));
  return option?.label ?? String(value);
};

const buildServiceSelections = (answers = {}, questions = []) => {
  const byKey = Object.fromEntries(questions.map((q) => [q.fieldKey, q]));

  return Object.entries(answers)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([fieldKey, value]) => {
      const question = byKey[fieldKey];
      const displayValue = findOptionDisplay(question, value);
      return {
        fieldKey,
        label: question?.label || fieldKey,
        value: Array.isArray(value) ? value.map(String) : String(value),
        displayValue,
      };
    })
    .sort((a, b) => {
      const orderA = byKey[a.fieldKey]?.sortOrder ?? 999;
      const orderB = byKey[b.fieldKey]?.sortOrder ?? 999;
      return orderA - orderB;
    });
};

const ADDON_EXCLUDED_ANSWER_FIELDS = {
  'CO Alarm Installation': ['coAlarmInstall'],
};

const collectPricingFieldKeys = (line) => {
  const keys = new Set();
  if (line.componentFieldKey) keys.add(line.componentFieldKey);
  if (line.pricingFieldKey) keys.add(line.pricingFieldKey);
  for (const fieldKey of line.pricingFieldKeys || []) {
    keys.add(fieldKey);
  }
  return keys;
};

const getExcludedFieldKeysForLine = (line, allLines = [], questions = []) => {
  const excluded = new Set();

  for (const addonLine of allLines.filter((entry) => entry.isAddon)) {
    const fields = ADDON_EXCLUDED_ANSWER_FIELDS[addonLine.name];
    if (fields) fields.forEach((fieldKey) => excluded.add(fieldKey));
  }

  if (line.isAddon) {
    questions.forEach((question) => excluded.add(question.fieldKey));
    return [...excluded];
  }

  for (const fieldKey of collectPricingFieldKeys(line)) {
    excluded.add(fieldKey);
  }

  // Component lines (e.g. EICR bedrooms + fuse boards) only show line.sub for that component.
  if (line.componentFieldKey) {
    questions.forEach((question) => excluded.add(question.fieldKey));
  }

  return [...excluded];
};

const buildServiceDetails = ({ service, selection, questions = [], line, excludedFieldKeys = [] }) => {
  const selections = buildServiceSelections(selection?.answers || {}, questions).filter(
    (entry) => !excludedFieldKeys.includes(entry.fieldKey)
  );
  const summary = selections.map((s) => s.displayValue).filter(Boolean).join(' · ');

  return {
    serviceCode: service.code,
    serviceName: service.name,
    summary: summary || line.sub || null,
    selections,
    pricing: {
      description: line.name,
      subDescription: line.sub || null,
      quantity: line.quantity || 1,
      unitPrice: line.unitPrice ?? null,
      total: line.total ?? null,
      isTbc: !!line.isTbc,
    },
  };
};

const attachServiceDetailsToLines = (lines, context, selections = []) => {
  const selectionByCode = Object.fromEntries(selections.map((s) => [s.code, s]));

  return lines.map((line) => {
    if (!line.serviceCode || line.isDiscount || line.isAddon || line.componentFieldKey) {
      return { ...line, serviceDetails: null };
    }

    const service = context?.servicesByCode?.[line.serviceCode];
    const selection = selectionByCode[line.serviceCode];
    if (!service || !selection) {
      return { ...line, serviceDetails: null };
    }

    const questions = context?.questionsByServiceId?.[service.id] || [];
    const excludedFieldKeys = getExcludedFieldKeysForLine(line, lines, questions);
    return {
      ...line,
      serviceDetails: buildServiceDetails({
        service,
        selection,
        questions,
        line,
        excludedFieldKeys,
      }),
    };
  });
};

const formatServiceDetailsText = (serviceDetails) => {
  if (!serviceDetails?.selections?.length) {
    return serviceDetails?.summary || '';
  }
  return serviceDetails.selections.map((s) => `${s.label}: ${s.displayValue}`).join(' · ');
};

module.exports = {
  findOptionDisplay,
  buildServiceSelections,
  buildServiceDetails,
  getExcludedFieldKeysForLine,
  attachServiceDetailsToLines,
  formatServiceDetailsText,
};
