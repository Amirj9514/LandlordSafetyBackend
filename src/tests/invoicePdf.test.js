const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateInvoicePdf } = require('../services/invoicePdf.service');

describe('invoicePdf.service', () => {
  it('renders a valid PDF buffer for invoice downloads', async () => {
    const buffer = await generateInvoicePdf({
      reference: 'IV-TEST01',
      bookingReference: 'BK-TEST01',
      bookingStatus: 'confirmed',
      generatedAt: new Date('2026-05-25T10:00:00.000Z'),
      customerName: 'Amir Javed',
      email: 'test@example.com',
      phone: '03068032806',
      postcode: 'LONDON',
      appointmentAddress: '5460 Testing Street\nLondon, UK',
      preferredDate: '2026-05-28',
      preferredTimeSlot: 'morning',
      paymentStatus: 'paid',
      subtotal: 800,
      vat: 0,
      total: 800,
      lineItems: [
        {
          description: 'Gas Safety Certificate (CP12)',
          subDescription: 'Meter & 2 appliances',
          quantity: 1,
          unitPrice: 100,
          total: 100,
        },
        {
          description: 'Parking Charge',
          subDescription: 'No parking available at property',
          quantity: 1,
          unitPrice: 430,
          total: 430,
        },
      ],
    });

    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 1000);
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF');
  });
});
