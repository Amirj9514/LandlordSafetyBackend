require('dotenv').config();
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildServiceDetails,
  buildServiceSelections,
  attachServiceDetailsToLines,
  formatServiceDetailsText,
} = require('../services/lineItemDetails');

describe('lineItemDetails', () => {
  const fscQuestions = [
    {
      fieldKey: 'propertySubtype',
      label: 'Property type',
      sortOrder: 1,
      options: [
        { value: 'standard', label: 'Flat / House / Small HMO (Grade D/LD2)' },
        { value: 'premium', label: 'Large HMO / Commercial (Grade A/LD1)' },
      ],
    },
    {
      fieldKey: 'alarmCount',
      label: 'Number of alarms',
      sortOrder: 2,
      options: [],
    },
  ];

  it('builds human-readable selections from answers', () => {
    const selections = buildServiceSelections(
      { propertySubtype: 'standard', alarmCount: '5' },
      fscQuestions
    );

    assert.equal(selections.length, 2);
    assert.equal(selections[0].displayValue, 'Flat / House / Small HMO (Grade D/LD2)');
    assert.equal(selections[1].displayValue, '5');
  });

  it('builds service details with pricing snapshot', () => {
    const service = { code: 'fsc', name: 'Fire Alarm Certificate (FSC)' };
    const selection = { code: 'fsc', answers: { propertySubtype: 'standard', alarmCount: '5' } };
    const line = {
      name: 'Fire Alarm Certificate (FSC)',
      sub: '5 alarm(s)',
      quantity: 1,
      unitPrice: 119.99,
      total: 119.99,
      isTbc: false,
    };

    const details = buildServiceDetails({
      service,
      selection,
      questions: fscQuestions,
      line,
    });

    assert.equal(details.serviceCode, 'fsc');
    assert.equal(details.summary, 'Flat / House / Small HMO (Grade D/LD2) · 5');
    assert.equal(details.pricing.total, 119.99);
    assert.equal(details.selections.length, 2);
  });

  it('attaches service details to service lines only', () => {
    const context = {
      servicesByCode: {
        fsc: { id: 'svc-fsc', code: 'fsc', name: 'Fire Alarm Certificate (FSC)' },
      },
      questionsByServiceId: {
        'svc-fsc': fscQuestions,
      },
    };

    const lines = attachServiceDetailsToLines(
      [
        {
          name: 'Fire Alarm Certificate (FSC)',
          sub: '5 alarm(s)',
          serviceCode: 'fsc',
          serviceName: 'Fire Alarm Certificate (FSC)',
          total: 119.99,
          unitPrice: 119.99,
          isTbc: false,
        },
        {
          name: 'Congestion Charge',
          sub: 'London Congestion Zone',
          total: 18,
          unitPrice: 18,
          isTbc: false,
        },
      ],
      context,
      [{ code: 'fsc', answers: { propertySubtype: 'standard', alarmCount: '5' } }]
    );

    assert.ok(lines[0].serviceDetails);
    assert.equal(lines[0].serviceDetails.serviceCode, 'fsc');
    assert.equal(lines[1].serviceDetails, null);
  });

  it('formats service details as readable text', () => {
    const text = formatServiceDetailsText({
      selections: [
        { label: 'Property type', displayValue: 'Flat / House / Small HMO (Grade D/LD2)' },
        { label: 'Number of alarms', displayValue: '5' },
      ],
    });

    assert.equal(
      text,
      'Property type: Flat / House / Small HMO (Grade D/LD2) · Number of alarms: 5'
    );
  });
});
