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

const buildServiceDetails = ({ service, selection, questions = [], line }) => {
  const selections = buildServiceSelections(selection?.answers || {}, questions);
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
    if (!line.serviceCode || line.isDiscount) {
      return { ...line, serviceDetails: null };
    }

    const service = context?.servicesByCode?.[line.serviceCode];
    const selection = selectionByCode[line.serviceCode];
    if (!service || !selection) {
      return { ...line, serviceDetails: null };
    }

    const questions = context?.questionsByServiceId?.[service.id] || [];
    return {
      ...line,
      serviceDetails: buildServiceDetails({ service, selection, questions, line }),
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
  attachServiceDetailsToLines,
  formatServiceDetailsText,
};
