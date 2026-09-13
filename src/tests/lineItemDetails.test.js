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

  it('does not attach GSC answers to CO Alarm addon lines', () => {
    const gscQuestions = [
      {
        fieldKey: 'applianceCount',
        label: 'Number of appliances',
        sortOrder: 1,
        options: [{ value: '4', label: '4' }],
      },
      {
        fieldKey: 'coAlarmPresent',
        label: 'CO Alarm present at property?',
        sortOrder: 2,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        fieldKey: 'coAlarmInstall',
        label: 'Add CO Alarm installation? (+£35)',
        sortOrder: 3,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
    ];

    const context = {
      servicesByCode: {
        gsc: { id: 'svc-gsc', code: 'gsc', name: 'Gas Safety Certificate (CP12)' },
      },
      questionsByServiceId: {
        'svc-gsc': gscQuestions,
      },
    };

    const lines = attachServiceDetailsToLines(
      [
        {
          name: 'Gas Safety Certificate (CP12)',
          sub: 'Meter & 4 appliance(s)',
          serviceCode: 'gsc',
          serviceName: 'Gas Safety Certificate (CP12)',
          total: 89.99,
          unitPrice: 89.99,
          isTbc: false,
          pricingFieldKeys: ['applianceCount'],
        },
        {
          name: 'CO Alarm Installation',
          sub: '',
          serviceCode: 'gsc',
          serviceName: 'Gas Safety Certificate (CP12)',
          total: 35,
          unitPrice: 35,
          isTbc: false,
          isAddon: true,
        },
      ],
      context,
      [
        {
          code: 'gsc',
          answers: {
            applianceCount: '4',
            coAlarmPresent: 'no',
            coAlarmInstall: 'yes',
          },
        },
      ]
    );

    assert.equal(
      formatServiceDetailsText(lines[0].serviceDetails),
      'CO Alarm present at property?: No'
    );
    assert.equal(lines[1].serviceDetails, null);
  });

  it('shows only component-specific details for EICR multi-line quotes', () => {
    const eicrQuestions = [
      {
        fieldKey: 'bedrooms',
        label: 'Number of bedrooms',
        sortOrder: 1,
        options: [{ value: '4', label: '4 bedrooms' }],
      },
      {
        fieldKey: 'fuseBoards',
        label: 'Number of fuse boards',
        sortOrder: 2,
        options: [{ value: '3', label: '3 fuse boards' }],
      },
    ];

    const context = {
      servicesByCode: {
        eicr: { id: 'svc-eicr', code: 'eicr', name: 'Electrical Installation Condition Report (EICR)' },
      },
      questionsByServiceId: {
        'svc-eicr': eicrQuestions,
      },
    };

    const lines = attachServiceDetailsToLines(
      [
        {
          name: 'Electrical Installation Condition Report (EICR)',
          sub: '4 bedrooms',
          serviceCode: 'eicr',
          total: 139.99,
          componentFieldKey: 'bedrooms',
        },
        {
          name: 'Electrical Installation Condition Report (EICR)',
          sub: '3 fuse boards',
          serviceCode: 'eicr',
          total: 120,
          componentFieldKey: 'fuseBoards',
        },
      ],
      context,
      [{ code: 'eicr', answers: { bedrooms: '4', fuseBoards: '3' } }]
    );

    assert.equal(lines[0].serviceDetails, null);
    assert.equal(lines[1].serviceDetails, null);
  });

  it('does not duplicate PAT appliance count in service details', () => {
    const patQuestions = [
      {
        fieldKey: 'applianceCount',
        label: 'Number of appliances to test',
        sortOrder: 1,
        options: [],
      },
    ];

    const context = {
      servicesByCode: {
        pat: { id: 'svc-pat', code: 'pat', name: 'Portable Appliance Test (PAT)' },
      },
      questionsByServiceId: {
        'svc-pat': patQuestions,
      },
    };

    const lines = attachServiceDetailsToLines(
      [
        {
          name: 'Portable Appliance Test (PAT)',
          sub: '7 appliance(s)',
          serviceCode: 'pat',
          total: 59.99,
          pricingFieldKeys: ['applianceCount'],
        },
      ],
      context,
      [{ code: 'pat', answers: { applianceCount: '7' } }]
    );

    assert.equal(lines[0].serviceDetails.selections.length, 0);
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
